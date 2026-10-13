// /match's stylesheet (match.css) and markup contract: no CSS trig, only transform / opacity /
// stroke-dashoffset ever animate, every text colour readable (>= 4.5:1) on each surface it can sit
// on, 16px body text on phones, the waiting stamps clipped (no sideways scroll), reduced motion at
// the final state, and the page's accessibility / trust / quota rules (a real form with bound
// labels, chips that report their state, the result announced and focused, stamps as named buttons
// with the stamp itself hidden, a destination saved only on a tap, the AI asked only on submit /
// refresh, the not-legal-advice notice, no emoji).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const { contrastRatio, PAGE_PAPER, STAMP_INKS } = await import(new URL('app/components/kit/stampInks.js', ROOT));

const GROUND = '#efe7d6';
const PAGE_INK = '#1f2a24';
const VIG = ['#e7f0d6', '#eeecd6', '#f5e8d6']; // the M-MATCH vignette tint: both ends and the middle

const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJs = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const CSS = stripCss(read('app/match/match.css'));
const PAGE = stripJs(read('app/match/page.js'));
const FORM = stripJs(read('app/match/MatchForm.js'));
const ROUTE = stripJs(read('app/match/MatchRoute.js'));
const CARD = stripJs(read('app/components/CountryMatchCard.js'));

// The css without its @media blocks whose query matches `drop` (e.g. /min-width/: the phone rules).
function withoutMedia(css, drop) {
  let out = '';
  let i = 0;
  for (let at = css.indexOf('@media', i); at !== -1; at = css.indexOf('@media', i)) {
    const open = css.indexOf('{', at);
    let depth = 0;
    let end = open;
    for (; end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}' && --depth === 0) break;
    }
    out += css.slice(i, at);
    if (!drop.test(css.slice(at, open))) out += css.slice(open + 1, end);
    i = end + 1;
  }
  return out + css.slice(i);
}
// The body of the first @media block whose query matches `query`.
function media(css, query) {
  const at = css.search(query);
  const open = css.indexOf('{', at);
  let depth = 0;
  let end = open;
  for (; end < css.length; end++) {
    if (css[end] === '{') depth++;
    else if (css[end] === '}' && --depth === 0) break;
  }
  return css.slice(open + 1, end);
}
// Innermost rules as { selectors, body } (rules inside @media come out with their own selectors).
const rules = (css) =>
  [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(';').pop().split(',').map((s) => s.trim()), body: m[2] }));
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim() ?? null;
const fontSize = (body) => decl(body, 'font-size') ?? /(?:^|\s)(\d+(?:\.\d+)?px)\//.exec(decl(body, 'font') ?? '')?.[1] ?? null;
const has = (selector, re, css = CSS) => rules(css).some((r) => r.selectors.includes(selector) && re.test(r.body));

