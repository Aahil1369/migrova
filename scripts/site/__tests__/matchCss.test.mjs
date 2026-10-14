// /match's stylesheet (match.css) and markup contract: no CSS trig, only transform / opacity /
// stroke-dashoffset ever animate, every text colour readable (>= 4.5:1) on each surface it can sit
// on, 16px body text on phones, the waiting stamps clipped (no sideways scroll), reduced motion at
// the final state, and the page's accessibility / trust / quota rules (a real form with bound
// labels, chips that report their state, the result announced and focused, stamps as named buttons
// with the stamp itself hidden, a destination saved only on a tap, the AI asked only on submit /
// refresh, the not-legal-advice notice, no emoji).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const { contrastRatio, PAGE_PAPER, STAMP_INKS } = await import(new URL('app/components/kit/stampInks.js', ROOT));

const GROUND = '#efe7d6';
const PAGE_INK = '#1f2a24';

const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJs = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const CSS = stripCss(read('app/match/match.css'));
const KIT = stripCss(read('app/components/kit/kit.css'));
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
const KIT_RULES = rules(KIT);
// A declaration as the kit sets it: the first kit rule for `selector` that declares `prop`.
const kitDecl = (selector, prop) => {
  const rule = KIT_RULES.find((r) => r.selectors.includes(selector) && decl(r.body, prop));
  return rule ? decl(rule.body, prop) : null;
};
// The M-MATCH vignette as the kit paints it (the base .jb-vignette tint unless M-MATCH has its own):
// both ends of the tint and the middle. The cards' head is that vignette, so its text is tested here.
const vig = (prop) => kitDecl(".jb-vignette[data-type='M-MATCH']", prop) ?? kitDecl('.jb-vignette', prop);
const mix = (a, b) =>
  `#${[1, 3, 5].map((i) => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0')).join('')}`;
const VIG = [vig('--vg-a'), mix(vig('--vg-a'), vig('--vg-b')), vig('--vg-b')];

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
  const skip = ['.mt-go--primary', '.mt-stop-pin'];
  assert.match(VIG.join(' '), /^#[0-9a-f]{6} #[0-9a-f]{6} #[0-9a-f]{6}$/i, `the kit's M-MATCH tint, got ${VIG}`);
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
  // The kit's own vignette text on the M-MATCH tint: the title (the h3, page ink), the description
  // (the reason), the type label and its code in the tint's ink.
  const kitText = [PAGE_INK, kitDecl('.jb-vignette-desc', 'color'), kitDecl('.jb-vignette-type', 'color'), vig('--vg-ink')];
  assert.equal(kitDecl('.jb-vignette', 'color'), 'var(--page-ink)');
  for (const fg of kitText) {
    assert.match(fg, /^#[0-9a-f]{6}$/i, `a #rrggbb kit vignette colour, got ${fg}`);
    for (const bg of VIG) assert.ok(contrastRatio(fg, bg) >= 4.5, `kit vignette ${fg} on ${bg} is ${contrastRatio(fg, bg).toFixed(2)}:1`);
  }
  // The stamps' inks (MatchRoute) and the visa dot's are the stamp inks, readable on paper.
  assert.match(ROUTE, /const INKS = \[STAMP_INKS\.green, STAMP_INKS\.blue, STAMP_INKS\.purple, STAMP_INKS\.gold, STAMP_INKS\.terracotta\];/);
  for (const ink of Object.values(STAMP_INKS)) assert.ok(contrastRatio(ink, PAGE_PAPER) >= 4.5, ink);
});

