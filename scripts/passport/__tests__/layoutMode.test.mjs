import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { decideMotion } from '../../../app/components/passport/useLayoutMode.js';
import {
  decideLayout,
  FRAME,
  FRAME_QUERIES,
  frameFlags,
  onePageScale,
  SHORT_PHONE_QUERY,
} from '../../../app/components/passport/motionMode.js';

// ---- decideLayout ----------------------------------------------------------------------------

const roomy = { phone: false, roomy: true, tiny: false };

test('decideLayout: reduced motion -> fade; lite -> lite; phone -> notepad; else spread', () => {
  assert.equal(decideLayout({ motion: 'reduced', ...roomy }), 'fade');
  assert.equal(decideLayout({ motion: 'reduced', ...roomy, phone: true }), 'fade');
  assert.equal(decideLayout({ motion: 'lite', ...roomy, phone: true }), 'lite');
  assert.equal(decideLayout({ motion: 'lite', ...roomy }), 'lite');
  assert.equal(decideLayout({ motion: 'full', ...roomy, phone: true }), 'notepad');
  assert.equal(decideLayout({ motion: 'full', ...roomy }), 'spread');
});

test('decideLayout: a frame too small for the spread gets the (scaled) one-page book, not the stack', () => {
  assert.equal(decideLayout({ motion: 'full', phone: false, roomy: false, tiny: false }), 'notepad');
  assert.equal(decideLayout({ motion: 'reduced', phone: false, roomy: false, tiny: false }), 'fade');
  assert.equal(decideLayout({ motion: 'lite', phone: false, roomy: false, tiny: false }), 'lite');
});

test('decideLayout: only a tiny frame (even the scaled book would be unreadable) gets the stack', () => {
  for (const motion of ['full', 'lite', 'reduced']) {
    for (const phone of [true, false]) {
      assert.equal(decideLayout({ motion, phone, roomy: false, tiny: true }), 'stack', `${motion} phone=${phone}`);
    }
  }
});

test('decideLayout: missing / unknown signals fall back to the spread', () => {
  assert.equal(decideLayout(), 'spread');
  assert.equal(decideLayout({ motion: 'nope' }), 'spread');
});

// ---- frames: measured design sizes -> thresholds -----------------------------------------------

// A tiny evaluator for the media queries we write (comma = or, `and`, min/max width/height).
function matches(query, w, h) {
  return query.split(',').some((part) =>
    part.split(/\band\b/).every((cond) => {
      const m = /\(\s*(min|max)-(width|height)\s*:\s*([\d.]+)px\s*\)/.exec(cond);
      assert.ok(m, `unparsable media condition: ${cond}`);
      const v = m[2] === 'width' ? w : h;
      return m[1] === 'min' ? v >= Number(m[3]) : v <= Number(m[3]);
    }),
  );
}

const FRAMES = {
  'iPhone SE, Safari toolbars (375x548)': [375, 548, 'notepad'],
  'iPhone 13 mini, Safari (375x629)': [375, 629, 'notepad'],
  'iPhone 13, Safari (390x664)': [390, 664, 'notepad'],
  'Android 16:9 (360x560)': [360, 560, 'notepad'],
  'short portrait frame (360x500)': [360, 500, 'notepad'],
  'shorter portrait frame, the hero + finale copy cannot fit (375x480)': [375, 480, 'stack'],
  'iPhone 13 landscape (844x340)': [844, 340, 'stack'],
  'iPhone SE landscape (667x323)': [667, 323, 'stack'],
  'desktop 200% zoom (720x450)': [720, 450, 'stack'],
  'quarter-snapped window (960x470)': [960, 470, 'stack'],
  'desktop 175% zoom (1097x540)': [1097, 540, 'notepad'],
  'internal 125% + zoom 150% (1024x550)': [1024, 550, 'notepad'],
  'short laptop (1280x570)': [1280, 570, 'spread'],
  'desktop 150% zoom (1280x630)': [1280, 630, 'spread'],
  'iPad portrait (820x1106)': [820, 1106, 'notepad'],
  'iPad landscape (1180x760)': [1180, 760, 'spread'],
  'laptop (1440x900)': [1440, 900, 'spread'],
};

