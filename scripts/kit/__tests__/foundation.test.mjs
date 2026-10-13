// Site foundation for the tool pages (passport site, step 1): the header MRZ line, the colour
// pairs the shell and controls use, the motion clean-up in globals.css / Btn / Navbar, the
// viewport export, the tool-page header copy, and that the six tool pages moved off the old
// EditorialHero / useScrollReveal onto ToolShell + ToolHeader with 16px kit controls.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const stripCssComments = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJsComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');

// Innermost CSS rules as { selector, body } (rules inside @media come out with their own selector;
// a preceding statement such as `@import "tailwindcss";` is not part of the selector).
function cssRules(css) {
  return [...stripCssComments(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].split(';').pop().trim(),
    body: m[2],
  }));
}

const { heroMrz } = await import(new URL('app/components/kit/heroMrz.js', ROOT));
const { contrastRatio } = await import(new URL('app/components/kit/stampInks.js', ROOT));
const { HERO_COPY } = await import(new URL('app/lib/pageCopy.js', ROOT));

const MRZ = /^[A-Z0-9<]{44}$/;

test('heroMrz: the route as a 44-char MRZ line, letter from the page code', () => {
  const line = heroMrz('V-VISA', { from: 'pk', to: 'ca' });
  assert.equal(line.length, 44);
  assert.ok(line.startsWith('V<MGV<<PAK<<CAN<<'), line);
  assert.match(line, MRZ);
  assert.equal(line, 'V<MGV<<PAK<<CAN<<'.padEnd(44, '<'));
});

test('heroMrz: no route, unknown codes or "any" read as XXX', () => {
  const none = heroMrz('S-SOURCES', null);
  assert.equal(none.length, 44);
  assert.ok(none.startsWith('S<MGV<<XXX<<XXX<<'), none);
  assert.match(none, MRZ);

  const junk = heroMrz('M-MATCH', { from: 'zz', to: undefined });
  assert.equal(junk.length, 44);
  assert.ok(junk.startsWith('M<MGV<<XXX<<XXX<<'), junk);

  assert.ok(heroMrz('R-RELOCATE', { from: 'PK', to: 'any' }).startsWith('R<MGV<<PAK<<XXX<<'));
  assert.ok(heroMrz('V-VISA', undefined).startsWith('V<MGV<<XXX<<XXX<<'));
  assert.ok(heroMrz('V-VISA', { from: 42, to: {} }).startsWith('V<MGV<<XXX<<XXX<<'));
});

test('heroMrz: the letter is the code letter before the dash, always [A-Z0-9<]', () => {
  // Each page has its own letter (L-COUNSEL -> L, T-STORIES -> T, not the C / S after the dash).
  for (const [code, letter] of [
    ['V-VISA', 'V'], ['R-RELOCATE', 'R'], ['M-MATCH', 'M'], ['S-SOURCES', 'S'],
    ['L-COUNSEL', 'L'], ['T-STORIES', 'T'], ['X-404', 'X'], ['v-visa', 'V'],
  ]) {
    const line = heroMrz(code, { from: 'gb', to: 'de' });
    assert.equal(line, `${letter}<MGV<<GBR<<DEU<<`.padEnd(44, '<'), code);
  }
  for (const code of ['', null, undefined, '-', '·-X']) {
    const line = heroMrz(code, null);
    assert.match(line, MRZ, String(code));
    assert.ok(line.startsWith('<<MGV<<XXX<<XXX<<'), `${code}: ${line}`);
  }
});

