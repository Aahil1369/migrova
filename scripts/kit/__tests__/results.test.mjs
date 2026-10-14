// The kit's result components (PassportCard, VerifiedLinkCard, ChecklistPage, ResultArrival,
// MrzDecode): the colours kit.css gives their text, read from the CSS itself and checked on every
// surface they can sit on, and the accessibility contract their markup must keep.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

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

// ── Reduced motion: a stamp's ink bleed (a scale animation) never plays ────────────────────────────

// [ids, classes / attributes / pseudo-classes, elements / pseudo-elements] of one selector.
function specificity(selector) {
  const sum = [0, 0, 0];
  const add = (s) => s.forEach((n, i) => { sum[i] += n; });
  let rest = selector.replace(/:(is|not|has|where)\(((?:[^()]|\([^()]*\))*)\)/g, (_, fn, args) => {
    if (fn !== 'where') add(args.split(',').map((a) => specificity(a.trim())).sort(compareSpecificity).pop());
    return ' ';
  });
  const count = (re, i) => { rest = rest.replace(re, () => { sum[i]++; return ' '; }); };
  count(/\[[^\]]*\]/g, 1);
  count(/::[\w-]+/g, 2);
  count(/#[\w-]+/g, 0);
  count(/\.[\w-]+/g, 1);
  count(/:[\w-]+/g, 1);
  count(/(?:^|(?<=[\s>+~]))[a-z][\w-]*/gi, 2);
  return sum;
}
const compareSpecificity = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// Every stylesheet under app/ (the kit, the tool pages, the homepage passport), comments stripped.
function appStylesheets(dir = new URL('app/', ROOT)) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const url = new URL(entry.name + (entry.isDirectory() ? '/' : ''), dir);
    if (entry.isDirectory()) return appStylesheets(url);
    return entry.name.endsWith('.css') ? [{ name: url.pathname.split('/app/').pop(), css: readFileSync(url, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '') }] : [];
  });
}

// The css split into the bodies of its `@media (prefers-reduced-motion: reduce)` blocks and the rest
// (other @media blocks keep their rules), each as innermost rules { selectors, body, at }.
function splitReduce(css) {
  const reduce = [];
  let rest = '';
  let i = 0;
  for (let at = css.indexOf('@media', i); at !== -1; at = css.indexOf('@media', i)) {
    const open = css.indexOf('{', at);
    let depth = 0;
    let end = open;
    for (; end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}' && --depth === 0) break;
    }
    rest += css.slice(i, at);
    if (/prefers-reduced-motion:\s*reduce/.test(css.slice(at, open))) reduce.push({ body: css.slice(open + 1, end), at });
    else rest += css.slice(open + 1, end);
    i = end + 1;
  }
  const rules = (text, at = 0) =>
    [...text.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(';').pop().split(',').map((s) => s.trim()), body: m[2], at }));
  return { reduce: reduce.flatMap((block) => rules(block.body, block.at)), rest: rules(rest + css.slice(i)) };
}

