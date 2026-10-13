// /visa's stylesheet and markup contract: no CSS trig, no animated layout properties, every text
// colour readable (>= 4.5:1) on each surface it can sit on, 16px body text, the issued visa
// clipping its stamp while it is in the air, and the page's accessibility / trust rules (decorative
// stamp and MRZ hidden, the report announced and focused, a real form, no emoji icons).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const { contrastRatio, PAGE_PAPER, STAMP_INKS } = await import(new URL('app/components/kit/stampInks.js', ROOT));

const CSS = stripCss(read('app/visa/visa.css'));
// Innermost rules as { selectors, body } (rules inside @media come out with their own selectors).
const RULES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  selectors: m[1].split(';').pop().split(',').map((s) => s.trim()),
  body: m[2],
}));
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim() ?? null;

const GROUND = '#efe7d6';
const PAGE_INK = '#1f2a24';

// The visa card's darkest tint points (kit.css .kit-card--visa: a guilloche ring over a gradient).
function visaTint() {
  const kit = stripCss(read('app/components/kit/kit.css'));
  const body = /\.kit-card--visa\s*\{([^}]*)\}/.exec(kit)[1];
  const ring = /rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\s*\)/.exec(body);
  const ends = /linear-gradient\([^,]+,\s*(#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\s*\)/i.exec(body);
  const blend = (bg) => `#${[1, 2, 3].map((i) => {
    const b = parseInt(bg.slice(i * 2 - 1, i * 2 + 1), 16);
    return Math.round(Number(ring[i]) * Number(ring[4]) + b * (1 - Number(ring[4]))).toString(16).padStart(2, '0');
  }).join('')}`;
  return [ends[1], ends[2], blend(ends[1]), blend(ends[2])];
}

test('visa.css: no CSS trig, and nothing but transform / opacity is ever animated', () => {
  assert.ok(CSS.length > 2000, 'visa.css holds the page styles');
  assert.doesNotMatch(CSS, /atan2|\btan\(|\bsin\(|\bcos\(/);
  for (const { selectors, body } of RULES) {
    for (const m of body.matchAll(/(?:^|;)\s*transition(?:-property)?\s*:\s*([^;]+)/g)) {
      for (const part of m[1].split(/,(?![^(]*\))/)) {
        assert.ok(['transform', 'opacity', 'none'].includes(part.trim().split(/\s+/)[0]), `${selectors}: transition ${part}`);
      }
    }
    assert.doesNotMatch(body, /(?:^|;)\s*animation(?:-name)?\s*:/, `${selectors}: visa.css starts no animation of its own`);
  }
  assert.doesNotMatch(CSS, /@keyframes/);
});

test('every text colour in visa.css reaches 4.5:1 on the paper, the ground and the visa tint', () => {
  const surfaces = [PAGE_PAPER, GROUND, ...visaTint()];
  const colours = new Set();
  for (const { body } of RULES) {
    const value = decl(body, 'color');
    if (!value || value === 'transparent' || value === 'currentColor') continue;
    colours.add(value === 'var(--page-ink)' ? PAGE_INK : value);
  }
  assert.ok(colours.size >= 6, `found ${colours.size} text colours`);
  for (const fg of colours) {
    assert.match(fg, /^#[0-9a-f]{6}$/i, `a #rrggbb text colour, got ${fg}`);
    for (const bg of surfaces) {
      const ratio = contrastRatio(fg, bg);
      assert.ok(ratio >= 4.5, `${fg} on ${bg}: ${ratio.toFixed(2)}:1`);
    }
  }
  // The inks the page sets inline (CAUTION, importance tags, meter levels) are the stamp inks.
  for (const ink of Object.values(STAMP_INKS)) {
    for (const bg of surfaces) assert.ok(contrastRatio(ink, bg) >= 4.5, `${ink} on ${bg}`);
  }
});

test('the vignette tints keep the sticker text readable', () => {
  // Text on a .jb-vignette: the title (page ink), description (#3d4a43), type label (#4f5c55),
  // the DETAILS / HIDE toggle (#3d4a43) and the type code in the tint's own ink (--vg-ink).
  const tints = RULES.filter((r) => r.selectors.some((s) => s.startsWith(".jb-vignette[data-type='V-")));
  assert.equal(tints.length, 5, 'one tint per purpose');
  for (const { selectors, body } of tints) {
    for (const end of [decl(body, '--vg-a'), decl(body, '--vg-b')]) {
      for (const fg of [PAGE_INK, '#3d4a43', '#4f5c55', decl(body, '--vg-ink')]) {
        const ratio = contrastRatio(fg, end);
        assert.ok(ratio >= 4.5, `${selectors}: ${fg} on ${end} is ${ratio.toFixed(2)}:1`);
      }
    }
  }
});

test('body text is at least 16px on phones', () => {
  // .visa-tags > li: the AI's language-test names (set with the `font` shorthand).
  const body = ['.visa-text', '.visa-list > li', '.visa-card-entry', '.visa-card-summary', '.visa-error', '.visa-closing', '.visa-footnote', '.visa-overview', '.visa-tags > li'];
  const fontSize = (ruleBody) => decl(ruleBody, 'font-size') ?? /(?:^|\s)(\d+(?:\.\d+)?px)\//.exec(decl(ruleBody, 'font') ?? '')?.[1] ?? null;
  for (const selector of body) {
    const sizes = RULES.filter((r) => r.selectors.includes(selector)).map((r) => fontSize(r.body)).filter(Boolean);
    assert.ok(sizes.length > 0, `${selector} sets a font size`);
    for (const size of sizes) assert.ok(parseFloat(size) >= 16, `${selector}: ${size}`);
  }
});

test('the issued visa and the checklist clip a stamp that is still in the air (no sideways scroll)', () => {
  for (const selector of ['.visa-card', '.visa-page .kit-check']) {
    const rule = RULES.find((r) => r.selectors.includes(selector) && /overflow\s*:\s*clip/.test(r.body));
    assert.ok(rule, `${selector} { overflow: clip }`);
  }
});

test('page markup: decorative stamp and MRZ hidden, report announced and focused, real form, no emoji', () => {
  const page = read('app/visa/page.js');
  const visa = read('app/visa/IssuedVisa.js');
  assert.match(page, /<PassportCard as="form"[^>]*onSubmit=\{handleSubmit\}/);
  assert.match(page, /type="submit"/);
  // The submit runs visaSubmitStep (fields before the legal notice), and nothing else gates it.
  const submit = /const handleSubmit = \(event\) => \{([\s\S]*?)\n  \};/.exec(page)?.[1] ?? '';
  assert.match(submit, /const step = visaSubmitStep\(\{ loading, nationality, targetCountry, acked: hasLegalAck\(\) \}\);/);
  assert.match(submit, /if \(step === 'missing'\) setError\(MISSING_FIELDS\);/);
  assert.equal((submit.match(/hasLegalAck\(/g) || []).length, 1, 'the legal-ack is read once, as an input of visaSubmitStep');
  assert.match(page, /'Issue my visa report'/);
  // Busy, not disabled: native `disabled` would drop keyboard focus to <body> (and a failed search
  // never gives it back); visaSubmitStep answers 'busy' while a search runs, so nothing restarts it.
  assert.match(page, /<Btn variant="primary" as="button" type="submit" aria-disabled=\{loading\} className="visa-submit">/);
  assert.doesNotMatch(page, /\sdisabled=\{loading\}/);
  assert.match(submit, /else if \(step === 'search'\) handleSearch\(\);/, 'only a search step searches (not busy)');
  const busy = RULES.filter((r) => r.selectors.includes(".visa-submit[aria-disabled='true']"));
  assert.equal(busy.length, 1, 'the busy submit keeps its look');
  assert.match(busy[0].body, /opacity:\s*1;\s*cursor:\s*progress/);
  assert.ok(!RULES.some((r) => r.selectors.some((s) => s.startsWith('.visa-submit:disabled'))), 'no :disabled style left');
  assert.match(page, /<ResultArrival key=\{report\.id\} id=\{VISA_HEADING_ID\} label="Your visa report is ready">/);
  assert.match(page, /<Chip key=\{p\.value\} pressed=\{purpose === p\.value\}/);
  assert.match(page, /<DisclaimerBlock tone="paper" \/>/, 'the not-legal-advice notice on the result');
  assert.match(page, /How to strengthen your application/);
  assert.doesNotMatch(page, /Guarantee Approval/);

  assert.match(visa, /<span className="visa-card-stamp" aria-hidden="true">/);
  assert.match(visa, /<div ref=\{ref\} className="kit-mrzd" aria-hidden="true">/, 'the loading MRZ');
  assert.match(visa, /<h2 id=\{VISA_HEADING_ID\}/);
  assert.match(visa, /Preparing your report…/);

  for (const file of ['app/visa/page.js', 'app/visa/IssuedVisa.js', 'app/visa/visaReport.js', 'app/components/VisaProbabilityMeter.js', 'app/components/OfficialSourcesBlock.js']) {
    assert.doesNotMatch(read(file), /\p{Extended_Pictographic}/u, `${file} uses an emoji icon`);
  }
});
