// Unit 2 (smoothness): the cheaper sky, layer hints and loops that pause while unseen. The pure
// helpers PassportStage / NightSky use, plus guards on the CSS that does the work.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  starField,
  starsCovered,
  skyLayers,
  pageLayer,
  notepadPageStyle,
  litePageStyle,
} from '../../../app/components/passport/stageStyle.js';
import { activePages, showingPages } from '../../../app/components/passport/activePages.js';
import { buildTimeline, PAGES } from '../../../app/components/passport/timeline.js';
import { desktopPose, notepadPose } from '../../../app/components/passport/pose.js';

const read = (f) => readFileSync(new URL(`../../../app/components/passport/${f}`, import.meta.url), 'utf8');
const sorted = (set) => [...set].sort();
const TL = buildTimeline();

// Every `selector { ... }` rule (selectors inside @media / @supports included) whose body matches.
function rulesWith(css, bodyPattern) {
  const out = [];
  for (const m of css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (bodyPattern.test(m[2])) out.push({ selector: m[1].trim(), body: m[2] });
  }
  return out;
}

// ---------------------------------------------------------------- the sky

test('starField: the same 64 deterministic stars, in 3 layers that twinkle as wholes', () => {
  const layers = starField();
  assert.equal(layers.length, 3);
  for (const layer of layers) assert.ok(layer.length >= 21 && layer.length <= 22, String(layer.length));
  const all = layers.flat();
  assert.equal(all.length, 64);
  // The positions the 64 individually animated stars had; every 5th star is the big one (3px).
  const before = Array.from({ length: 64 }, (_, i) =>
    [((i * 37.7) % 100).toFixed(2), ((i * 61.3) % 100).toFixed(2), i % 5 === 0 ? 1.5 : 1].join('|'),
  ).sort();
  assert.deepEqual(all.map((s) => [s.x, s.y, s.r].join('|')).sort(), before);
  assert.deepEqual(starField(), layers, 'deterministic: server and client render the same HTML');
});

test('starsCovered: true exactly once the opaque sunrise layer above the stars and globe is fully in', () => {
  for (let i = 0; i <= 3000; i++) {
    const sky = i / 3000;
    assert.equal(starsCovered(sky), skyLayers(sky).sunrise >= 1, `sky ${sky}`);
  }
  assert.equal(starsCovered(0), false);
  assert.equal(starsCovered(0.6), false);
  assert.equal(starsCovered(2 / 3), true);
  assert.equal(starsCovered(1), true);
  assert.equal(starsCovered(NaN), false);
  // Over a real scroll: night at the hero, covered from dawn on through the finale.
  for (const pose of [desktopPose, notepadPose]) {
    assert.equal(starsCovered(pose(TL, 0).sky), false);
    assert.equal(starsCovered(pose(TL, 1).sky), true);
  }
});

// ---------------------------------------------------------------- layers

test('pageLayer: only the page turning and the page under it get a layer hint (one-page layouts)', () => {
  for (let page = 0; page < PAGES.length; page++) {
    const hints = PAGES.map((_, i) => pageLayer(i, page));
    assert.equal(hints[page], 'turn');
    assert.equal(hints[(page + 1) % PAGES.length], 'under');
    assert.equal(hints.filter(Boolean).length, 2, `page ${page}: ${hints}`);
    // the same pages the styles stack on top (turn z 2, under z 1) and show
    for (const style of [notepadPageStyle, litePageStyle]) {
      PAGES.forEach((_, i) => {
        const z = style(i, page, 0.3).zIndex;
        assert.equal(hints[i], z === 2 ? 'turn' : z === 1 ? 'under' : '');
      });
    }
  }
  assert.equal(pageLayer(3, NaN), '');
  assert.equal(pageLayer(3, undefined), '');
});

test('will-change: the turning page and the page under it only (plus the notepad turn dim), never every page', () => {
  const css = read('passport.css');
  const rules = rulesWith(css, /will-change\s*:/);
  const pages = rules.filter((r) => /\.jb-npage|\.jb-dim/.test(r.selector));
  assert.ok(pages.length > 0, 'one-page layouts get layer hints');
  for (const r of pages) {
    for (const sel of r.selector.split(',')) {
      if (/\.jb-spread/.test(sel)) continue; // the 3D spread's dims (existing)
      assert.match(sel, /\[data-turn\]/, `"${sel.trim()}" hints every page`);
    }
  }
  assert.ok(
    pages.some((r) => /\.jb-notepad[^,]*\[data-turn\][^,]*\.jb-dim/.test(r.selector) && /opacity/.test(r.body)),
    'notepad: the turn dim is its own layer',
  );
});

// ---------------------------------------------------------------- loops that pause while unseen

