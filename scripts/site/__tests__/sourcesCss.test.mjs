// Official Sources (/sources, /sources/[code]) and the 404: the stylesheet and markup contract.
// No CSS trig; only transform / opacity move, and only with motion allowed (reduced motion shows
// the verdicts at once); the lamp stays inside its card; every text colour readable (>= 4.5:1) on
// the surface it sits on; 16px body text; the sources table stays on the server; the fake site is
// never a link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const { contrastRatio, PAGE_PAPER } = await import(new URL('app/components/kit/stampInks.js', ROOT));

const GROUND = '#efe7d6';
const PAGE_INK = '#1f2a24';
const TOKENS = { 'var(--page-ink)': PAGE_INK, 'var(--page)': PAGE_PAPER };

// Every rule as { selectors, body, at } where `at` lists the enclosing @-rule preludes.
function cssRules(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const out = [];
  const stack = [];
  let buf = '';
  for (const ch of text) {
    if (ch === '{') {
      stack.push(buf.trim());
      buf = '';
    } else if (ch === '}') {
      const prelude = stack.pop();
      if (!prelude.startsWith('@')) {
        out.push({ selectors: prelude.split(',').map((s) => s.trim()), body: buf.trim(), at: stack.filter((p) => p.startsWith('@')) });
      }
      buf = '';
    } else {
      buf += ch;
    }
  }
  return out;
}
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim() ?? null;
const colour = (value) => TOKENS[value] ?? value;

const CSS = read('app/sources/sources.css');
const RULES = cssRules(CSS);
const ruleFor = (selector, filter = () => true) => RULES.filter((r) => r.selectors.includes(selector) && filter(r));
const motionOk = (r) => r.at.some((a) => /prefers-reduced-motion:\s*no-preference/.test(a));
const inKeyframes = (r) => r.at.some((a) => a.startsWith('@keyframes'));

