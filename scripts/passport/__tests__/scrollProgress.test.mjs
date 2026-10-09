import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scrollTarget,
  easeToward,
  createScrollProgress,
  TAU,
  MAX_DT,
  SNAP,
} from '../../../app/components/passport/useScrollProgress.js';

test('scrollTarget: 0 at the section top, 1 once the section bottom reaches the viewport bottom', () => {
  const m = { sectionTop: 1000, sectionHeight: 6000, viewportHeight: 1000 };
  assert.equal(scrollTarget({ ...m, scrollY: 1000 }), 0);
  assert.equal(scrollTarget({ ...m, scrollY: 3500 }), 0.5);
  assert.equal(scrollTarget({ ...m, scrollY: 6000 }), 1);
});

test('scrollTarget clamps before and after the section', () => {
  const m = { sectionTop: 1000, sectionHeight: 6000, viewportHeight: 1000 };
  assert.equal(scrollTarget({ ...m, scrollY: 0 }), 0);
  assert.equal(scrollTarget({ ...m, scrollY: -50 }), 0);
  assert.equal(scrollTarget({ ...m, scrollY: 99999 }), 1);
});

test('scrollTarget survives a section no taller than the viewport (no divide-by-zero)', () => {
  const t = scrollTarget({ scrollY: 10, sectionTop: 0, sectionHeight: 800, viewportHeight: 800 });
  assert.ok(Number.isFinite(t) && t >= 0 && t <= 1, String(t));
  assert.equal(scrollTarget({ scrollY: 10, sectionTop: 0, sectionHeight: 0, viewportHeight: 800 }), 1);
  assert.equal(scrollTarget({ scrollY: 0, sectionTop: 0, sectionHeight: 0, viewportHeight: 800 }), 0);
});

test('scrollTarget tolerates junk input', () => {
  assert.equal(scrollTarget({ scrollY: NaN, sectionTop: 0, sectionHeight: 5000, viewportHeight: 1000 }), 0);
  assert.equal(scrollTarget({}), 0);
});

// ---------------------------------------------------------------- time-based easing

// The eased value at fixed frame times for a target function target(t), frames every 1000/hz ms.
function follow(targetAt, { hz, until, tau, sampleEvery = 100 }) {
  const dt = 1000 / hz;
  let cur = targetAt(0);
  const out = new Map(); // sample time (ms, rounded) -> eased value
  for (let k = 1; k * dt <= until + 1e-9; k++) {
    const t = k * dt;
    cur = easeToward(cur, targetAt(t), dt, tau);
    const r = Math.round(t);
    if (Math.abs(t - r) < 1e-6 && r % sampleEvery === 0) out.set(r, cur);
  }
  return out;
}

test('easeToward: a wheel step lands in the same place after the same time at 30, 60 and 120 Hz', () => {
  const step = () => 1; // the target jumped 0 -> 1 at t = 0
  for (const tau of [TAU.wheel, TAU.touch]) {
    const runs = [30, 60, 120].map((hz) => follow(step, { hz, until: 600, tau }));
    for (const [t, ref] of runs[1]) {
      for (const run of [runs[0], runs[2]]) {
        assert.ok(Math.abs(run.get(t) - ref) <= 0.01, `tau ${tau} at ${t}ms: ${run.get(t)} vs ${ref} (60 Hz)`);
      }
      // ...and it is the exponential 1 - e^(-t / tau), independent of the frame rate
      if (ref < 1) assert.ok(Math.abs(ref - (1 - Math.exp(-t / tau))) < 1e-9, `${t}ms`);
    }
  }
});

test('easeToward: the old per-frame easing it replaces was not frame-rate independent', () => {
  // 9% of the gap per frame: after 100ms, 3 frames at 30 Hz but 12 at 120 Hz.
  const perFrame = (hz) => 1 - Math.pow(1 - 0.09, Math.round((100 * hz) / 1000));
  assert.ok(perFrame(120) - perFrame(30) > 0.4);
  const timed = (hz) => follow(() => 1, { hz, until: 100, tau: TAU.wheel }).get(100);
  assert.ok(Math.abs(timed(120) - timed(30)) <= 0.01);
});

test('easeToward: settles to 95% of a stop within 300ms (3 tau), wheel and touch, any frame rate', () => {
  for (const tau of [TAU.wheel, TAU.touch]) {
    assert.ok(3 * tau <= 300, `tau ${tau}`);
    for (const hz of [30, 60, 120]) {
      const dt = 1000 / hz;
      let cur = 0;
      let t = 0;
      while (cur < 0.95) {
        cur = easeToward(cur, 1, dt, tau);
        t += dt;
      }
      assert.ok(t <= 3 * tau + dt + 1e-9, `tau ${tau} @${hz}Hz: 95% after ${t.toFixed(1)}ms`);
    }
  }
});