test('match.css: no CSS trig; only transform / opacity / stroke-dashoffset transition or animate', () => {
  assert.ok(CSS.length > 3000, 'match.css holds the styles');
  assert.doesNotMatch(CSS, /atan2|\btan\(|\bsin\(|\bcos\(/);
  const allowed = ['transform', 'opacity', 'stroke-dashoffset', 'none'];
  for (const { selectors, body } of rules(CSS)) {
    for (const m of body.matchAll(/(?:^|;)\s*transition(?:-property)?\s*:\s*([^;]+)/g)) {
      for (const part of m[1].split(/,(?![^(]*\))/)) {
        assert.ok(allowed.includes(part.trim().split(/\s+/)[0]), `${selectors}: transition ${part}`);
      }
    }
  }
  // The only keyframes: the waiting route's marching dashes.
  const frames = [...CSS.matchAll(/@keyframes\s+([\w-]+)\s*\{((?:[^{}]*\{[^{}]*\})*)\s*\}/g)];
  assert.deepEqual(frames.map((f) => f[1]), ['mt-march']);
  for (const [, , body] of frames) {
    for (const [, props] of body.matchAll(/\{([^{}]*)\}/g)) {
      for (const d of props.split(';').map((s) => s.trim()).filter(Boolean)) assert.match(d, /^stroke-dashoffset\s*:/);
    }
  }
  assert.ok(has('.mt-route--pending[data-offscreen] .mt-route-line', /animation-play-state\s*:\s*paused/), 'the ambient loop pauses off screen');
});

test('the route draws (950ms) and the stamps land 180ms apart, once; reduced motion shows the end at once', () => {
  assert.ok(has('.mt-route-cover', /transition\s*:\s*stroke-dashoffset 950ms linear/));
  assert.ok(has('.mt-route[data-landed] .mt-route-cover', /stroke-dashoffset\s*:\s*calc\(-1 \* var\(--len\)\)/));
  assert.ok(has('.mt-stop .jb-stamp', /transition-delay\s*:\s*var\(--d, 0ms\)/), 'each stamp waits for its turn');
  assert.ok(has(".mt-stop .jb-stamp[data-applied='true']::before", /animation-delay\s*:\s*calc\(200ms \+ var\(--d, 0ms\)\)/), 'and so does its ink bleed');
  assert.match(ROUTE, /export const STAMP_GAP_MS = 180;/);
  assert.match(ROUTE, /'--d': `\$\{FIRST_MS \+ i \* STAMP_GAP_MS\}ms`/);
  assert.match(ROUTE, /applied=\{landed\}/);
  assert.match(ROUTE, /const inView = useInView\(ref\);/, 'once, when the route first comes on screen');
  const reduced = media(CSS, /@media \(prefers-reduced-motion: reduce\)/);
  assert.ok(has('.mt-route-cover', /display\s*:\s*none/, reduced), 'the route is drawn at once');
  assert.ok(has('.mt-route--pending .mt-route-line', /animation\s*:\s*none/, reduced), 'the dashes stay still');
  // The kit's own reduced-motion rule shows every stamp at its final state (kit.css).
  assert.match(stripCss(read('app/components/kit/kit.css')), /\.jb-stamp\[data-applied='false'\]\s*\{\s*opacity: 1;\s*transform: rotate\(var\(--r\)\);\s*transition: none;/);
});

test('every text colour reaches 4.5:1 on each surface it can sit on', () => {
  // Page paper on page ink (the primary link, the pin) is checked on its own below.
  const skip = ['.mt-go--primary', '.mt-stop-pin', '.mt-vig-letter'];
  const colours = new Set();
  for (const { selectors, body } of rules(CSS)) {
    if (selectors.some((s) => skip.includes(s))) continue;
    const value = decl(body, 'color');
    if (!value || value === 'transparent' || value === 'inherit') continue;
    colours.add(value === 'var(--page-ink)' ? PAGE_INK : value);
  }
  assert.ok(colours.size >= 6, `found ${colours.size} text colours`);
  for (const fg of colours) {
    assert.match(fg, /^#[0-9a-f]{6}$/i, `a #rrggbb text colour, got ${fg}`);
    for (const bg of [PAGE_PAPER, GROUND, ...VIG]) {
      const ratio = contrastRatio(fg, bg);
      assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  }
  assert.ok(has('.mt-go--primary', /color\s*:\s*var\(--page\)/) && contrastRatio(PAGE_PAPER, PAGE_INK) >= 4.5);
  // The stamps' inks (MatchRoute) and the visa dot's are the stamp inks, readable on paper.
  assert.match(ROUTE, /const INKS = \[STAMP_INKS\.green, STAMP_INKS\.blue, STAMP_INKS\.purple, STAMP_INKS\.gold, STAMP_INKS\.terracotta\];/);
  for (const ink of Object.values(STAMP_INKS)) assert.ok(contrastRatio(ink, PAGE_PAPER) >= 4.5, ink);
});

test('body text is at least 16px on phones, and so is every form control', () => {
  const phone = rules(withoutMedia(CSS, /min-width/));
  const sizes = (selector) => phone.filter((r) => r.selectors.includes(selector)).map((r) => fontSize(r.body)).filter(Boolean);
  for (const selector of ['.mt-form-sub', '.mt-error', '.mt-hint', '.mt-picked', '.mt-vig-score', '.mt-vig-reason', '.mt-stats dd', '.mt-path',
    '.mt-go', '.mt-set', '.mt-saved', '.mt-footnote']) {
    const found = sizes(selector);
    assert.ok(found.length > 0, `${selector} sets a font size`);
    for (const size of found) assert.ok(parseFloat(size) >= 16, `${selector}: ${size}`);
  }
  for (const m of FORM.matchAll(/<(input|select|textarea)\b([^<]*)/g)) {
    assert.match(m[2], new RegExp(`className="${m[1] === 'select' ? 'kit-select' : 'kit-input'}"`), `<${m[1]}> is a 16px kit control`);
  }
});

test('the live regions stay in the accessibility tree while empty (so they are heard when they fill)', () => {
  for (const selector of ['.mt-picked', '.mt-error', '.mt-picked:empty', '.mt-error:empty']) {
    assert.ok(!has(selector, /display\s*:\s*none|visibility\s*:\s*hidden/), `${selector} is never hidden`);
  }
  assert.match(PAGE, /<p className="mt-picked" role="status">/);
});

test('the waiting stamps (2.2x) are clipped, so the page never scrolls sideways', () => {
  assert.ok(has('.mt-routecard', /overflow\s*:\s*clip/), 'the route card clips the stamps in the air');
  assert.ok(has('.mt-form', /overflow\s*:\s*clip/));
  assert.ok(has('.mt-card', /overflow\s*:\s*hidden/));
});

test('page: a real form, the result announced and focused, the disclaimer, no emoji', () => {
  assert.match(FORM, /<PassportCard as="form" className="mt-form" onSubmit=\{onSubmit\}/);
  assert.match(FORM, /type="submit" aria-disabled=\{loading\}/, 'busy, but keeps keyboard focus');
  for (const id of ['match-nationality', 'match-current', 'match-experience', 'match-skills']) {
    assert.match(FORM, new RegExp(`htmlFor="${id}"`), `label for ${id}`);
    assert.match(FORM, new RegExp(`id="${id}"`), id);
  }
  assert.match(FORM, /<Chip key=\{place\} pressed=\{value\.preferredCountries\.includes\(place\)\}/, 'region chips report their state');
  assert.match(FORM, /role="alert"/);
  assert.match(FORM, /role="status"/);
  assert.match(PAGE, /const Wrap = result\?\.fresh \? ResultArrival : Restored;/);
  assert.match(PAGE, /<Wrap key=\{result\.id\} id=\{RESULTS_HEADING_ID\}/);
  assert.match(PAGE, /<h2 id=\{RESULTS_HEADING_ID\}/);
  assert.match(PAGE, /<DisclaimerBlock tone="paper" \/>/, 'the not-legal-advice notice on every result');
  for (const file of ['app/match/page.js', 'app/match/MatchForm.js', 'app/match/MatchRoute.js', 'app/components/CountryMatchCard.js', 'app/lib/match.js']) {
    assert.doesNotMatch(read(file), /\p{Extended_Pictographic}/u, `${file} uses an emoji icon`);
  }
});

test('the AI is asked only on submit or refresh, through the stale guard; the result is kept for 24 hours', () => {
  // Exactly two callers of run(): the form's submit and "Refresh matches". Nothing on load.
  assert.deepEqual(PAGE.match(/\brun\(/g), ['run(', 'run(']);
  assert.match(PAGE, /const handleSubmit = \(event\) => \{[\s\S]*?run\(requestProfile\(form, saved\.current\)\);[\s\S]*?\};/);
  assert.match(PAGE, /const refresh = \(\) => \{\s*if \(!busy && result\) run\(result\.profile, \{ refresh: true \}\);\s*\};/);
  const mount = /useEffect\(\(\) => \{([\s\S]*?)\}, \[latest\]\);/.exec(PAGE)?.[1] ?? '';
  assert.ok(mount.includes('readLastMatch('), 'on load: the kept result');
  assert.doesNotMatch(mount, /fetchMatches|run\(|country-match/, 'on load the AI is never asked');
  assert.match(PAGE, /const kept = refresh \? null : readMatchCache\(deviceStorage\(\), key, Date\.now\(\)\);/, 'a submit reuses a fresh kept result; a refresh does not');
  assert.match(PAGE, /const outcome = await fetchMatches\(latest, profile, \{ refresh \}\);\s*if \(!outcome\) return;/, 'a stale answer is dropped; a refresh asks the AI again');
  assert.match(PAGE, /writeMatchCache\(deviceStorage\(\), key, outcome\.matches, Date\.now\(\), profile\)/);
});

test('stamps are named buttons over a hidden stamp; a destination is saved only by a tap', () => {
  assert.match(ROUTE, /<button\s+type="button"\s+className="mt-stop-btn"\s+aria-label=\{`Set \$\{match\.country_name\} as my destination, match score \$\{scoreWords\(match\.match_score\)\}`\}/);
  assert.match(ROUTE, /<span className="mt-stop-face" aria-hidden="true">\s*<Stamp shape="circle" color=\{INKS\[i\]\} lines=\{stampFace\(match\)\}/);
  assert.match(ROUTE, /<svg className="mt-route-svg" viewBox=\{VIEW_BOX\} aria-hidden="true"/);
  // onPick only ever runs from a click, on the stamp and on the card's button.
  for (const src of [ROUTE, CARD]) {
    assert.deepEqual(src.match(/onPick\?\.\(/g), ['onPick?.('], 'one call');
    assert.match(src, /onClick=\{\(\) => onPick\?\.\(match\)\}/);
  }
  // The page saves in one place, the pick handler both of them call.
  assert.deepEqual(PAGE.match(/setDestination\(/g), ['setDestination(']);
  assert.match(PAGE, /const pick = \(match\) => \{\s*const ok = setDestination\(deviceStorage\(\), \{ from: result\?\.profile\.nationality, to: match\.country_code \}, announceRouteChange\);/);
  assert.match(PAGE, /<MatchRoute matches=\{result\.matches\} onPick=\{pick\} picked=\{picked\} \/>/);
  assert.match(PAGE, /onPick=\{pick\}\s*\/>/);
  // The card's links carry the route.
  assert.match(CARD, /const links = matchLinks\(\{ from, to: match\.country_code, name: match\.country_name \}\);/);
  assert.match(CARD, /<Link href=\{links\.visa\}/);
  assert.match(CARD, /<Link href=\{links\.relocate\}/);
});