test('frameFlags: the media queries and the pure check agree on every sample frame', () => {
  for (const [w, h] of Object.values(FRAMES)) {
    const flags = frameFlags(w, h);
    assert.equal(matches(FRAME_QUERIES.phone, w, h), flags.phone, `phone ${w}x${h}`);
    assert.equal(matches(FRAME_QUERIES.roomy, w, h), flags.roomy, `roomy ${w}x${h}`);
    assert.equal(matches(FRAME_QUERIES.tiny, w, h), flags.tiny, `tiny ${w}x${h}`);
  }
  // ...and on a sweep around every threshold
  for (let w = 260; w <= 1400; w += 7) {
    for (let h = 300; h <= 1000; h += 3) {
      const flags = frameFlags(w, h);
      assert.equal(matches(FRAME_QUERIES.roomy, w, h), flags.roomy, `roomy ${w}x${h}`);
      assert.equal(matches(FRAME_QUERIES.tiny, w, h), flags.tiny, `tiny ${w}x${h}`);
    }
  }
});

test('frames: real devices get the layout the owner asked for (phones animate, extremes stack)', () => {
  for (const [name, [w, h, want]] of Object.entries(FRAMES)) {
    assert.equal(decideLayout({ motion: 'full', ...frameFlags(w, h) }), want, name);
  }
});

test('onePageScale: 375x548 keeps >= 13px body text; no animated one-page frame goes below 13px', () => {
  assert.ok(16 * onePageScale(375, 548) >= 13, `375x548 -> ${16 * onePageScale(375, 548)}px`);
  assert.equal(onePageScale(390, 664), 1, 'iPhone 13: unscaled');
  assert.equal(onePageScale(1440, 900), 1);
  for (let w = 260; w <= 1600; w += 3) {
    for (let h = 300; h <= 1100; h += 2) {
      const flags = frameFlags(w, h);
      if (flags.tiny) continue;
      const s = onePageScale(w, h);
      assert.ok(s > 0 && s <= 1);
      assert.ok(16 * s >= 12.99, `${w}x${h}: ${(16 * s).toFixed(2)}px`);
    }
  }
});

test('frames: the spread is only chosen where its narrowest page fits below the navbar, flap included', () => {
  for (let w = 768; w <= 2000; w += 11) {
    for (let h = 400; h <= 1200; h += 5) {
      if (!frameFlags(w, h).roomy) continue;
      const pw = Math.max(FRAME.spread, Math.min(0.36 * w, (0.8 * h) / FRAME.aspect, 470));
      assert.ok(pw * FRAME.aspect <= h - FRAME.navbar - 2 * FRAME.gap + 0.5, `height ${w}x${h}`);
      assert.ok(2.6 * pw <= 0.96 * w + 0.5, `width ${w}x${h}`); // two pages + the 0.6-page UV flap
    }
  }
});

test('FRAME_QUERIES: the stylesheets style the server HTML with the same frame decisions', () => {
  // Before hydration settles the layout, CSS alone shows the server's markup in its final layout:
  // the spread only where it stays, and the stacked look on tiny frames (no blocking script).
  const read = (f) => readFileSync(new URL(`../../../app/components/passport/${f}`, import.meta.url), 'utf8');
  assert.ok(
    read('passport.css').includes(`@media ${FRAME_QUERIES.roomy} and (prefers-reduced-motion: no-preference)`),
    'passport.css: pre-settle spread only where it stays',
  );
  assert.ok(read('stage.css').includes(`@media ${FRAME_QUERIES.tiny} {`), 'stage.css: pre-settle stack on tiny frames');
});

// Top-level `@media <query> { ... }` blocks of a stylesheet.
function mediaBlocks(css) {
  const out = [];
  for (let i = css.indexOf('@media'); i !== -1; i = css.indexOf('@media', i + 1)) {
    const open = css.indexOf('{', i);
    let depth = 0;
    let end = open;
    for (; end < css.length; end++) {
      if (css[end] === '{') depth++;
      else if (css[end] === '}' && --depth === 0) break;
    }
    out.push({ query: css.slice(i + 6, open).trim(), body: css.slice(open + 1, end) });
    i = end;
  }
  return out;
}

test('SHORT_PHONE_QUERY: the tight short-phone copy is for phones that keep the sticky stage, never a tiny frame', () => {
  // Tiny frames stack, and the stack has no .ps-stage: tight type there would only apply before
  // the layout settles, so the hero would reflow when it does.
  for (let w = 260; w <= 900; w += w < 300 || (w >= 760 && w < 775) ? 1 : 13) {
    for (let h = 300; h <= 1000; h++) {
      const flags = frameFlags(w, h);
      const want = flags.phone && !flags.tiny && h <= FRAME.shortPhone;
      assert.equal(matches(SHORT_PHONE_QUERY, w, h), want, `${w}x${h}`);
    }
  }
  for (const [w, h] of [[375, 548], [360, 560], [360, 500]]) assert.ok(matches(SHORT_PHONE_QUERY, w, h), `${w}x${h}`);
  for (const [w, h] of [[375, 480], [667, 323], [720, 450], [280, 600], [375, 629], [390, 664]]) {
    assert.ok(!matches(SHORT_PHONE_QUERY, w, h), `${w}x${h}`);
  }
});