test('easeToward: trails a steady scroll by tau minus half a frame at most, at 30, 60 and 120 Hz', () => {
  // Constant-speed scroll (a finger drag): the trail in time is lag / speed.
  for (const tau of [TAU.wheel, TAU.touch]) {
    for (const hz of [30, 60, 120]) {
      const dt = 1000 / hz;
      const speed = 0.0004; // progress per ms
      let cur = 0;
      let t = 0;
      for (let k = 0; k < Math.ceil(2000 / dt); k++) {
        t += dt;
        cur = easeToward(cur, speed * t, dt, tau);
      }
      const trail = (speed * t - cur) / speed;
      assert.ok(trail <= tau && trail >= tau - dt / 2 - 0.5, `tau ${tau} @${hz}Hz: trail ${trail.toFixed(1)}ms`);
    }
  }
  assert.ok(TAU.touch < TAU.wheel, 'touch follows the finger more tightly than wheel steps');
  assert.ok(TAU.wheel >= 60 && TAU.wheel <= 80 && TAU.touch >= 30 && TAU.touch <= 40);
});

test('easeToward: dt is capped at 50ms, so a stalled or backgrounded frame never jumps the book', () => {
  assert.equal(MAX_DT, 50);
  const capped = easeToward(0, 1, MAX_DT, TAU.wheel);
  assert.equal(easeToward(0, 1, 2000, TAU.wheel), capped);
  assert.equal(easeToward(0, 1, 51, TAU.wheel), capped);
  assert.ok(capped < 0.6, String(capped));
  // no time passed, nothing moves; junk dt is no time
  assert.equal(easeToward(0.3, 1, 0, TAU.wheel), 0.3);
  assert.equal(easeToward(0.3, 1, -5, TAU.wheel), 0.3);
  assert.equal(easeToward(0.3, 1, NaN, TAU.wheel), 0.3);
});

test('easeToward: snaps onto the target inside SNAP and never overshoots', () => {
  assert.equal(easeToward(0.99995, 1, 16.7, TAU.wheel), 1);
  assert.equal(easeToward(0.00005, 0, 16.7, TAU.wheel), 0);
  assert.equal(easeToward(0.2, 0.2, 16.7, TAU.wheel), 0.2);
  for (const [from, to] of [[0, 1], [1, 0], [0.3, 0.9], [0.9, 0.3]]) {
    let cur = from;
    let steps = 0;
    while (cur !== to && steps < 1000) {
      const next = easeToward(cur, to, 1000 / 60, TAU.wheel);
      assert.ok(Math.abs(next - to) <= Math.abs(cur - to), 'moved away from target');
      assert.ok(from < to ? next <= to : next >= to, 'overshot');
      cur = next;
      steps++;
    }
    assert.equal(cur, to);
    assert.ok(steps * (1000 / 60) < 1000, `took ${steps} frames to land`);
  }
  assert.ok(SNAP > 0 && SNAP <= 1e-4);
});

// ---------------------------------------------------------------- controller (the hook's core)


// Fake browser: manual rAF queue with a fake clock (frames get rAF timestamps), mutable
// scroll/viewport/visibility.
function harness(init = {}) {
  const env = { scrollY: 0, hidden: false, top: 1000, height: 6000, vh: 1000, queue: [], nextId: 1, now: 1000, ...init };
  const raf = (cb) => {
    const id = env.nextId++;
    env.queue.push({ id, cb });
    return id;
  };
  const caf = (id) => {
    env.queue = env.queue.filter((e) => e.id !== id);
  };
  // One display frame `ms` after the previous one.
  const step = (ms = 1000 / 60) => {
    env.now += ms;
    const batch = env.queue;
    env.queue = [];
    batch.forEach((e) => e.cb(env.now));
  };
  const settle = (max = 2000, ms) => {
    let n = 0;
    while (env.queue.length && n < max) { step(ms); n++; }
    return n;
  };
  const make = (onFrame, extra = {}) => createScrollProgress({
    measure: () => ({ top: env.top, height: env.height }),
    viewport: () => ({ scrollY: env.scrollY, height: env.vh }),
    isHidden: () => env.hidden,
    raf,
    caf,
    onFrame,
    ...extra,
  });
  return { env, step, settle, make };
}
const recorder = () => {
  const calls = [];
  const fn = (p) => calls.push(p);
  fn.calls = calls;
  return fn;
};