test('reduced motion: the kit\'s rule stops every stamp\'s ink bleed, whatever starts it (spec §3)', () => {
  const sheets = appStylesheets();
  const kit = sheets.find((s) => s.name === 'components/kit/kit.css');
  assert.ok(kit, 'kit.css found');
  const isBleedBefore = (sel) => /\.jb-stamp\b[^\s>+~]*::before$/.test(sel);
  const reduceIndex = kit.css.lastIndexOf('prefers-reduced-motion: reduce');

  // The kit's reduce rules that switch the bleed off, and how strongly they do.
  const stops = splitReduce(kit.css).reduce.filter((r) => /(?:^|;)\s*animation\s*:\s*none\s*(?:;|$)/.test(r.body));
  const stopSelectors = stops.flatMap((r) => r.selectors).filter(isBleedBefore);
  assert.ok(stopSelectors.length > 0, 'kit.css switches the stamp bleed off under reduced motion');
  const strongest = stopSelectors.map(specificity).sort(compareSpecificity).pop();

  // Every rule anywhere that starts a bleed (an animation that is not `none`) must lose to it.
  // Page stylesheets load after kit.css, so they must be strictly weaker; a kit rule may tie if
  // it comes before the reduce block.
  let starters = 0;
  for (const { name, css } of sheets) {
    for (const { selectors, body } of splitReduce(css).rest) {
      const starts = /(?:^|;)\s*animation(?:-name)?\s*:\s*([^;]+)/.exec(body);
      if (!starts || /^none\b/.test(starts[1].trim())) continue;
      for (const sel of selectors.filter(isBleedBefore)) {
        starters++;
        const order = compareSpecificity(strongest, specificity(sel));
        const tieWins = name === kit.name && kit.css.indexOf(sel) < reduceIndex;
        assert.ok(order > 0 || (order === 0 && tieWins), `${name} ${sel} (${specificity(sel)}) out-ranks the reduce rule (${strongest})`);
      }
    }
  }
  assert.ok(starters >= 1, 'the applied stamp\'s bleed was found');
  // The applied stamp's own rule, named: it is (0,2,1), so a plain `.jb-stamp::before` (0,1,1) is not enough.
  assert.deepEqual(specificity(".jb-stamp[data-applied='true']::before"), [0, 2, 1]);
  assert.deepEqual(specificity(':is(.jb-stack, .jb-fade) .jb-stamp::before'), [0, 2, 1]);
  assert.ok(stopSelectors.includes('.jb-stamp[data-applied]::before'), stopSelectors.join(', '));
});

test('PACKED lands and is announced only for a completion made here; a restored complete list rests', () => {
  const list = read('app/components/kit/ChecklistPage.js');
  // Only a tick here marks the list as packed now; nothing on load or from storage does.
  assert.deepEqual(list.match(/setPackedKey\(/g), ['setPackedKey('], 'one place sets it');
  assert.match(list, /const toggle = \(index\) => \{\s*const next = [^\n]*\n\s*setPackedKey\(checklistProgress\(items\.length, next\)\.complete \? storageKey : null\);/);
  assert.match(list, /const stamp = packedStamp\(complete, packedKey, storageKey\);/);
  // 'land': the stamp that thunks down; 'rest': the same stamp, still from the start.
  assert.match(list, /\{stamp === 'land' \? <LandingStamp \/> : null\}/);
  assert.match(list, /\{stamp === 'rest' \? <Stamp shape="rect" color=\{STAMP_INKS\.green\} lines=\{PACKED_LINES\} still rotate=\{-6\} \/> : null\}/);
  assert.doesNotMatch(list, /\{complete \?/, 'nothing shows or speaks on `complete` alone');

  // A still stamp is applied from the start and its class switches the thunk and the bleed off.
  const stamp = read('app/components/kit/Stamp.js');
  assert.match(stamp, /\$\{still \? ' jb-stamp--still' : ''\}/);
  assert.match(stamp, /data-applied=\{applied \|\| still \? 'true' : 'false'\}/);
  const bleed = RULES.findIndex((r) => r.selectors.includes(".jb-stamp[data-applied='true']::before"));
  const off = RULES.findIndex((r) => r.selectors.includes('.jb-stamp--still[data-applied]::before') && /animation\s*:\s*none/.test(r.body));
  assert.ok(bleed >= 0 && off > bleed, 'the still rule comes after the landing bleed');
  assert.ok(compareSpecificity(specificity('.jb-stamp--still[data-applied]::before'), specificity(".jb-stamp[data-applied='true']::before")) >= 0);
  assert.ok(RULES.some((r) => r.selectors.includes('.jb-stamp--still') && /transition\s*:\s*none/.test(r.body)), 'no thunk');
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
  assert.match(list, /aria-live="polite">\s*\{stamp === 'land' \? 'All items packed' : ''\}/);
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
