// The site-wide footer skips its layout until it nears the viewport (content-visibility: auto),
// which keeps ~100 ms of first layout off every page (the /sources/ca LCP budget). These guards keep
// that rule wired to the footer, keep the placeholder a height only (never a fixed width that
// could overflow a phone), and keep its two heights on the same breakpoint as the footer's own
// one-column / three-column switch.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

const css = read('app/globals.css').replace(/\/\*[\s\S]*?\*\//g, '');
const footer = read('app/components/SiteFooter.js');

// The bodies of every `.site-footer { … }` rule, with the @media prelude around it (or null).
function footerRules() {
  const out = [];
  const re = /(@media[^{]*)\{\s*\.site-footer\s*\{([^}]*)\}\s*\}|(?:^|\})\s*\.site-footer\s*\{([^}]*)\}/g;
  for (let m; (m = re.exec(css)); ) {
    out.push(m[1] ? { media: m[1].trim(), body: m[2] } : { media: null, body: m[3] });
  }
  return out;
}
const decl = (body, prop) => new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`).exec(body)?.[1].trim() ?? null;
const placeholder = (value) => {
  const m = /^auto\s+(\d+(?:\.\d+)?)px$/.exec(value ?? '');
  return m ? Number(m[1]) : null;
};

test('SiteFooter: the <footer> carries the site-footer class', () => {
  const tag = /<footer\s+className="([^"]*)"/.exec(footer);
  assert.ok(tag, 'SiteFooter renders a <footer className="…">');
  assert.ok(tag[1].split(/\s+/).includes('site-footer'), `footer classes: ${tag[1]}`);
  assert.ok(tag[1].split(/\s+/).includes('w-full'), 'the footer keeps its full-row width');
});

test('site-footer: skipped until near the viewport, with a remembered height-only placeholder', () => {
  const rules = footerRules();
  const base = rules.filter((r) => r.media === null);
  assert.equal(base.length, 1, 'one unconditional .site-footer rule');
  assert.equal(decl(base[0].body, 'content-visibility'), 'auto');
  const phone = placeholder(decl(base[0].body, 'contain-intrinsic-height'));
  assert.ok(phone !== null, 'contain-intrinsic-height: auto <px> (auto = keep the real height once rendered)');

  for (const r of rules) {
    assert.equal(decl(r.body, 'contain-intrinsic-size'), null, 'no width placeholder (shorthand)');
    assert.equal(decl(r.body, 'contain-intrinsic-width'), null, 'no width placeholder');
    assert.doesNotMatch(r.body, /content-visibility\s*:\s*hidden/, 'never hidden: links stay reachable');
  }
});

test('site-footer: the placeholder heights follow the footer\'s md column switch', () => {
  const rules = footerRules();
  const wide = rules.filter((r) => r.media !== null);
  assert.equal(wide.length, 1, 'one breakpoint override');
  // Tailwind v4's md breakpoint is 48rem; SiteFooter goes from one column to three at md.
  assert.match(wide[0].media, /^@media\s*\(\s*min-width\s*:\s*48rem\s*\)$/);
  assert.match(footer, /\bmd:grid-cols-/, 'SiteFooter switches its grid at md');

  const phone = placeholder(decl(rules.find((r) => r.media === null).body, 'contain-intrinsic-height'));
  const desk = placeholder(decl(wide[0].body, 'contain-intrinsic-height'));
  assert.ok(desk !== null, 'the md+ rule sets contain-intrinsic-height: auto <px>');
  // Measured on the built site: one column ≈ 812px at 360–414px wide, three columns ≈ 430px.
  // Re-measure if the footer's content changes; a placeholder far off makes the page height jump
  // when the footer renders.
  assert.ok(phone > desk, 'one column is taller than three');
  assert.ok(phone >= 700 && phone <= 900, `phone placeholder ${phone}px`);
  assert.ok(desk >= 380 && desk <= 480, `md+ placeholder ${desk}px`);
});
