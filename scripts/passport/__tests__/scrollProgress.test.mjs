import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scrollTarget, easeStep } from '../../../app/components/passport/useScrollProgress.js';

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