test('showingPages: loops run only on pages actually on screen', () => {
  for (const layout of ['notepad', 'lite', 'fade']) {
    // The cover is "active" at the hero, but the one-page book is invisible behind it.
    const hero = notepadPose(TL, 0);
    assert.ok(activePages(layout, hero).has('cover'));
    assert.equal(showingPages(layout, hero).size, 0, `${layout} at the hero`);
    assert.equal(showingPages(layout, notepadPose(TL, 1)).size, 0, `${layout} at the finale`);
    for (const p of [0.15, 0.3, 0.5, 0.7, 0.85]) {
      const pose = notepadPose(TL, p);
      assert.deepEqual(sorted(showingPages(layout, pose)), sorted(activePages(layout, pose)), `${layout} @ ${p}`);
    }
  }
  // The spread is always on screen: the closed book sits beside the hero.
  assert.deepEqual(sorted(showingPages('spread', desktopPose(TL, 0))), ['cover']);
  for (const p of [0, 0.3, 0.6, 1]) {
    const pose = desktopPose(TL, p);
    assert.deepEqual(sorted(showingPages('spread', pose)), sorted(activePages('spread', pose)));
  }
  assert.equal(showingPages('stack', {}).size, PAGES.length);
  assert.equal(showingPages('notepad', undefined).size, 0);
});

test('CSS: stars and globe pause when covered or off screen; seal and sheen pause off their page', () => {
  const passport = read('passport.css');
  const pages = read('pages/pages.css');
  const paused = rulesWith(passport + pages, /animation-play-state\s*:\s*paused/).map((r) => r.selector).join(',');
  for (const part of ['.jb-starfield', '.jb-globe']) {
    assert.ok(paused.includes('[data-covered]') && paused.includes('[data-offscreen]') && paused.includes(part), part);
  }
  assert.match(paused, /\.jb-face:not\(\[data-showing\]\)[^,]*\.jb-seal-ring/);
  assert.match(paused, /\.jb-face:not\(\[data-showing\]\)[^,]*\.jbp-sheen::before/);
});

test('CSS: the star field is a few layers that twinkle by opacity only; no per-star elements or rules', () => {
  const css = read('passport.css');
  assert.doesNotMatch(css, /\.jb-star(?![a-z-])/, 'the 64 individually animated stars are gone');
  const twinkle = /@keyframes jb-twinkle\s*\{([\s\S]*?)\n\}/.exec(css);
  assert.ok(twinkle, 'jb-twinkle keyframes');
  assert.doesNotMatch(twinkle[1], /transform|filter|left|top|width|height|box-shadow/);
  assert.match(twinkle[1], /opacity/);
  // lite keeps a (cheap) twinkle: still-sky rules stop only the globe there
  const lite = rulesWith(css, /animation\s*:\s*none/).filter((r) => /jb-sky--lite/.test(r.selector));
  assert.ok(lite.length > 0 && lite.every((r) => !/jb-starfield/.test(r.selector)));
});

