import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUALITY,
  createQualityMonitor,
  decideQuality,
  frameStats,
} from '../../../app/components/passport/quality.js';

const frames = (n, ms) => Array.from({ length: n }, () => ms);
// n frames at `ms`, with every k-th one taking `slow` ms instead.
const mixed = (n, ms, k, slow) => Array.from({ length: n }, (_, i) => (i % k === k - 1 ? slow : ms));

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

// ---- decideQuality ---------------------------------------------------------------------------

test('decideQuality: too few active frames -> no decision', () => {
  assert.equal(decideQuality(frames(59, 80), 'high'), 'high');
});

test('decideQuality: on-time 60 Hz frames keep high', () => {
  assert.equal(decideQuality(frames(60, 16.7), 'high'), 'high');
  assert.equal(decideQuality(mixed(120, 16.7, 25, 40), 'high'), 'high'); // 4% slow: p95 fine
});

test('decideQuality: p95 clearly over ~25ms over >= 60 frames drops one step at a time', () => {
  const janky = mixed(60, 16.7, 5, 40); // 20% of frames at 40ms
  assert.equal(decideQuality(janky, 'high'), 'medium');
  assert.equal(decideQuality(janky, 'medium'), 'low');
  assert.equal(decideQuality(janky, 'low'), 'low'); // the floor
});

test('decideQuality: never upgrades', () => {
  assert.equal(decideQuality(frames(200, 8.3), 'medium'), 'medium');
  assert.equal(decideQuality(frames(200, 16.7), 'low'), 'low');
});

test('decideQuality: refresh rate is normalised (120 Hz half-rate and 30 Hz low-power are not jank)', () => {
  // 120 Hz phone dropping every other frame: 16.7ms frames are still 60fps-smooth.
  assert.equal(decideQuality(mixed(120, 8.3, 2, 16.7), 'high'), 'high');
  // iPhone Low Power Mode caps rAF at 30 Hz: steady 33ms frames are the display, not jank...
  assert.equal(decideQuality(frames(120, 33.3), 'high'), 'high');
  // ...but missing frames there (66ms) still counts.
  assert.equal(decideQuality(mixed(120, 33.3, 4, 66.7), 'high'), 'medium');
  // A 60 Hz device that mostly manages 30fps (some frames on time) is struggling.
  assert.equal(decideQuality(mixed(120, 33.3, 4, 16.7), 'high'), 'medium');
  // 120 Hz with real long frames (> 25ms) drops too.
  assert.equal(decideQuality(mixed(120, 8.3, 6, 33.3), 'high'), 'medium');
});

test('decideQuality: a known display rate catches a device that is slow on every frame', () => {
  // Every frame 33ms looks like a 30 Hz display from the frames alone...
  assert.equal(decideQuality(frames(120, 33.3), 'high'), 'high');
  // ...but on a display calibrated at 60 Hz it is a struggling device,
  assert.equal(decideQuality(frames(120, 33.3), 'high', { vsync: 16.7 }), 'medium');
  // and on a calibrated 30 Hz display it is fine.
  assert.equal(decideQuality(frames(120, 33.3), 'high', { vsync: 33.3 }), 'high');
  // A calibration taken during a hiccup (too slow) never hides on-time frames: min() wins.
  assert.equal(decideQuality(mixed(120, 16.7, 5, 40), 'high', { vsync: 50 }), 'medium');
});

test('decideQuality: unknown tiers are treated as high', () => {
  assert.equal(decideQuality(mixed(60, 16.7, 5, 40), 'turbo'), 'medium');
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
    /** advance by `ms` and run one frame */
    frame(ms) {
      t += ms;
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

test('monitor: samples frame intervals only while scrolling, and idle gaps are never samples', () => {
  const c = fakeClock();
  const changes = [];
  const m = createQualityMonitor({ ...c, onChange: (q) => changes.push(q) });
  // 30 smooth frames of scrolling, then 5 seconds idle, then 40 more: 69 intervals, all 16.7ms.
  for (let i = 0; i < 31; i++) {
    m.activity();
    c.frame(16.7);
  }
  for (let i = 0; i < 20; i++) c.frame(16.7); // scrolling stopped: the loop winds down
  assert.equal(c.pending(), 0, 'no rAF while idle');
  c.idle(5000);
  for (let i = 0; i < 41; i++) {
    m.activity();
    c.frame(16.7);
  }
  assert.deepEqual(changes, []);
  assert.equal(m.tier(), 'high');
});

test('monitor: steady jank while scrolling drops one tier per 60+ frames, onChange once per step', () => {
  const c = fakeClock();
  const changes = [];
  const m = createQualityMonitor({ ...c, onChange: (q) => changes.push(q) });
  const scroll = (n) => {
    for (let i = 0; i < n; i++) {
      m.activity();
      c.frame(i % 4 === 3 ? 45 : 16.7);
    }
  };
  scroll(70);
  assert.deepEqual(changes, ['medium']);
  scroll(30); // the window restarts after a change: not enough new frames yet
  assert.deepEqual(changes, ['medium']);
  scroll(50);
  assert.deepEqual(changes, ['medium', 'low']);
  scroll(200);
  assert.deepEqual(changes, ['medium', 'low']);
  assert.equal(c.pending(), 0, 'at the lowest tier sampling stops');
});

test('monitor: a long frame in the middle of a scroll counts (it is jank, not idle)', () => {
  const c = fakeClock();
  const changes = [];
  const m = createQualityMonitor({ ...c, onChange: (q) => changes.push(q) });
  for (let i = 0; i < 80; i++) {
    m.activity();
    c.frame(i % 8 === 7 ? 220 : 16.7); // 12.5% of frames are 220ms stalls
  }
  assert.deepEqual(changes, ['medium']);
});

test('monitor: calibrate() measures the idle display rate, so uniformly slow scroll frames count', () => {
  const run = (displayMs, scrollMs) => {
    const c = fakeClock();
    const changes = [];
    const m = createQualityMonitor({ ...c, onChange: (q) => changes.push(q) });
    m.calibrate();
    for (let i = 0; i < 20; i++) c.frame(displayMs); // idle frames at the display rate
    assert.equal(c.pending(), 0, 'calibration ends on its own');
    for (let i = 0; i < 80; i++) {
      m.activity();
      c.frame(scrollMs);
    }
    return changes;
  };
  assert.deepEqual(run(16.7, 33.3), ['medium'], '60 Hz display, every scroll frame 33ms');
  assert.deepEqual(run(33.3, 33.3), [], '30 Hz display (Low Power Mode)');
  assert.deepEqual(run(8.3, 16.7), [], '120 Hz display at 60fps');
});

test('monitor: starts from a given tier and stop() cancels the pending frame', () => {
  const c = fakeClock();
  const m = createQualityMonitor({ ...c, tier: 'medium', onChange: () => {} });
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
