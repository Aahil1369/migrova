import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideMotion } from '../../../app/components/passport/useLayoutMode.js';
import { decideLayout, FRAME_QUERIES } from '../../../app/components/passport/motionMode.js';

const roomy = { tiny: false, short: false };

test('decideLayout: reduced motion -> stack; lite -> lite; phone -> notepad; else spread', () => {
  assert.equal(decideLayout({ motion: 'reduced', phone: false, ...roomy }), 'stack');
  assert.equal(decideLayout({ motion: 'reduced', phone: true, ...roomy }), 'stack');
  assert.equal(decideLayout({ motion: 'lite', phone: true, ...roomy }), 'lite');
  assert.equal(decideLayout({ motion: 'full', phone: true, ...roomy }), 'notepad');
  assert.equal(decideLayout({ motion: 'full', phone: false, ...roomy }), 'spread');
});

test('decideLayout: tiny frames (<= 560px: landscape phones, 200% zoom) always get the stack', () => {
  for (const motion of ['full', 'lite', 'reduced']) {
    for (const phone of [true, false]) {
      assert.equal(decideLayout({ motion, phone, tiny: true, short: true }), 'stack', `${motion} phone=${phone}`);
    }
  }
});

test('decideLayout: short frames (< 640px) stack the one-page books but keep the desktop spread', () => {
  const short = { tiny: false, short: true };
  assert.equal(decideLayout({ motion: 'full', phone: true, ...short }), 'stack', 'small phone (375x553 / 375x620)');
  assert.equal(decideLayout({ motion: 'lite', phone: false, ...short }), 'stack', 'lite on a short laptop');
  assert.equal(decideLayout({ motion: 'full', phone: false, ...short }), 'spread', '1024x600 desktop');
});

test('FRAME_QUERIES: max-height queries, the one-page threshold above the spread one', () => {
  const px = (q) => Number(/max-height:\s*(\d+)px/.exec(q)[1]);
  assert.ok(px(FRAME_QUERIES.short) > px(FRAME_QUERIES.tiny));
});

test('decideLayout: missing / unknown signals fall back to the spread', () => {
  assert.equal(decideLayout(), 'spread');
  assert.equal(decideLayout({ motion: 'nope' }), 'spread');
});

// A capable, motion-happy desktop; individual tests override one signal at a time.
const base = {
  override: null,
  reducedMotion: false,
  saveData: false,
  deviceMemory: 8,
  coarsePointer: false,
  hardwareConcurrency: 8,
};
const decide = (over = {}) => decideMotion({ ...base, ...over });

test('full by default', () => {
  assert.equal(decide(), 'full');
});

test('prefers-reduced-motion -> reduced', () => {
  assert.equal(decide({ reducedMotion: true }), 'reduced');
});

test('reduced beats lite', () => {
  assert.equal(decide({ reducedMotion: true, saveData: true, deviceMemory: 1 }), 'reduced');
});

test('each lite trigger on its own -> lite', () => {
  assert.equal(decide({ saveData: true }), 'lite');
  assert.equal(decide({ deviceMemory: 2 }), 'lite');
  assert.equal(decide({ deviceMemory: 1 }), 'lite');
  assert.equal(decide({ deviceMemory: 0.5 }), 'lite');
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: 4 }), 'lite');
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: 2 }), 'lite');
});

test('thresholds are inclusive and exclusive where they should be', () => {
  assert.equal(decide({ deviceMemory: 4 }), 'full');
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: 5 }), 'full');
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: 8 }), 'full');
  // few cores alone (fine pointer) is not enough
  assert.equal(decide({ coarsePointer: false, hardwareConcurrency: 2 }), 'full');
});

test('missing or unknown navigator fields are treated as unknown, not as lite', () => {
  assert.equal(decide({ saveData: undefined, deviceMemory: undefined, hardwareConcurrency: undefined }), 'full');
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: undefined }), 'full');
  assert.equal(decide({ coarsePointer: true, hardwareConcurrency: null }), 'full');
  assert.equal(decide({ deviceMemory: null }), 'full');
  assert.equal(decide({ deviceMemory: NaN, hardwareConcurrency: NaN, coarsePointer: true }), 'full');
  assert.equal(decide({ saveData: 'yes' }), 'full'); // only a real `true` counts
  assert.equal(decideMotion({}), 'full');
  assert.equal(decideMotion(), 'full');
});

test('override wins over everything', () => {
  assert.equal(decide({ override: 'full', reducedMotion: true, saveData: true, deviceMemory: 1 }), 'full');
  assert.equal(decide({ override: 'lite' }), 'lite');
  assert.equal(decide({ override: 'reduced' }), 'reduced');
  assert.equal(decide({ override: 'reduced', saveData: false }), 'reduced');
});

test('an unrecognised override is ignored', () => {
  assert.equal(decide({ override: 'turbo' }), 'full');
  assert.equal(decide({ override: '' }), 'full');
  assert.equal(decide({ override: 'turbo', reducedMotion: true }), 'reduced');
  assert.equal(decide({ override: 'FULL', saveData: true }), 'lite');
});