test('controller: start() measures and snaps straight to the current scroll position', () => {
  const h = harness({ scrollY: 3500 });
  const a = recorder();
  const c = h.make(a);
  assert.equal(a.calls.length, 0);
  c.start();
  assert.deepEqual(a.calls, [0.5]);
  assert.equal(c.current(), 0.5);
  assert.equal(h.env.queue.length, 0, 'no rAF scheduled when already settled');
});

test('controller: scrolling eases toward the target over rAF frames, lands exactly, then goes idle', () => {
  const h = harness();
  const a = recorder();
  const c = h.make(a);
  c.start();
  h.env.scrollY = 6000; // target 1
  c.sync();
  assert.equal(a.calls.length, 1, 'visible tabs do not render synchronously on scroll');
  assert.equal(h.env.queue.length, 1);
  h.settle();
  assert.equal(a.calls.at(-1), 1);
  for (let i = 2; i < a.calls.length; i++) assert.ok(a.calls[i] > a.calls[i - 1], 'monotone');
  assert.ok(a.calls.length > 20 && a.calls.length < 200, `${a.calls.length} frames`);
  assert.equal(h.env.queue.length, 0, 'idle once settled');
  const n = a.calls.length;
  h.step();
  assert.equal(a.calls.length, n, 'no frames while idle');
});

test('controller: swapping the callback at a settled p calls the new one exactly once with the current p', () => {
  const h = harness({ scrollY: 3500 });
  const a = recorder();
  const b = recorder();
  const c = h.make(a);
  c.start();
  assert.deepEqual(a.calls, [0.5]);
  c.setOnFrame(b);
  assert.deepEqual(b.calls, [0.5], 'new callback re-poses immediately');
  assert.deepEqual(a.calls, [0.5], 'old callback is not called again');
  assert.equal(h.env.queue.length, 0, 'does not start a rAF loop');
  h.settle();
  assert.deepEqual(b.calls, [0.5], 'and nothing more follows');
});

test('controller: swapping the callback mid-flight re-poses once, then only the new callback gets frames', () => {
  const h = harness();
  const a = recorder();
  const b = recorder();
  const c = h.make(a);
  c.start();
  h.env.scrollY = 6000;
  c.sync();
  h.step();
  h.step();
  const aBefore = a.calls.length;
  const at = c.current();
  assert.ok(at > 0 && at < 1);
  c.setOnFrame(b);
  assert.deepEqual(b.calls, [at]);
  h.settle();
  assert.equal(a.calls.length, aBefore, 'old callback got nothing more');
  assert.ok(b.calls.length > 1);
  assert.equal(b.calls.at(-1), 1);
});

test('controller: a callback set before start() is not called until start()', () => {
  const h = harness({ scrollY: 1000 });
  const a = recorder();
  const b = recorder();
  const c = h.make(a);
  c.setOnFrame(b);
  assert.equal(b.calls.length, 0);
  c.start();
  assert.deepEqual(b.calls, [0]);
  assert.equal(a.calls.length, 0);
});

test('controller: hidden tab snaps and calls onFrame immediately on every sync (rAF is paused there)', () => {
  const h = harness({ hidden: true });
  const a = recorder();
  const c = h.make(a);
  c.start();
  h.env.scrollY = 3500;
  c.sync();
  assert.deepEqual(a.calls, [0, 0.5]);
  h.env.scrollY = 6000;
  c.sync();
  assert.deepEqual(a.calls, [0, 0.5, 1]);
  assert.equal(h.env.queue.length, 0);
});

test('controller: remeasure() picks up a new section height and recomputes the target', () => {
  const h = harness({ scrollY: 3500, hidden: true });
  const a = recorder();
  const c = h.make(a);
  c.start();
  assert.equal(a.calls.at(-1), 0.5);
  h.env.height = 3000; // range 2000 -> (3500-1000)/2000 clamps to 1
  c.remeasure();
  assert.equal(a.calls.at(-1), 1);
  h.env.vh = 500; // range 2500 -> 2500/2500 = 1; now scroll to the middle
  h.env.scrollY = 2250;
  c.remeasure();
  assert.equal(a.calls.at(-1), 0.5);
});

