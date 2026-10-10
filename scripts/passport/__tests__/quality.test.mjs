import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY,
  TUNING,
  createQualityMonitor,
  decideQuality,
  dropIsolatedStalls,
  frameBudget,
  frameStats,
  judgeFrames,
  toSamples,
} from '../../../app/components/passport/quality.js';

const frames = (n, ms) => Array.from({ length: n }, () => ms);
// n frames at `ms`, with every k-th one taking `slow` ms instead.
const mixed = (n, ms, k, slow) => Array.from({ length: n }, (_, i) => (i % k === k - 1 ? slow : ms));
// Enough back-to-back frames to fill `ms` of scrolling.
const lasting = (ms, pattern) => {
  const out = [];
  let total = 0;
  for (let i = 0; total < ms; i++) {
    const d = pattern(i);
    out.push(d);
    total += d;
  }
  return out;
};
const judge = (intervals, opts) => judgeFrames(toSamples(intervals), opts);
// 5 stalls of 300ms, one after every `gap` on-time frames of `ms`, among 200 on-time frames.
const isolatedStalls = (ms = 16.7, gap = 40) => {
  const out = [];
  for (let k = 0; k < 5; k++) out.push(...frames(gap, ms), 300);
  return [...out, ...frames(200 - 5 * gap, ms)];
};
// The reviewer's 165 Hz desktop, the stalls packed 15 frames apart (the old p95-of-90 rule fired)
// or spread 40 apart, and a 60 Hz phone.
const STALL_CASES = [
  [6.06, 15],
  [6.06, 40],
  [16.7, 15],
  [16.7, 40],
];

// ---- frameStats ------------------------------------------------------------------------------

test('frameStats: nearest-rank p50 / p95, vsync from the fastest frames, fps from the mean', () => {
  const s = frameStats([...frames(95, 16.7), ...frames(5, 50)]);
  assert.equal(s.count, 100);
  assert.equal(s.p50, 16.7);
  assert.equal(s.p95, 16.7); // exactly 5% slow: p95 is still on time
  assert.equal(s.vsync, 16.7);
  assert.ok(Math.abs(s.fps - 1000 / (0.95 * 16.7 + 0.05 * 50)) < 1e-9);
  assert.equal(frameStats([...frames(94, 16.7), ...frames(6, 50)]).p95, 50);
});

test('frameStats: empty or junk input never throws', () => {
  assert.deepEqual(frameStats([]), { count: 0, p50: 0, p95: 0, vsync: 0, fps: 0 });
  assert.equal(frameStats([NaN, -3, Infinity, 'x', 16]).count, 1);
  assert.equal(frameStats(undefined).count, 0);
});

// ---- budget, samples, stalls ----------------------------------------------------------------

test('frameBudget: ~25ms, or 1.5 display frames on a slow display', () => {
  assert.equal(frameBudget(16.6), 25);
  assert.ok(Math.abs(frameBudget(16.7) - 25.05) < 1e-9); // 1.5 x 16.7ms
  assert.equal(frameBudget(8.3), 25); // 120 Hz: no extra headroom for being fast
  assert.ok(Math.abs(frameBudget(33.3) - 49.95) < 1e-9); // 30 Hz Low Power Mode
  assert.equal(frameBudget(0), 25);
  assert.equal(frameBudget(200), 51); // no display is slower than 30 Hz
});

test('toSamples: frame end times from back-to-back intervals', () => {
  assert.deepEqual(toSamples([10, 20, 5], 100), [
    { t: 110, d: 10 },
    { t: 130, d: 20 },
    { t: 135, d: 5 },
  ]);
});

test('dropIsolatedStalls: a lone stall over 150ms between on-time frames is left out, a run of slow frames stays', () => {
  assert.equal(dropIsolatedStalls(toSamples([...frames(40, 16.7), 300, ...frames(40, 16.7)])).length, 80);
  // single stalls between on-time frames are left out however often they come
  assert.equal(dropIsolatedStalls(toSamples(mixed(16, 16.7, 8, 220))).length, 14);
  for (const [ms, gap] of STALL_CASES) assert.equal(dropIsolatedStalls(toSamples(isolatedStalls(ms, gap))).length, 200);
  // back-to-back stalls (250 + 160ms GPU flushes), or a stall next to a slow frame, stay
  assert.equal(dropIsolatedStalls(toSamples([16.7, 250, 160, 16.7])).length, 4);
  assert.equal(dropIsolatedStalls(toSamples([16.7, 400, 30, 16.7])).length, 4);
  assert.equal(dropIsolatedStalls(toSamples(frames(10, 200))).length, 10); // a 5 fps device
  // ordinary slow frames (under 150ms) are never left out
  assert.equal(dropIsolatedStalls(toSamples(mixed(60, 16.7, 2, 140))).length, 60);
  // the budget decides what counts as on time around the stall
  assert.equal(dropIsolatedStalls(toSamples([40, 300, 40]), 50).length, 2);
  assert.equal(dropIsolatedStalls(toSamples([40, 300, 40]), 25).length, 3);
});