test('colour pairs of the shell, header band and controls reach 4.5:1', () => {
  const pairs = [
    ['#1f2a24', '#efe7d6', 'page ink on the --ground paper'],
    ['#3d443a', '#fbf8f2', 'dim ink on a --page card / input'],
    ['#5a6b4a', '#fbf8f2', 'placeholder / label ink on a --page input'],
    ['#15231a', '#b8cf5d', 'primary button text on lime'],
    ['#b8cf5d', '#15231a', 'lime kicker on the night band'],
    ['#f3efe4', '#15231a', 'headline on the night band'],
    ['#fbf8f2', '#1f2a24', 'pressed chip text'],
    ['#1f2a24', '#fbf8f2', 'chip / input text'],
  ];
  // Every colour that sits on the band (kit.css .kit-sky), against the band colours under text:
  // the night, the purple the text zone ends on (#241f3f) and the top-right glow at full
  // strength over the lighter night (rgba(47,81,57,.5) over #15231a = #203426, an upper bound).
  for (const bg of ['#0b130f', '#15231a', '#241f3f', '#203426']) {
    for (const [fg, what] of [
      ['#b8cf5d', 'kicker / gradient start'],
      ['#f0a46e', 'gradient end'],
      ['#f3efe4', 'headline'],
      ['#d8d3c6', 'sub'],
      ['#8aa085', 'MRZ line'],
    ]) pairs.push([fg, bg, `${what} on ${bg}`]);
  }
  for (const [fg, bg, what] of pairs) {
    const ratio = contrastRatio(fg, bg);
    assert.ok(ratio >= 4.5, `${what}: ${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
  }
});

test('globals.css: --ground token, transform-only underline, no italic-draw, no permanent will-change', () => {
  const css = read('app/globals.css');
  const rules = cssRules(css);
  const root = rules.find((r) => r.selector === ':root');
  assert.match(root.body, /--ground:\s*#efe7d6;/);
  const theme = rules.find((r) => r.selector === '@theme inline');
  assert.match(theme.body, /--color-ground:\s*var\(--ground\);/);

  const underline = rules.filter((r) => r.selector.includes('.tool-card-underline'));
  assert.ok(underline.length >= 2, 'the .tool-card-underline rules are still there');
  const underlineCss = underline.map((r) => r.body).join('\n');
  assert.match(underlineCss, /scaleX\(/);
  assert.doesNotMatch(underlineCss, /transition:\s*all|transition-all|transition:\s*width|\bwidth\s*:\s*0/);

  assert.doesNotMatch(stripCssComments(css), /italic-draw/);
  const reveal = rules.find((r) => r.selector === '.reveal');
  assert.ok(reveal, '.reveal rule');
  assert.doesNotMatch(reveal.body, /will-change/);
});

test('globals.css and kit.css transition only transform, opacity (and stroke-dashoffset)', () => {
  const allowed = new Set(['transform', 'opacity', 'stroke-dashoffset', 'none']);
  for (const file of ['app/globals.css', 'app/components/kit/kit.css']) {
    for (const { selector, body } of cssRules(read(file))) {
      for (const m of body.matchAll(/(?:^|;)\s*transition(?:-property)?\s*:\s*([^;]+)/g)) {
        for (const part of m[1].split(/,(?![^(]*\))/)) { // not the commas inside cubic-bezier(…)
          const prop = part.trim().split(/\s+/)[0];
          assert.ok(allowed.has(prop), `${file} ${selector}: transition of "${prop}"`);
        }
      }
    }
  }
});

test('Btn and the navbar progress bar animate only transform/opacity', () => {
  const btn = stripJsComments(read('app/components/ui/Btn.js'));
  assert.doesNotMatch(btn, /transition-all|transition-colors|after:transition/);
  assert.match(btn, /transition-\[transform,opacity\]/);
  const nav = stripJsComments(read('app/components/Navbar.js'));
  assert.doesNotMatch(nav, /width:\s*`\$\{progressPct\}%`/);
  assert.match(nav, /transform:\s*`scaleX\(\$\{progressPct \/ 100\}\)`/);
  assert.match(nav, /origin-left/);
});

test('app/layout.js exports the viewport (width=device-width, initial-scale=1)', () => {
  assert.match(
    read('app/layout.js'),
    /export const viewport = \{\s*width: 'device-width',\s*initialScale: 1,?\s*\};/,
  );
});

test('HERO_COPY: tool-page code, name, headline and gradient word (subs unchanged)', () => {
  const expected = {
    visa: {
      code: 'V-VISA', name: 'VISA INTELLIGENCE', title: 'The visa rules, in', accent: 'plain English.',
      sub: 'Document checklists, timelines, embassy tips, approval signals — by nationality and destination. General information, not legal advice.',
    },
    relocate: {
      code: 'R-RELOCATE', name: 'RELOCATION GUIDE', title: 'Land on your feet,', accent: 'anywhere.',
      sub: 'Rent, neighborhoods, banking, SIM, expat community, safety — written for the week you arrive.',
    },
    match: {
      code: 'M-MATCH', name: 'COUNTRY MATCH', title: 'Where can you', accent: 'actually go?',
      sub: 'Five countries, ranked by your real visa access and role fit. Takes 60 seconds.',
    },
    sources: {
      code: 'S-SOURCES', name: 'OFFICIAL SOURCES', title: 'The real government sites,', accent: 'verified.',
      sub: 'Verified government immigration websites for every country — the authority, where to apply, embassies, work, study and citizenship. Checked by us, dated, and never guessed.',
    },
    lawyer: {
      code: 'L-COUNSEL', name: 'LAWYER GUIDE', title: 'Find the right help, without', accent: 'getting burned.',
      sub: 'Typical fees, the questions to ask, the red flags to walk away from, and where to find free or low-cost legal aid. We link real directories — we never invent listings.',
    },
    stories: {
      code: 'T-STORIES', name: 'TRAVELLERS', title: 'They did it.', accent: 'You can too.',
      sub: 'Submitted by readers. Edited for length, never for honesty.',
    },
  };
  for (const [page, want] of Object.entries(expected)) {
    const got = HERO_COPY[page];
    assert.ok(got, `HERO_COPY.${page}`);
    assert.deepEqual({ ...got }, { ...want, tail: '' }, page);
  }
});

// The six tool pages that used EditorialHero, plus the client part of /sources that holds its input.
const TOOL_PAGES = ['visa', 'relocate', 'match', 'lawyer', 'stories', 'sources'].map((p) => `app/${p}/page.js`);
const CONTROL_FILES = [...TOOL_PAGES, 'app/sources/SourcesIndex.js'];

function appSources(dir = new URL('app/', ROOT), prefix = 'app/') {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) out.push(...appSources(new URL(`${entry.name}/`, dir), `${prefix}${entry.name}/`));
    else if (/\.(m?js|jsx)$/.test(entry.name)) out.push({ name: `${prefix}${entry.name}`, src: readFileSync(new URL(entry.name, dir), 'utf8') });
  }
  return out;
}

test('nothing under app/ imports EditorialHero or useScrollReveal any more', () => {
  for (const { name, src } of appSources()) {
    const code = stripJsComments(src);
    assert.doesNotMatch(code, /EditorialHero/, `${name} still uses EditorialHero`);
    assert.doesNotMatch(code, /useScrollReveal/, `${name} still uses useScrollReveal`);
  }
});

test('the six tool pages render ToolShell + ToolHeader with their HERO_COPY entry', () => {
  for (const file of TOOL_PAGES) {
    const src = stripJsComments(read(file));
    assert.match(src, /import ToolShell from '\.\.\/components\/kit\/ToolShell'/, file);
    assert.match(src, /import ToolHeader from '\.\.\/components\/kit\/ToolHeader'/, file);
    assert.match(src, /<ToolShell\b[^>]*header=\{<ToolHeader \{\.\.\.HERO_COPY\.\w+\} \/>\}/, file);
    assert.doesNotMatch(src, /<Navbar\b/, `${file} renders its own Navbar (ToolShell does)`);
  }
});

test('every text input, select and textarea on the tool pages is a 16px kit control', () => {
  for (const file of CONTROL_FILES) {
    const src = read(file);
    // The tag's attributes: from "<input" / "<select" / "<textarea" to the next "<".
    for (const m of src.matchAll(/<(input|select|textarea)\b([^<]*)/g)) {
      const [, tag, attrs] = m;
      if (/type="(checkbox|radio|file|hidden)"/.test(attrs)) continue;
      const want = tag === 'select' ? 'kit-select' : 'kit-input';
      assert.match(attrs, new RegExp(`className="[^"]*\\b${want}\\b`), `${file}: <${tag}> without ${want}`);
    }
  }
  const rules = cssRules(read('app/components/kit/kit.css'));
  for (const cls of ['.kit-input', '.kit-select']) {
    const fontSize = rules
      .filter((r) => r.selector.split(',').map((s) => s.trim()).includes(cls))
      .map((r) => r.body.match(/font-size:\s*([^;]+)/)?.[1]?.trim())
      .filter(Boolean);
    assert.deepEqual(fontSize, ['16px'], `${cls} font-size (iOS zooms on focus below 16px)`);
  }
});

test('the navbar sign-in and profile pop-ups and /contact use 16px fields too (no iOS zoom)', () => {
  // These keep their own look (their redesign is a later round); only the field size is pinned.
  const files = { 'app/components/AuthModal.js': 3, 'app/components/ProfileModal.js': 4, 'app/contact/page.js': 4 };
  for (const [file, count] of Object.entries(files)) {
    const src = read(file);
    const inputCls = /const inputCls = '([^']*)'/.exec(src)?.[1];
    let fields = 0;
    for (const m of src.matchAll(/<(input|select|textarea)\b([^<]*)/g)) {
      const [, tag, attrs] = m;
      if (/type="(checkbox|radio|file|hidden)"/.test(attrs)) continue;
      fields += 1;
      const cls = /className="([^"]*)"/.exec(attrs)?.[1] ?? (/className=\{`?\$?\{?inputCls\b/.test(attrs) ? inputCls : null);
      assert.ok(cls, `${file}: <${tag}> has a className`);
      const sizes = cls.match(/(?:^|\s)text-(?:xs|sm|base|lg|\[\d+(?:\.\d+)?px\])(?=\s|$)/g)?.map((t) => t.trim()) ?? [];
      assert.deepEqual(sizes, ['text-[16px]'], `${file}: <${tag}> font size (iOS zooms on focus below 16px)`);
    }
    assert.equal(fields, count, `${file}: text fields found`);
  }
});