test('controller: stop() cancels the pending frame and silences everything after', () => {
  const h = harness();
  const a = recorder();
  const c = h.make(a);
  c.start();
  h.env.scrollY = 6000;
  c.sync();
  assert.equal(h.env.queue.length, 1);
  c.stop();
  assert.equal(h.env.queue.length, 0);
  const n = a.calls.length;
  c.sync();
  c.remeasure();
  c.setOnFrame(recorder());
  h.settle();
  assert.equal(a.calls.length, n);
});

test('controller: sync/remeasure before start() are harmless', () => {
  const h = harness({ scrollY: 3500 });
  const a = recorder();
  const c = h.make(a);
  c.sync();
  c.remeasure();
  assert.equal(a.calls.length, 0);
  c.start();
  assert.deepEqual(a.calls, [0.5]);
});

// -------------------------------------------------- controller: time-based, frame-rate independent

// Eased progress sampled every 100ms after a scroll to `scrollY`, at `hz`, after a warm-up scroll
// at the same rate (the controller learns the display's frame interval for a run's first frame).
function runAt(hz, { input, scrollY = 6000, until = 500 } = {}) {
  const ms = 1000 / hz;
  const h = harness();
  const a = recorder();
  const c = h.make(a);
  c.start();
  if (input) c.setInput(input);
  h.env.scrollY = 2000; // warm-up: a scroll at this frame rate, settled
  c.sync();
  h.settle(2000, ms);
  const from = c.current();
  h.env.scrollY = scrollY;
  c.sync();
  const out = [];
  for (let k = 1; k * ms <= until + 1e-9; k++) {
    h.step(ms);
    const t = k * ms;
    if (Math.abs(t - Math.round(t)) < 1e-6 && Math.round(t) % 100 === 0) out.push([Math.round(t), c.current()]);
  }
  return { from, out };
}

test('controller: a scroll lands in the same place after the same time at 30, 60 and 120 Hz', () => {
  for (const input of ['wheel', 'touch']) {
    const [r30, r60, r120] = [30, 60, 120].map((hz) => runAt(hz, { input }));
    assert.equal(r30.from, r60.from);
    assert.equal(r60.out.length, 5);
    r60.out.forEach(([t, p], i) => {
      for (const r of [r30, r120]) {
        assert.equal(r.out[i][0], t);
        assert.ok(Math.abs(r.out[i][1] - p) <= 0.01 * (1 - r60.from), `${input} @${t}ms: ${r.out[i][1]} vs ${p}`);
      }
    });
  }
});

test('controller: touch input follows more tightly than wheel / mouse / keyboard', () => {
  const at100 = (input) => {
    const r = runAt(60, { input, until: 100 });
    return { from: r.from, p: r.out[0][1] };
  };
  const wheel = at100('wheel');
  const touch = at100('touch');
  assert.ok(touch.p > wheel.p, `${touch.p} vs ${wheel.p}`);
  assert.equal(at100('pen?').p, wheel.p, 'unknown input kinds ease like the wheel');
  // 100ms after the scroll: 1 - e^(-100 / tau) of the way there
  for (const [r, tau] of [[wheel, TAU.wheel], [touch, TAU.touch]]) {
    const expected = r.from + (1 - r.from) * (1 - Math.exp(-100 / tau));
    assert.ok(Math.abs(r.p - expected) < 1e-3, `${r.p} vs ${expected}`);
  }
});

test('controller: a long gap between frames (tab switch, stall) moves no more than a 50ms frame', () => {
  const h = harness();
  const a = recorder();
  const c = h.make(a);
  c.start();
  h.env.scrollY = 6000;
  c.sync();
  h.step(1000 / 60); // the first frame of the run
  const p1 = c.current();
  h.step(2000);
  const p2 = c.current();
  const capped = easeToward(p1, 1, MAX_DT, TAU.wheel);
  assert.ok(Math.abs(p2 - capped) < 1e-12, `${p2} vs ${capped}`);
  h.settle();
  assert.equal(c.current(), 1);
});

test('controller: frames without a timestamp still ease (one learned frame each)', () => {
  const h = harness();
  const a = recorder();
  const c = h.make(a);
  c.start();
  h.env.scrollY = 6000;
  c.sync();
  const batch = h.env.queue;
  h.env.queue = [];
  batch.forEach((e) => e.cb()); // an engine that passes no rAF timestamp
  assert.ok(Math.abs(c.current() - easeToward(0, 1, 1000 / 60, TAU.wheel)) < 1e-12);
  let n = 0;
  while (h.env.queue.length && n++ < 1000) {
    const b = h.env.queue;
    h.env.queue = [];
    b.forEach((e) => e.cb());
  }
  assert.equal(c.current(), 1);
});