// ---- judgeFrames / decideQuality ------------------------------------------------------------

test('judgeFrames: under 2s of scrolling is never janky (each 0.5s slice needs 250ms of frames)', () => {
  const v = judge(lasting(1400, () => 80));
  assert.equal(v.janky, false);
  assert.equal(v.clean, false);
  assert.deepEqual(v.shares.slice(0, 1), [null]);
});

test('judgeFrames: on-time frames are clean; sustained jank in every slice is janky', () => {
  assert.equal(judge(lasting(2100, () => 16.7)).clean, true);
  assert.equal(judge(lasting(2100, () => 6.06)).clean, true); // 165 Hz
  // every 4th frame 45ms: ~47% of the time over budget, in every slice
  const steady = judge(lasting(2100, (i) => (i % 4 === 3 ? 45 : 16.7)));
  assert.equal(steady.janky, true);
  assert.ok(Math.abs(steady.budget - 25.05) < 1e-9);
  // 4% of frames at 40ms: dirty, not janky
  const few = judge(lasting(2100, (i) => (i % 25 === 24 ? 40 : 16.7)));
  assert.equal(few.janky, false);
  assert.equal(few.dirty, true);
});

test('judgeFrames: a short burst of slow frames is not sustained jank', () => {
  // 1s smooth, a 0.6s burst (a stall, then 15 frames at 40ms), 0.8s smooth
  const burst = [...lasting(1000, () => 16.7), 400, ...frames(15, 40), ...lasting(800, () => 16.7)];
  const v = judge(burst);
  assert.equal(v.janky, false);
  assert.equal(v.dirty, true);
});

test('judgeFrames: 5 isolated 300ms stalls among 200 smooth frames stay high', () => {
  for (const [ms, gap] of STALL_CASES) {
    const samples = toSamples(isolatedStalls(ms, gap));
    assert.equal(decideQuality(samples, 'high'), 'high', `${ms}ms frames, a stall every ${gap}`);
    // every 2s window along the way, too
    for (const s of samples) assert.equal(judgeFrames(samples, { now: s.t }).janky, false);
  }
});

test('judgeFrames: a run of slow frames is jank, however long each one is', () => {
  assert.equal(judge(lasting(2100, () => 200)).janky, true); // a 5 fps device
  assert.equal(judge(lasting(2400, (i) => (i % 3 ? 160 : 60))).janky, true);
  // single stalls between on-time frames are not
  assert.equal(judge(lasting(2400, (i) => (i % 8 === 7 ? 220 : 16.7))).janky, false);
});

test('judgeFrames: frames older than 2s are dropped', () => {
  // 2s of jank, then 1s of on-time frames: the jank still in the window is in only half the slices
  const v = judge([...lasting(2000, (i) => (i % 2 ? 40 : 16.7)), ...lasting(1000, () => 16.7)]);
  assert.equal(v.janky, false);
  assert.deepEqual(v.shares.slice(2), [0, 0]);
});

test('judgeFrames: refresh rate is normalised (120 Hz half-rate and 30 Hz low-power are not jank)', () => {
  // 120 Hz phone dropping every other frame: 16.7ms frames are still 60fps-smooth.
  assert.equal(judge(lasting(2100, (i) => (i % 2 ? 16.7 : 8.3))).janky, false);
  // iPhone Low Power Mode caps rAF at 30 Hz: steady 33ms frames are the display, not jank...
  assert.equal(judge(lasting(2100, () => 33.3)).clean, true);
  // ...but missing frames there (66ms) still counts.
  assert.equal(judge(lasting(2100, (i) => (i % 4 === 3 ? 66.7 : 33.3))).janky, true);
  // A 60 Hz device that mostly manages 30fps (some frames on time) is struggling.
  assert.equal(judge(lasting(2100, (i) => (i % 4 === 3 ? 16.7 : 33.3))).janky, true);
  // 120 Hz with real long frames (> 25ms) drops too.
  assert.equal(judge(lasting(2100, (i) => (i % 6 === 5 ? 33.3 : 8.3))).janky, true);
});

test('judgeFrames: a known display rate catches a device that is slow on every frame', () => {
  const slow = lasting(2100, () => 33.3);
  // Every frame 33ms looks like a 30 Hz display from the frames alone...
  assert.equal(judge(slow).janky, false);
  // ...but on a display calibrated at 60 Hz it is a struggling device,
  assert.equal(judge(slow, { vsync: 16.7 }).janky, true);
  // and on a calibrated 30 Hz display it is fine.
  assert.equal(judge(slow, { vsync: 33.3 }).janky, false);
  // A calibration taken during a hiccup (too slow) never hides on-time frames: the shorter wins.
  assert.equal(judge(lasting(2100, (i) => (i % 4 === 3 ? 45 : 16.7)), { vsync: 50 }).janky, true);
});