test('stage.css: hero type scoped to the sticky stage never applies to a tiny frame (no reflow when it stacks)', () => {
  const css = readFileSync(new URL('../../../app/components/passport/stage.css', import.meta.url), 'utf8');
  const heroType = /\.ps-stage\b[^{},]*\.(ps-h1|ps-sub|ps-trust)\b/;
  const blocks = mediaBlocks(css).filter((b) => heroType.test(b.body));
  assert.ok(blocks.length > 0, 'the short-phone hero rules exist');
  for (const { query } of blocks) {
    // every width around the tiny width / phone thresholds, every 7px elsewhere; every height
    for (let w = 260; w <= 1400; w += w < 300 || (w >= 760 && w < 775) ? 1 : 7) {
      for (let h = 300; h <= 1000; h++) {
        if (frameFlags(w, h).tiny) assert.ok(!matches(query, w, h), `@media ${query} matches tiny ${w}x${h}`);
      }
    }
  }
  assert.ok(
    blocks.some((b) => b.query === SHORT_PHONE_QUERY),
    `stage.css: @media ${SHORT_PHONE_QUERY} { .ps-stage .ps-h1 ... }`,
  );
});

test('FRAME: the CSS uses the same measured design widths and navbar clearance', () => {
  const css = readFileSync(new URL('../../../app/components/passport/passport.css', import.meta.url), 'utf8');
  const designs = [...css.matchAll(/--jb-design-pw:\s*(\d+)px/g)].map((m) => Number(m[1])).sort((a, b) => a - b);
  assert.deepEqual(designs, [FRAME.onePage, FRAME.spread, FRAME.onePageWide].sort((a, b) => a - b));
  const clearance = FRAME.navbar + 2 * FRAME.gap;
  assert.ok(css.includes(`100svh - ${clearance}px`), `fit height 100svh - ${clearance}px`);
  assert.ok(css.includes(`${FRAME.navbar + FRAME.gap}px`), `top clearance ${FRAME.navbar + FRAME.gap}px`);
});

// ---- decideMotion ----------------------------------------------------------------------------

// A capable, motion-happy desktop; individual tests override one signal at a time.
const base = {
  override: null,
  reducedMotion: false,
  deviceMemory: 8,
};
const decide = (over = {}) => decideMotion({ ...base, ...over });

test('full by default', () => {
  assert.equal(decide(), 'full');
});

test('prefers-reduced-motion -> reduced', () => {
  assert.equal(decide({ reducedMotion: true }), 'reduced');
});

test('reduced beats lite', () => {
  assert.equal(decide({ reducedMotion: true, deviceMemory: 1 }), 'reduced');
});

test('2GB or less of device memory (Android only; Safari has no deviceMemory) -> lite', () => {
  assert.equal(decide({ deviceMemory: 2 }), 'lite');
  assert.equal(decide({ deviceMemory: 1 }), 'lite');
  assert.equal(decide({ deviceMemory: 0.5 }), 'lite');
  assert.equal(decide({ deviceMemory: 4 }), 'full');
});

test('iPhones get full motion: core count, touch and Save-Data never downgrade any more', () => {
  // WebKit reports 4 cores on every iPhone; Save-Data is about bytes, not CPU.
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: 4, deviceMemory: undefined }), 'full');
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: 2 }), 'full');
  assert.equal(decide({ saveData: true }), 'full');
});

test('missing or unknown navigator fields are treated as unknown, not as lite', () => {
  assert.equal(decide({ deviceMemory: undefined }), 'full');
  assert.equal(decide({ deviceMemory: null }), 'full');
  assert.equal(decide({ deviceMemory: NaN }), 'full');
  assert.equal(decide({ deviceMemory: '1' }), 'full'); // only a real number counts
  assert.equal(decideMotion({}), 'full');
  assert.equal(decideMotion(), 'full');
});

test('override wins over everything', () => {
  assert.equal(decide({ override: 'full', reducedMotion: true, deviceMemory: 1 }), 'full');
  assert.equal(decide({ override: 'lite' }), 'lite');
  assert.equal(decide({ override: 'reduced' }), 'reduced');
});

test('an unrecognised override is ignored', () => {
  assert.equal(decide({ override: 'turbo' }), 'full');
  assert.equal(decide({ override: '' }), 'full');
  assert.equal(decide({ override: 'turbo', reducedMotion: true }), 'reduced');
  assert.equal(decide({ override: 'FULL', deviceMemory: 1 }), 'lite');
});
