// The passport tool pages' closing footnote is one shared component (ui/Footnote, tone="paper",
// styled by ui/footnote.css), not a copy per page: its text readable (>= 4.5:1) on the ground and
// the page paper at 16px, the mark decorative, no motion, and every tool page using it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');
const { contrastRatio, PAGE_PAPER } = await import(new URL('app/components/kit/stampInks.js', ROOT));

const GROUND = '#efe7d6';
const stripCss = (css) => css.replace(/\/\*[\s\S]*?\*\//g, '');
const stripJs = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
const rules = (css) =>
  [...stripCss(css).matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selectors: m[1].split(',').map((s) => s.trim()), body: m[2] }));
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim() ?? null;
const rule = (css, selector) => rules(css).find((r) => r.selectors.includes(selector))?.body ?? '';

const CSS = read('app/components/ui/footnote.css');
const COMPONENT = stripJs(read('app/components/ui/Footnote.js'));
const PAGES = [
  ['app/visa/page.js', 'visa'],
  ['app/relocate/page.js', 'relocate'],
  ['app/match/page.js', 'match'],
  ['app/sources/page.js', 'sources'],
  ['app/sources/[code]/page.js', 'sources'],
];
const PAGE_CSS = ['app/visa/visa.css', 'app/relocate/relocate.css', 'app/match/match.css', 'app/sources/sources.css'];

test('the paper footnote: 16px text and a terracotta mark, both readable on the ground and the paper', () => {
  const text = rule(CSS, '.paper-footnote');
  const mark = rule(CSS, '.paper-footnote-mark');
  assert.equal(decl(text, 'font-size'), '16px');
  assert.equal(decl(text, 'line-height'), '1.6');
  assert.equal(decl(text, 'margin'), '32px 0 0');
  assert.equal(decl(text, 'padding-top'), '20px');
  assert.equal(decl(text, 'border-top'), '1px dashed rgba(31, 42, 36, 0.25)');
  assert.match(decl(mark, 'font') ?? '', /^700 14px\/1 var\(--jb-mono, ui-monospace, monospace\)$/);
  for (const fg of [decl(text, 'color'), decl(mark, 'color')]) {
    assert.match(fg, /^#[0-9a-f]{6}$/i);
    for (const bg of [GROUND, PAGE_PAPER]) {
      const ratio = contrastRatio(fg, bg);
      assert.ok(ratio >= 4.5, `${fg} on ${bg} is ${ratio.toFixed(2)}:1`);
    }
  }
  assert.doesNotMatch(stripCss(CSS), /\b(?:sin|cos|tan|asin|acos|atan|atan2)\(/, 'no CSS trig');
  assert.doesNotMatch(stripCss(CSS), /animation|transition/, 'nothing moves');
});

test('Footnote tone="paper" renders the paper look with the mark hidden from screen readers', () => {
  assert.match(COMPONENT, /^import '\.\/footnote\.css';/m);
  assert.match(COMPONENT, /if \(tone === 'paper'\) \{\s*return \(\s*<p className=\{`paper-footnote\$\{className \? ` \$\{className\}` : ''\}`\}>\s*<span className="paper-footnote-mark" aria-hidden="true">\{number\}<\/span>\s*\{children\}\s*<\/p>/);
  // The editorial look stays the default (lawyer, stories) until those pages are redone.
  for (const file of ['app/lawyer/page.js', 'app/stories/page.js']) assert.match(read(file), /<Footnote>\{FOOTNOTES\.\w+\}<\/Footnote>/, file);
});

test('every passport tool page closes with the shared paper footnote, and no page keeps its own copy', () => {
  for (const [file, key] of PAGES) {
    const src = stripJs(read(file));
    assert.match(src, /^import Footnote from '(?:\.\.\/)+components\/ui\/Footnote';/m, `${file} imports Footnote`);
    assert.deepEqual(src.match(/<Footnote\b[^>]*>/g), ['<Footnote tone="paper">'], `${file}: one paper footnote`);
    assert.match(src, new RegExp(`<Footnote tone="paper">\\{FOOTNOTES\\.${key}\\}</Footnote>`), file);
    assert.doesNotMatch(src, /-footnote(?:-mark)?"/, `${file} still renders its own footnote markup`);
  }
  for (const file of PAGE_CSS) {
    for (const { selectors } of rules(read(file))) {
      for (const s of selectors) assert.doesNotMatch(s, /\.(?:visa|rl|mt|src)-footnote/, `${file} keeps a copy: ${s}`);
    }
  }
  // /sources spaces its sections with the page gap (40px), so its footnote drops the top margin
  // there, with a selector that out-ranks .paper-footnote whatever order the stylesheets load in.
  const sources = rules(read('app/sources/sources.css')).find((r) => r.selectors.includes('.src-page > .paper-footnote'));
  assert.ok(sources, '.src-page > .paper-footnote');
  assert.equal(decl(sources.body, 'margin-top'), '0');
});