test('judgeFrames: junk samples never throw', () => {
  assert.equal(judgeFrames(undefined).janky, false);
  assert.equal(judgeFrames([null, { t: NaN, d: 3 }, { t: 5, d: -1 }]).janky, false);
});

test('decideQuality: one step down at a time, never up, unknown tiers count as high', () => {
  const janky = toSamples(lasting(2100, (i) => (i % 4 === 3 ? 45 : 16.7)));
  const smooth = toSamples(lasting(2100, () => 8.3));
  assert.equal(decideQuality(janky, 'high'), 'medium');
  assert.equal(decideQuality(janky, 'medium'), 'low');
  assert.equal(decideQuality(janky, 'low'), 'low'); // the floor
  assert.equal(decideQuality(smooth, 'medium'), 'medium');
  assert.equal(decideQuality(janky, 'turbo'), 'medium');
  assert.deepEqual(QUALITY, ['high', 'medium', 'low']);
});

// ---- createQualityMonitor (fake rAF clock) ---------------------------------------------------

function fakeClock() {
  let t = 1000;
  let queue = [];
  let id = 0;
  return {
    now: () => t,
    raf: (cb) => {
      queue.push({ id: ++id, cb });
      return id;
    },
    caf: (x) => {
      queue = queue.filter((q) => q.id !== x);
    },
    /** advance by `ms` and run one frame; `before` runs first, like a scroll event in that frame */
    frame(ms, before) {
      t += ms;
      before?.();
      const run = queue;
      queue = [];
      run.forEach((q) => q.cb(t));
    },
    idle(ms) {
      t += ms;
    },
    pending: () => queue.length,
  };
}

function monitor(options = {}) {
  const c = fakeClock();
  const changes = [];
  const m = createQualityMonitor({ ...c, onChange: (q) => changes.push(q), ...options });
  /** scroll through these frame intervals (a browser dispatches the scroll event in the frame,
   *  before its rAF callbacks) */
  const scroll = (intervals) => {
    m.activity();
    for (const ms of intervals) c.frame(ms, () => m.activity());
  };
  return { c, m, changes, scroll };
}

test('monitor: samples frame intervals only while scrolling, and idle gaps are never samples', () => {
  const { c, m, changes, scroll } = monitor();
  scroll(frames(31, 16.7));
  for (let i = 0; i < 20; i++) c.frame(16.7); // scrolling stopped: the loop winds down
  assert.equal(c.pending(), 0, 'no rAF while idle');
  c.idle(5000);
  scroll(frames(41, 16.7));
  assert.deepEqual(changes, []);
  assert.equal(m.tier(), 'high');
});

test('monitor: 5 isolated 300ms stalls among 200 smooth frames stay high', () => {
  for (const [ms, gap] of STALL_CASES) {
    const { m, changes, scroll } = monitor();
    scroll(isolatedStalls(ms, gap));
    scroll(isolatedStalls(ms, gap));
    assert.deepEqual(changes, [], `${ms}ms frames, a stall every ${gap}`);
    assert.equal(m.tier(), 'high');
  }
});

test('monitor: a burst after a stall (the GPU flush case) does not step down', () => {
  const { changes, scroll } = monitor();
  scroll(lasting(1500, () => 6.06));
  scroll([250, 160, ...frames(15, 30)]);
  scroll(lasting(3000, () => 6.06));
  assert.deepEqual(changes, []);
});

test('monitor: bursts of jank separated by pauses never add up (frames older than 2s drop out)', () => {
  const { c, changes, scroll } = monitor();
  const jank = lasting(1200, (i) => (i % 2 ? 40 : 16.7));
  for (let k = 0; k < 4; k++) {
    scroll(jank);
    for (let i = 0; i < 12; i++) c.frame(16.7); // the loop winds down
    c.idle(2500);
  }
  assert.deepEqual(changes, []);
});

test('monitor: sustained jank steps down one tier per 2s+, onChange once per step', () => {
  const { m, changes, scroll } = monitor();
  const jank = (ms) => scroll(lasting(ms, (i) => (i % 4 === 3 ? 45 : 16.7)));
  jank(1800);
  assert.deepEqual(changes, [], 'not yet 2s of jank');
  jank(500);
  assert.deepEqual(changes, ['medium']);
  jank(1500); // the samples start over after a step
  assert.deepEqual(changes, ['medium']);
  jank(1000);
  assert.deepEqual(changes, ['medium', 'low']);
  jank(5000);
  assert.deepEqual(changes, ['medium', 'low']);
  assert.equal(m.tier(), 'low');
});