test('stage.css: no universal selector under the book wrapper; one shield takes taps while it is inert', () => {
  const css = read('stage.css');
  assert.doesNotMatch(css.replace(/\/\*[\s\S]*?\*\//g, ''), /\[data-inert[^\]]*\]\s*\*/);
  const shield = rulesWith(css, /pointer-events\s*:\s*auto/).find((r) => r.selector === ".ps-bookwrap[data-inert='1']::after");
  assert.ok(shield, 'the inert shield');
  assert.match(shield.body, /content\s*:/);
  assert.match(shield.body, /inset\s*:\s*0/);
});

test('containment: each page face of the fixed-size books is a layout/paint boundary; never .jb-pgbody, never the stack', () => {
  const css = read('passport.css');
  const rules = rulesWith(css, /(^|;)\s*contain\s*:/);
  const face = rules.find((r) => /\.jb-face/.test(r.selector));
  assert.ok(face, 'faces are contained');
  assert.match(face.body, /contain\s*:\s*size layout paint/);
  for (const sel of face.selector.split(',')) assert.match(sel.trim(), /^\.(jb-spread|jb-pad) \.jb-face$/, sel);
  // .jb-pgbody is a flex item (never a relayout boundary) and holds the stamps, whose multiply
  // blend with the guilloche and whose focus rings / arrival motion overflow it.
  assert.ok(!rules.some((r) => /jb-pgbody|jb-stack/.test(r.selector)));
});

test('stage.css: the hero hint arrow stops bouncing once the hero has faded out (data-gone)', () => {
  const css = read('stage.css');
  const paused = rulesWith(css, /animation-play-state\s*:\s*paused/).map((r) => r.selector).join(',');
  assert.match(paused, /\.ps-hero\[data-gone\][^,]*\.ps-hint span/);
});

// ---------------------------------------------------------------- the slow beats (desktop CPU x4)

test('pose.sweep: the spread closing sweep and the finale, nowhere else', () => {
  const at = (beat, f) => TL.ranges[beat][0] + f * (TL.ranges[beat][1] - TL.ranges[beat][0]);
  for (let i = 0; i <= 1000; i++) {
    const p = i / 1000;
    assert.equal(desktopPose(TL, p).sweep, p > TL.ranges.closing[0], `p ${p}`);
  }
  assert.equal(desktopPose(TL, at('spread4', 0.99)).sweep, false);
  assert.equal(desktopPose(TL, at('closing', 0.01)).sweep, true);
  assert.equal(desktopPose(TL, 1).sweep, true);
  // the one-page book has no sweep: observations lifts off the cover, nothing flashes past
  assert.equal(notepadPose(TL, at('closing', 0.5)).sweep, undefined);
});

test('CSS: in the sweep, stamps, vignettes and the founder route land without their arrival motion', () => {
  const css = read('passport.css');
  const quiet = rulesWith(css, /transition\s*:\s*none/).filter((r) => /\[data-sweep\]/.test(r.selector));
  // `.ps-bookwrap[data-sweep] :is(a, b)` or `.ps-bookwrap[data-sweep] a` -> [a, b]
  const covered = quiet
    .map((r) => r.selector)
    .filter((sel) => sel.startsWith('.ps-bookwrap[data-sweep] '))
    .flatMap((sel) => (/:is\(([^)]*)\)$/.exec(sel)?.[1] ?? sel.split(' ').pop()).split(',').map((x) => x.trim()));
  for (const part of ['.jb-stamp', '.jb-vignette', '.jb-vignette-shadow', '.jb-founder-leg', '.jb-founder-stop']) {
    assert.ok(covered.includes(part), part);
  }
  // The ink bleed takes no time there, but is never switched off: changing animation-name (or
  // `animation: none`) would replay every landed stamp's bleed when the sweep ends.
  const bleed = rulesWith(css, /animation/).filter((r) => /\[data-sweep\]/.test(r.selector) && /\.jb-stamp::before/.test(r.selector));
  assert.equal(bleed.length, 1);
  assert.match(bleed[0].body, /animation-duration\s*:\s*0s/);
  assert.doesNotMatch(bleed[0].body, /animation\s*:|animation-name/);
  // The sweep rules come last, so they win over equally specific arrival rules (founder route).
  const lastSweep = css.lastIndexOf('[data-sweep]');
  assert.ok(lastSweep > css.lastIndexOf(".jb-founder[data-drawn='true']"));
});

test('JS arrivals (MRZ decode, count-up) land at once in the sweep', () => {
  assert.match(read('pages/UvSources.js'), /closest\([^)]*\[data-sweep\]/);
  assert.match(read('pages/DataPage.js'), /closest\(\s*'\[data-sweep\]'\s*\)/);
});

test('FounderRoute: no SVG <text> (laid out again on every frame of a transform); labels and pulse ring are HTML', () => {
  const src = read('parts/FounderRoute.js').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, ''); // code only
  assert.doesNotMatch(src, /<text\b|<tspan\b/);
  const svg = /<svg[\s\S]*?<\/svg>/.exec(src)[0];
  assert.doesNotMatch(svg, /jb-founder-pulse|jb-founder-lbl|jb-founder-place/);
  assert.match(src, /<span className="jb-founder-pulse"/);
  const css = read('passport.css');
  const pulse = /@keyframes jb-founder-pulse\s*\{([\s\S]*?)\n\}/.exec(css);
  assert.ok(pulse);
  assert.doesNotMatch(pulse[1], /stroke|width|height|left|top|r:/);
  assert.doesNotMatch(css, /transform-box/);
  // Place names are sized from the drawing's width (container units), like the SVG text was.
  assert.match(rulesWith(css, /container-type\s*:\s*inline-size/).map((r) => r.selector).join(','), /\.jb-founder\b/);
  assert.match(rulesWith(css, /cqw/).map((r) => r.selector).join(','), /\.jb-founder-place/);
});

test('layers only while things move: hero, finale and boarding pass while they fade; the founder drawing while it draws', () => {
  const stage = read('stage.css');
  const copy = rulesWith(stage, /will-change\s*:/).filter((r) => /\.ps-hero|\.ps-finale|\.bp\b/.test(r.selector));
  const selectors = copy.flatMap((r) => r.selector.split(',').map((s) => s.trim()));
  assert.deepEqual(selectors.sort(), ['.bp[data-fading]', '.ps-finale[data-fading]', '.ps-hero[data-fading]']);
  // PassportStage writes data-fading on change only, from the same opacity it writes
  const src = read('PassportStage.js');
  assert.match(src, /flag\(el, 'data-fading', fading\)/);
  assert.match(src, /flag\(pass, 'data-fading', fading\)/);
  // the founder drawing: a layer only while drawn, only in the animated layouts, never under reduced motion
  const css = read('passport.css');
  const art = rulesWith(css, /will-change\s*:/).filter((r) => /jb-founder-art/.test(r.selector));
  assert.equal(art.length, 1);
  assert.equal(art[0].selector, ":is(.jb-spread, .jb-notepad, .jb-lite) .jb-founder[data-drawn='true'] .jb-founder-art");
  assert.ok(css.indexOf('@media (prefers-reduced-motion: no-preference) {\n  :is(.jb-spread, .jb-notepad, .jb-lite) .jb-founder') !== -1);
});