test('body text is at least 16px on phones, and so is every form control', () => {
  const phone = rules(withoutMedia(CSS, /min-width/));
  const sizes = (selector) => phone.filter((r) => r.selectors.includes(selector)).map((r) => fontSize(r.body)).filter(Boolean);
  for (const selector of ['.mt-form-sub', '.mt-error', '.mt-hint', '.mt-picked', '.mt-vig-score', '.mt-stats dd', '.mt-path',
    '.mt-go', '.mt-set', '.mt-saved']) {
    const found = sizes(selector);
    assert.ok(found.length > 0, `${selector} sets a font size`);
    for (const size of found) assert.ok(parseFloat(size) >= 16, `${selector}: ${size}`);
  }
  // The reason is the kit vignette's description, which keeps the kit's 16px body floor; match.css
  // never sets a smaller size on it.
  assert.match(kitDecl('.jb-vignette-desc', 'font-size'), /^max\(var\(--jb-body-min, 16px\),/);
  assert.equal(kitDecl(':root', '--jb-body-min'), '16px');
  for (const r of rules(CSS).filter((r) => r.selectors.some((s) => s.includes('.jb-vignette-desc')))) {
    const size = fontSize(r.body);
    assert.ok(size === null || parseFloat(size) >= 16, `${r.selectors}: ${size}`);
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
});

test("a match card is the kit's paper with the kit's M-MATCH vignette on it; match.css copies none of their look", () => {
  // The card: the kit's paper (PassportCard), only its padding changed here.
  assert.match(CARD, /<PassportCard as="article" className="mt-card" aria-labelledby=\{id\}>/);
  const card = rules(CSS).filter((r) => r.selectors.some((s) => s === '.mt-card' || s === '.kit-card.mt-card'));
  assert.ok(card.length > 0 && card.some((r) => r.selectors.includes('.kit-card.mt-card') && decl(r.body, 'padding') === '0'),
    'padding 0, over the kit paper\'s own padding (.kit-card.mt-card) whatever order the stylesheets load in');
  for (const { body } of card) {
    for (const prop of ['background', 'border-radius', 'box-shadow', 'color', 'overflow-wrap']) {
      assert.equal(decl(body, prop), null, `.mt-card re-declares the kit paper's ${prop}`);
    }
  }
  // The head: the kit's vignette parts, with the country as its title (the h3) and the reason as its
  // description; the score sits beside the title.
  assert.match(CARD, /<div className="jb-vignette mt-vig" data-type="M-MATCH">/);
  for (const part of ['jb-vignette-card', 'jb-vignette-letter', 'jb-vignette-type', 'jb-vignette-holo']) {
    assert.match(CARD, new RegExp(`className="${part}"`), part);
  }
  assert.match(CARD, /<Guilloche variant="rosette" seed="M-MATCH" className="jb-vignette-rosette" \/>/);
  assert.match(CARD, /<h3 id=\{id\} className="jb-vignette-title">\{match\.country_name\}<\/h3>/);
  assert.match(CARD, /<p className="jb-vignette-desc">\{match\.top_reason\}<\/p>/);
  assert.doesNotMatch(CARD, /mt-vig-(rosette|letter|foil|type)/);
  // match.css repeats none of the vignette's look: no copies of its parts, no colour any kit
  // vignette rule sets (tints, inks, the label grey, the foil) in the card's rules, and the tint's
  // ends and the foil's colours nowhere in the file.
  assert.doesNotMatch(CSS, /\.mt-vig-(rosette|letter|foil|type)\b/);
  const kitRules = KIT_RULES.filter((r) => r.selectors.some((s) => s.startsWith('.jb-vignette')));
  const hexes = (body) => (body.match(/#[0-9a-f]{6}\b/gi) ?? []).map((c) => c.toLowerCase());
  const kitColours = new Set(kitRules.flatMap((r) => hexes(r.body)));
  assert.ok(kitColours.size >= 10, `found ${kitColours.size} kit vignette colours`);
  for (const { selectors, body } of rules(CSS).filter((r) => r.selectors.some((s) => /vig|mt-card/.test(s)))) {
    for (const c of hexes(body)) assert.ok(!kitColours.has(c), `${selectors} copies the kit vignette's ${c}`);
    assert.doesNotMatch(body, /--vg-/, `${selectors} sets the kit vignette's tint`);
  }
  const foil = hexes(kitRules.find((r) => r.selectors.includes('.jb-vignette-holo > span')).body);
  assert.ok(foil.length >= 5, 'the kit foil');
  for (const c of [...VIG.filter((_, i) => i !== 1), ...foil]) assert.ok(!CSS.toLowerCase().includes(c), `match.css repeats ${c}`);
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
  // Where each result came from, for the line under it (matchKeptText): only the AI's own answer is
  // "saved for 24 hours"; a reused or restored one is "your last matches".
  assert.match(PAGE, /if \(kept\) \{[^}]*setResult\(\{ id: latest\.next\(\), matches: kept, profile, fresh: true, source: 'device', kept: true \}\);/);
  assert.match(PAGE, /setResult\(\{ id: latest\.next\(\), matches: last\.matches, profile: last\.profile, fresh: false, source: 'device', kept: true \}\);/);
  assert.match(PAGE, /setResult\(\{ id: outcome\.id, matches: outcome\.matches, profile, fresh: true, source: 'ai', kept: keptNow \}\);/);
  assert.match(PAGE, /<p className="mt-saved">\{matchKeptText\(result\)\}<\/p>/);
  assert.match(PAGE, /<Wrap key=\{result\.id\} id=\{RESULTS_HEADING_ID\} label=\{matchReadyLabel\(result\.matches\.length\)\}>/, '"is ready" for one country');
  assert.doesNotMatch(PAGE, /are ready/);
});

test('shared components import no page stylesheet (the card\'s styles come with the /match page)', () => {
  const components = new URL('app/components/', ROOT);
  const files = readdirSync(components, { recursive: true }).filter((f) => /\.js$/.test(f));
  assert.ok(files.length > 20, `found ${files.length} component files`);
  let cssImports = 0;
  for (const file of files) {
    const url = new URL(file.replace(/\\/g, '/'), components);
    for (const m of stripJs(readFileSync(url, 'utf8')).matchAll(/import\s+['"]([^'"]+\.css)['"]/g)) {
      cssImports++;
      const target = new URL(m[1], url).href;
      assert.ok(target.startsWith(components.href), `${file} imports ${m[1]}, outside app/components/`);
    }
  }
  assert.ok(cssImports > 10, `found ${cssImports} component css imports`);
  assert.doesNotMatch(CARD, /\.css['"]/, 'CountryMatchCard imports no stylesheet');
  assert.match(PAGE, /import '\.\/match\.css';/, 'the /match page brings the card styles');
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