test('monitor: a device slow on every frame (5 fps) steps down', () => {
  const { changes, scroll } = monitor();
  scroll(lasting(2600, () => 200));
  assert.deepEqual(changes, ['medium']);
});

test('monitor: one way back up per tier after 4s of clean scrolling, then the drop is final', () => {
  const memory = {};
  const { c, m, changes, scroll } = monitor({ memory });
  const jank = (ms) => scroll(lasting(ms, (i) => (i % 4 === 3 ? 45 : 16.7)));
  const smooth = (ms) => scroll(lasting(ms, () => 16.7));
  jank(2300);
  assert.deepEqual(changes, ['medium']);
  smooth(3000);
  assert.deepEqual(changes, ['medium'], 'not yet 4s clean');
  smooth(1500);
  assert.deepEqual(changes, ['medium', 'high'], 'a transient slow patch does not cost the extras for good');
  assert.deepEqual(memory, { tier: 'high', retried: ['medium'] });
  jank(2300);
  assert.deepEqual(changes, ['medium', 'high', 'medium']);
  smooth(10000);
  assert.deepEqual(changes, ['medium', 'high', 'medium'], 'stepped down to again: stays');
  assert.equal(m.tier(), 'medium');
  // A pause does not reset the clean count, a dirty window does.
  const b = monitor();
  const bj = (ms) => b.scroll(lasting(ms, (i) => (i % 4 === 3 ? 45 : 16.7)));
  bj(2300);
  b.scroll(lasting(2100, () => 16.7));
  for (let i = 0; i < 12; i++) b.c.frame(16.7);
  b.c.idle(8000);
  b.scroll(lasting(2100, () => 16.7));
  assert.deepEqual(b.changes, ['medium', 'high']);
  const d = monitor();
  const dj = (ms) => d.scroll(lasting(ms, (i) => (i % 4 === 3 ? 45 : 16.7)));
  dj(2300);
  d.scroll(lasting(2100, () => 16.7));
  d.scroll(lasting(2100, (i) => (i % 10 === 9 ? 40 : 16.7))); // 20% of the time over budget
  d.scroll(lasting(2100, () => 16.7));
  assert.deepEqual(d.changes, ['medium'], 'a dirty window starts the clean count over');
  void c;
});

test('monitor: memory carries the tier and its used retries to the next monitor (client navigation)', () => {
  const memory = { tier: 'medium', retried: ['medium'] };
  const { m, changes, scroll, c } = monitor({ memory });
  assert.equal(m.tier(), 'medium');
  scroll(lasting(9000, () => 16.7));
  assert.deepEqual(changes, [], 'its retry was used before');
  assert.equal(c.pending(), 1);
  const fresh = monitor({ memory: { tier: 'low' } });
  fresh.scroll(lasting(4500, () => 16.7));
  assert.deepEqual(fresh.changes, ['medium']);
});

test('monitor: sampling stops once no step is left', () => {
  const memory = { tier: 'low', retried: ['low'] };
  const { c, m } = monitor({ memory });
  m.activity();
  assert.equal(c.pending(), 0);
});

test('monitor: calibrate() measures the idle display rate, so uniformly slow scroll frames count', () => {
  const run = (displayMs, scrollMs) => {
    const { c, m, changes, scroll } = monitor();
    m.calibrate();
    for (let i = 0; i < 20; i++) c.frame(displayMs); // idle frames at the display rate
    assert.equal(c.pending(), 0, 'calibration ends on its own');
    scroll(lasting(2400, () => scrollMs));
    return changes;
  };
  assert.deepEqual(run(16.7, 33.3), ['medium'], '60 Hz display, every scroll frame 33ms');
  assert.deepEqual(run(33.3, 33.3), [], '30 Hz display (Low Power Mode)');
  assert.deepEqual(run(8.3, 16.7), [], '120 Hz display at 60fps');
});

test('monitor: starts from the remembered tier and stop() cancels the pending frame', () => {
  const { c, m } = monitor({ memory: { tier: 'medium' } });
  assert.equal(m.tier(), 'medium');
  m.activity();
  assert.equal(c.pending(), 1);
  m.calibrate();
  assert.equal(c.pending(), 2);
  m.stop();
  assert.equal(c.pending(), 0);
  m.activity();
  m.calibrate();
  assert.equal(c.pending(), 0, 'stopped for good');
});

test('TUNING: the documented thresholds', () => {
  assert.equal(TUNING.windowMs, 2000);
  assert.equal(TUNING.slices, 4);
  assert.equal(TUNING.stallMs, 150);
  assert.ok(TUNING.jankShare >= 0.15 && TUNING.jankShare <= 0.3);
});
