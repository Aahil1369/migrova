// The kit's result components (PassportCard, VerifiedLinkCard, ChecklistPage, ResultArrival,
// MrzDecode): the colours kit.css gives their text, read from the CSS itself and checked on every
// surface they can sit on, and the accessibility contract their markup must keep.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const { contrastRatio, PAGE_PAPER } = await import(new URL('app/components/kit/stampInks.js', ROOT));

const GROUND = '#efe7d6'; // --ground: the unverified link card is transparent on it
const PAGE_INK = '#1f2a24'; // --page-ink

// Innermost rules of kit.css as { selectors: string[], body }.
const RULES = [...read('app/components/kit/kit.css').replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(
  (m) => ({ selectors: m[1].split(';').pop().split(',').map((s) => s.trim()), body: m[2] }),
);

// The value of `prop` in the last rule that lists `selector` and sets it.
function declared(selector, prop) {
  let value = null;
  for (const rule of RULES) {
    if (!rule.selectors.includes(selector)) continue;
    const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(rule.body);
    if (m) value = m[1].trim();
  }
  return value;
}

const hex = (value) => {
  if (value === 'var(--page-ink)') return PAGE_INK;
  assert.match(value ?? '', /^#[0-9a-f]{6}$/i, `expected a #rrggbb colour, got ${value}`);
  return value;
};

// Alpha-blend #rrggbb `fg` at `alpha` over `bg`.
function blend(fg, alpha, bg) {
  const ch = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [f, b] = [ch(fg), ch(bg)];
  return `#${f.map((c, i) => Math.round(c * alpha + b[i] * (1 - alpha)).toString(16).padStart(2, '0')).join('')}`;
}

// The visa tint's darkest points: its guilloche ring colour over each end of its gradient.
function visaTintSurfaces() {
  const bg = declared('.kit-card--visa', 'background');
  const ring = /rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/.exec(bg);
  const ends = /linear-gradient\([^,]+,\s*(#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\s*\)/i.exec(bg);
  assert.ok(ring && ends, `unexpected .kit-card--visa background: ${bg}`);
  const ringHex = `#${ring.slice(1, 4).map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`;
  const alpha = Number(ring[4]);
  assert.ok(alpha <= 0.1, 'the guilloche is a tint, not a pattern');
  return [ends[1], ends[2], blend(ringHex, alpha, ends[1]), blend(ringHex, alpha, ends[2])];
}

test('result text colours reach 4.5:1 on paper, on the ground and on the visa tint', () => {
  const surfaces = [PAGE_PAPER, GROUND, ...visaTintSurfaces()];
  const text = [
    '.kit-card',
    '.kit-vlink',
    '.kit-vlink-domain',
    '.kit-vlink-note',
    '.kit-vlink-date',
    '.kit-vlink-seal',
    '.kit-check-count',
    '.kit-mrzd',
    '.kit-mrzd-plain',
  ];
  for (const selector of text) {
    const colour = hex(declared(selector, 'color'));
    for (const surface of surfaces) {
      const ratio = contrastRatio(colour, surface);
      assert.ok(ratio >= 4.5, `${selector} ${colour} on ${surface}: ${ratio.toFixed(2)}:1`);
    }
  }
  // The decoded MRZ turns the same green as the plain lines.
  assert.equal(declared(".kit-mrzd[data-decoded='true']", 'color'), declared('.kit-mrzd-plain', 'color'));
});

test('checkboxes: the box edge and the tick stand out (3:1, non-text)', () => {
  const edge = /solid\s+(#[0-9a-f]{6})/i.exec(declared('.kit-check-box', 'border'))?.[1];
  assert.ok(edge, 'the box has a solid #rrggbb border');
  assert.ok(contrastRatio(edge, PAGE_PAPER) >= 3, `box edge ${edge}`);
  const fill = hex(declared('.kit-check-box:checked', 'background-color'));
  const tick = /stroke='%23([0-9a-f]{6})'/i.exec(declared('.kit-check-box:checked', 'background-image'))?.[1];
  assert.ok(tick, 'the tick is an SVG stroke');
  assert.ok(contrastRatio(`#${tick}`, fill) >= 3, `tick #${tick} on ${fill}`);
});

test('checkboxes stay readable in forced-colors mode (Windows High Contrast)', () => {
  // The custom box draws its tick as a pale background image, which forced colours keep while
  // forcing the background to Canvas: the system checkbox comes back there instead.
  assert.equal(declared('.kit-check-box', 'appearance'), 'auto', 'the last .kit-check-box appearance is the forced-colors one');
  const css = read('app/components/kit/kit.css').replace(/\/\*[\s\S]*?\*\//g, '');
  assert.match(css, /\.kit-check-box \{[^}]*-webkit-appearance: none;\s*appearance: none;/, 'the paper box everywhere else');
  assert.match(css, /@media \(forced-colors: active\) \{\s*\.kit-check-box \{ -webkit-appearance: auto; appearance: auto; \}\s*\}/);
});

test('the checklist count is an uppercase, tracked mono label (mockup A: "2 / 5 PACKED")', () => {
  assert.match(declared('.kit-check-count', 'font'), /var\(--jb-mono\)/);
  assert.equal(declared('.kit-check-count', 'text-transform'), 'uppercase');
  assert.ok(Number.parseFloat(declared('.kit-check-count', 'letter-spacing')) >= 0.12, declared('.kit-check-count', 'letter-spacing'));
});

test('text and controls in the result components are never below 16px where people read them', () => {
  for (const selector of ['.kit-vlink-domain', '.kit-vlink-note', '.kit-check-item label']) {
    const size = declared(selector, 'font-size') ?? /\b(\d+)px\//.exec(declared(selector, 'font') ?? '')?.[1];
    assert.ok(Number.parseFloat(size) >= 16, `${selector}: ${size}`);
  }
  assert.ok(Number.parseFloat(declared('.kit-check-item label', 'min-height')) >= 44, 'checklist rows are 44px tap targets');
});

test('a long unbroken AI string wraps inside the cards instead of widening the page', () => {
  // `anywhere` (unlike `break-word`) also lowers the min-content width, so a grid/flex column of
  // cards stays inside its 16px gutters on a 320px phone.
  for (const selector of ['.kit-card', '.kit-vlink']) assert.equal(declared(selector, 'overflow-wrap'), 'anywhere', selector);
});

test('the result components keep their accessibility contract', () => {
  const link = read('app/components/kit/VerifiedLinkCard.js');
  assert.match(link, /<a className="kit-vlink" href=\{href\} target="_blank" rel="noopener noreferrer">/);
  assert.match(link, /<span className="kit-vlink-seal" aria-hidden="true">/);
  assert.match(link, /\(verified official site, opens in a new tab\)/);
  // the unverified card is a <div>, never a link
  assert.match(link, /if \(!isLink\) \{\s*return <div className="kit-vlink kit-vlink--unverified">/);

  const list = read('app/components/kit/ChecklistPage.js');
  assert.match(list, /type="checkbox"/);
  assert.match(list, /<label htmlFor=\{id\}>/);
  assert.match(list, /className="kit-check-stamp" aria-hidden="true"/);
  assert.match(list, /aria-live="polite">\s*\{complete \? 'All items packed' : ''\}/);
  assert.match(list, /\{done\} \/ \{total\} packed/);
  assert.match(list, /from '\.\/deviceStorage'/);

  const arrival = read('app/components/kit/ResultArrival.js');
  assert.match(arrival, /<section className="kit-arrival" aria-labelledby=\{id\}>/);
  assert.match(arrival, /aria-live="polite"/);
  // focus first (without the nearest-edge focus scroll), then the heading scrolls to the top
  assert.match(arrival, /heading\.focus\(\{ preventScroll: true \}\);\s*heading\.scrollIntoView\(\{ block: 'start' \}\);/);
  // under the sticky navbar, and without gliding under reduced motion
  const css = read('app/components/kit/kit.css');
  assert.match(css, /\.kit-arrival \[tabindex='-1'\] \{ scroll-margin-top: \d+px; \}/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{[^@]*:root:has\(\.kit-shell, \.kit-arrival\) \{ scroll-behavior: auto; \}/);
  assert.match(arrival, /setAttribute\('tabindex', '-1'\)/);
});