test('sources.css: no CSS trig, and only transform / opacity are ever animated', () => {
  assert.ok(CSS.length > 3000, 'sources.css holds the page styles');
  assert.doesNotMatch(CSS, /atan2|\btan\(|\bsin\(|\bcos\(/);
  for (const { selectors, body } of RULES) {
    for (const m of body.matchAll(/(?:^|;)\s*transition(?:-property)?\s*:\s*([^;]+)/g)) {
      for (const part of m[1].split(/,(?![^(]*\))/)) {
        assert.ok(['transform', 'opacity', 'none'].includes(part.trim().split(/\s+/)[0]), `${selectors}: transition ${part}`);
      }
    }
  }
  const frames = RULES.filter(inKeyframes);
  assert.ok(frames.length >= 6, 'the lamp and wipe keyframes');
  for (const { at, body } of frames) {
    for (const [, prop] of body.matchAll(/(?:^|;)\s*([\w-]+)\s*:/g)) {
      assert.ok(['transform', 'opacity'].includes(prop), `${at.join(' ')}: animates ${prop}`);
    }
  }
});

test('the lamp runs only with motion allowed; reduced motion shows the verdicts at once', () => {
  for (const r of RULES.filter((x) => !inKeyframes(x))) {
    const moving = decl(r.body, 'animation') || decl(r.body, 'animation-name') || /translateX/.test(decl(r.body, 'transform') ?? '');
    if (moving) assert.ok(motionOk(r), `${r.selectors}: moves outside @media (prefers-reduced-motion: no-preference)`);
  }
  // Outside that query (reduced motion, or the query unsupported): the band and its text sit in
  // place and the lamp is not drawn.
  for (const sel of ['.uv-band', '.uv-band-in']) {
    for (const r of ruleFor(sel, (x) => !motionOk(x))) assert.equal(decl(r.body, 'transform'), null, `${sel} is in place`);
  }
  assert.equal(decl(ruleFor('.uv-beam', (x) => !motionOk(x))[0].body, 'display'), 'none');
  // With motion: the dark start state, then a one-shot animation once the card is lit.
  assert.match(decl(ruleFor('.uv-band', motionOk)[0].body, 'transform'), /translateX\(-101%\)/);
  assert.match(decl(ruleFor('.uv-band-in', motionOk)[0].body, 'transform'), /translateX\(101%\)/);
  for (const sel of ['.uv-band', '.uv-band-in', '.uv-beam']) {
    const lit = ruleFor(`.uv-card[data-lit='true'] ${sel}`, motionOk)[0];
    assert.ok(lit, `${sel} animates when lit`);
    assert.match(decl(lit.body, 'animation'), /^uv-[\w-]+ \d+ms linear both$/, `${sel}: plays once and holds the end`);
    assert.doesNotMatch(lit.body, /infinite/);
  }
});

test('the lamp and the wipe stay inside the card (no sideways scroll, text never jiggles)', () => {
  for (const sel of ['.uv-card', '.uv-strip', '.uv-band']) {
    assert.ok(ruleFor(sel).some((r) => decl(r.body, 'overflow') === 'hidden'), `${sel} { overflow: hidden }`);
  }
  // The band and its text slide by +-101% of their own widths: equal widths only if the padding
  // sits on the text wrapper, not on the band.
  assert.ok(ruleFor('.uv-band').every((r) => decl(r.body, 'padding') === null), '.uv-band has no padding');
  assert.ok(ruleFor('.uv-band-in').some((r) => decl(r.body, 'padding')), '.uv-band-in holds the padding');
});

test('every text colour reaches 4.5:1 on the surface it sits on', () => {
  const band = decl(ruleFor('.uv-band')[0].body, 'background');
  assert.match(band, /^#[0-9a-f]{6}$/i, 'the UV band is a solid colour');
  let checked = 0;
  for (const { selectors, body } of RULES.filter((r) => !inKeyframes(r))) {
    const value = decl(body, 'color');
    if (!value) continue;
    const fg = colour(value);
    assert.match(fg, /^#[0-9a-f]{6}$/i, `${selectors}: a #rrggbb text colour, got ${value}`);
    const own = decl(body, 'background') ?? decl(body, 'background-color');
    const surfaces = own ? [colour(own)] : selectors.some((s) => s.includes('.uv-verdict')) ? [band] : [PAGE_PAPER, GROUND];
    for (const bg of surfaces) {
      const ratio = contrastRatio(fg, bg);
      assert.ok(ratio >= 4.5, `${selectors}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
      checked += 1;
    }
  }
  assert.ok(checked >= 20, `checked ${checked} pairs`);
  // The region tabs keep the kit chip's page-ink text on their own tint.
  const tab = decl(ruleFor('.src-tabs .kit-chip')[0].body, 'background');
  assert.ok(contrastRatio(PAGE_INK, tab) >= 4.5, `tab text on ${tab}`);
});

test('body text is at least 16px on phones', () => {
  const body = ['.src-text', '.src-empty', '.src-row-name', '.src-check-body', '.src-spot', '.src-more', '.uv-none', '.uv-title', '.uv-domain'];
  for (const selector of body) {
    const sizes = ruleFor(selector).map((r) => decl(r.body, 'font-size') ?? /(\d+)px\/[\d.]+ /.exec(decl(r.body, 'font') ?? '')?.[0]).filter(Boolean);
    assert.ok(sizes.length > 0, `${selector} sets a font size`);
    for (const size of sizes) assert.ok(parseFloat(size) >= 16, `${selector}: ${size}`);
  }
});

test('the directory skips off-screen rows, and the seal ring rests off screen', () => {
  const row = ruleFor('.src-rows > li')[0];
  assert.equal(decl(row.body, 'content-visibility'), 'auto');
  assert.match(decl(row.body, 'contain-intrinsic-size'), /^auto \d+px$/);
  assert.equal(decl(ruleFor('.src-seal[data-offscreen] .jb-seal-ring')[0].body, 'animation-play-state'), 'paused');
  assert.match(read('app/sources/SealCount.js'), /data-offscreen=\{onScreen \? undefined : ''\}/);
});

test('the sources table stays on the server: only the three small client parts are client components', () => {
  const dir = new URL('app/sources/', ROOT);
  const files = readdirSync(dir, { recursive: true }).filter((f) => /\.js$/.test(f)).map((f) => `app/sources/${f.replace(/\\/g, '/')}`);
  const client = files.filter((f) => /^\s*['"]use client['"]/.test(read(f))).sort();
  assert.deepEqual(client, ['app/sources/SealCount.js', 'app/sources/SourcesIndex.js', 'app/sources/UvCheck.js']);
  for (const file of client) {
    const imports = [...read(file).matchAll(/^import\s[^'"]*['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    assert.ok(imports.length > 0, `${file}: imports found`);
    for (const spec of imports) {
      assert.doesNotMatch(spec, /officialSources|sourcesPayload|uvPair|\/data\//, `${file} imports ${spec}`);
    }
  }
  assert.match(read('app/sources/[code]/page.js'), /<UvCheck real=\{pair\.real\} fake=\{pair\.fake\} name=\{country\.name\} \/>/);
  assert.match(read('app/sources/[code]/page.js'), /if \(!country \|\| !entry \|\| !pair\) notFound\(\);/);
});

test('UV check markup: the real site is the only link; the fake example is plain text with its badge', () => {
  const uv = read('app/sources/UvCheck.js');
  assert.match(uv, /<a \{\.\.\.props\} href=\{href\} target="_blank" rel="noopener noreferrer">/);
  assert.match(uv, /if \(!href\) return <div \{\.\.\.props\}>\{body\}<\/div>;/);
  const fake = /<UvCard\s+kind="fake"[\s\S]*?\n\s*\/>/.exec(uv)?.[0];
  assert.ok(fake, 'the fake card');
  assert.doesNotMatch(fake, /href/, 'the fake card gets no href');
  assert.match(fake, /domain=\{fake\.domain\}/, 'its address comes from fakeDomain() via uvPair');
  assert.match(fake, /<span className="uv-mark uv-mark--fake">FAKE EXAMPLE<\/span>/, 'the badge is real text');
  // The ✓ / ✗ marks are drawn (kit Glyphs, aria-hidden), not typed: a symbol character would make
  // the first layout load a large system symbol font (slower first paint, see kit/Glyphs.js).
  assert.match(uv, /verdict=\{<><CheckGlyph \/> REAL · OFFICIAL GOVERNMENT SITE<\/>\}/);
  assert.match(uv, /verdict=\{<><CrossGlyph \/> NOT OFFICIAL · CHARGES EXTRA FEES<\/>\}/);
  assert.match(uv, /No verified official site yet\./);
  assert.match(uv, /<span className="uv-beam" aria-hidden="true" \/>/);
  assert.match(uv, /<span className="uv-mark uv-mark--ok" aria-hidden="true">VERIFIED<\/span>/);
  for (const file of ['app/sources/UvCheck.js', 'app/sources/page.js', 'app/sources/[code]/page.js', 'app/sources/SourcesIndex.js', 'app/not-found.js']) {
    assert.doesNotMatch(read(file), /DENIED|REFUSED|REJECTED/, `${file}: never a negative stamp word`);
    assert.doesNotMatch(read(file), /[\u2713-\u2718\u2116]/u, `${file}: draw check / cross marks with kit Glyphs`);
  }
});

test('country page, directory and 404 wiring', () => {
  const country = read('app/sources/[code]/page.js');
  assert.match(country, /href=\{`\/visa\?to=\$\{country\.code\}`\}/);
  assert.match(country, /href=\{`\/relocate\?dest=\$\{encodeURIComponent\(country\.name\)\}`\}/);
  assert.match(country, /<VerifiedLinkCard href=\{link\.url\}/);
  assert.match(country, /<VerifiedLinkCard verified=\{false\}/);
  assert.throws(() => read('app/components/SourceLinkCard.js'), /ENOENT/, 'SourceLinkCard is replaced by VerifiedLinkCard');

  const index = read('app/sources/SourcesIndex.js');
  assert.match(index, /<Chip key=\{r\} pressed=\{region === r\} onClick=\{\(\) => setRegion\(r\)\}>/);
  assert.match(index, /<label htmlFor="src-search"/);
  assert.match(index, /id="src-search"/);

  const nf = read('app/not-found.js');
  assert.match(nf, /code="X-404"/);
  assert.match(nf, /title="This page isn't in your"/);
  assert.match(nf, /accent="passport\."/);
  assert.match(nf, /<Btn href="\/"/);
  assert.match(nf, /<Btn href="\/sources"/);
});
