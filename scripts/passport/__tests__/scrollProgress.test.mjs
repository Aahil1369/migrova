import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrollTarget, easeStep, createScrollProgress } from '../../../app/components/passport/useScrollProgress.js';

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

test('easeStep moves a fraction of the way and snaps inside 1e-4', () => {
  assert.ok(Math.abs(easeStep(0, 1, 0.09) - 0.09) < 1e-12);
  assert.ok(Math.abs(easeStep(0.5, 0, 0.1) - 0.45) < 1e-12);
  assert.equal(easeStep(0.99995, 1, 0.09), 1);
  assert.equal(easeStep(0.2, 0.2, 0.09), 0.2);
  assert.equal(easeStep(0.00005, 0, 0.09), 0);
});

test('easeStep converges to the target from any start without overshooting', () => {
  for (const [from, to] of [[0, 1], [1, 0], [0.3, 0.9], [0.9, 0.3]]) {
    let cur = from;
    let steps = 0;
    while (cur !== to && steps < 1000) {
      const next = easeStep(cur, to, 0.09);
      assert.ok(Math.abs(next - to) <= Math.abs(cur - to), 'moved away from target');
      assert.ok(from < to ? next <= to : next >= to, 'overshot');
      cur = next;
      steps++;
    }
    assert.equal(cur, to);
    assert.ok(steps < 300, `took ${steps} steps`);
  }
});

// ---------------------------------------------------------------- controller (the hook's core)


// Fake browser: manual rAF queue + mutable scroll/viewport/visibility.
function harness(init = {}) {
  const env = { scrollY: 0, hidden: false, top: 1000, height: 6000, vh: 1000, queue: [], nextId: 1, ...init };
  const raf = (cb) => {
    const id = env.nextId++;
    env.queue.push({ id, cb });
    return id;
  };
  const caf = (id) => {
    env.queue = env.queue.filter((e) => e.id !== id);
  };
  const step = () => {
    const batch = env.queue;
    env.queue = [];
    batch.forEach((e) => e.cb());
  };
  const settle = (max = 2000) => {
    let n = 0;
    while (env.queue.length && n < max) { step(); n++; }
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
