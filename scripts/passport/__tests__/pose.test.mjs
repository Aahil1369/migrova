import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, buildTimeline } from '../../../app/components/passport/timeline.js';
import { desktopPose, notepadPose, easeInOutCubic } from '../../../app/components/passport/pose.js';

const t = buildTimeline();
const R = t.ranges;
const at = (beat, local) => R[beat][0] + local * (R[beat][1] - R[beat][0]);
const mid = (beat) => at(beat, 0.5);
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const idx = (page) => PAGES.indexOf(page);

// ---------------------------------------------------------------- desktop

test('p=0: closed book, hero fully visible', () => {
  const d = desktopPose(t, 0);
  assert.deepEqual(d.leaves, [0, 0, 0, 0]);
  assert.equal(d.shift, 1);
  assert.equal(d.heroOpacity, 1);
  assert.equal(d.finaleOpacity, 0);
  assert.equal(d.sky, 0);
  assert.equal(d.coverLight, 0);
  assert.equal(d.flap, 0);
  assert.equal(d.uvDim, 0);
  assert.equal(d.bonVoyage, false);
  assert.equal(d.blessing, false);
});

test('closed book is tilted like the prototype and squares up when open', () => {
  const closed = desktopPose(t, 0);
  assert.ok(closed.tiltX > 0, `tiltX ${closed.tiltX}`);
  assert.ok(closed.tiltY < 0, `tiltY ${closed.tiltY}`);
  assert.ok(closed.scale < 1 && closed.scale >= 0.9, `scale ${closed.scale}`);
  const open = desktopPose(t, mid('spread2'));
  assert.equal(open.tiltX, 0);
  assert.equal(open.tiltY, 0);
  assert.equal(open.scale, 1);
  assert.equal(open.shift, 0);
});

test('middle of spread2: first two leaves turned, last two still on the right', () => {
  assert.deepEqual(desktopPose(t, mid('spread2')).leaves, [-180, -180, 0, 0]);
});

test('every spread shows the leaves it should', () => {
  assert.deepEqual(desktopPose(t, mid('spread1')).leaves, [-180, 0, 0, 0]);
  assert.deepEqual(desktopPose(t, mid('spread3')).leaves, [-180, -180, -180, 0]);
  assert.deepEqual(desktopPose(t, mid('uv')).leaves, [-180, -180, -180, 0]);
  assert.deepEqual(desktopPose(t, mid('spread4')).leaves, [-180, -180, -180, -180]);
});

test('end of closing: every leaf back on the right, book back to the right of centre', () => {
  const d = desktopPose(t, R.closing[1]);
  assert.deepEqual(d.leaves, [0, 0, 0, 0]);
  assert.equal(d.shift, 1);
  assert.ok(d.tiltX > 0 && d.tiltY < 0 && d.scale < 1);
});

test('p=1: finale is fully shown, sky is daylight, the cover is stamped and blessed', () => {
  const d = desktopPose(t, 1);
  assert.equal(d.finaleOpacity, 1);
  assert.equal(d.sky, 1);
  assert.equal(d.heroOpacity, 0);
  assert.equal(d.shift, 1);
  assert.deepEqual(d.leaves, [0, 0, 0, 0]);
  assert.ok(d.bonVoyage && d.blessing);
});

test('leaf0: ajar 0 -> -35, then open -35 -> -180, non-increasing across both', () => {
  assert.equal(desktopPose(t, R.ajar[0]).leaves[0], 0);
  assert.equal(desktopPose(t, R.ajar[1]).leaves[0], -35);
  assert.equal(desktopPose(t, R.open[1]).leaves[0], -180);
  const from = R.ajar[0];
  const to = R.open[1];
  let prev = Infinity;
  for (let i = 0; i <= 50; i++) {
    const a = desktopPose(t, from + ((to - from) * i) / 50).leaves[0];
    assert.ok(a <= prev + 1e-12, `sample ${i}: ${a} rose above ${prev}`);
    assert.ok(a <= 0 && a >= -180, `sample ${i}: ${a} out of range`);
    prev = a;
  }
  // eased, not linear: a quarter of the way into ajar is well short of a quarter of the way to -35
  assert.ok(desktopPose(t, at('ajar', 0.25)).leaves[0] > -35 * 0.25);
});

test('flip beats turn their own leaf with easeInOutCubic and leave the others alone', () => {
  assert.equal(desktopPose(t, R.flip1[0]).leaves[1], 0);
  assert.equal(desktopPose(t, R.flip1[1]).leaves[1], -180);
  assert.ok(near(desktopPose(t, at('flip1', 0.25)).leaves[1], -180 * easeInOutCubic(0.25)));
  assert.ok(near(desktopPose(t, mid('flip1')).leaves[1], -90));
  const f1 = desktopPose(t, mid('flip1')).leaves;
  assert.deepEqual([f1[0], f1[2], f1[3]], [-180, 0, 0]);
  const f2 = desktopPose(t, mid('flip2')).leaves;
  assert.ok(near(f2[2], -90));
  assert.deepEqual([f2[0], f2[1], f2[3]], [-180, -180, 0]);
  const f3 = desktopPose(t, mid('flip3')).leaves;
  assert.ok(near(f3[3], -90));
  assert.deepEqual([f3[0], f3[1], f3[2]], [-180, -180, -180]);
});

test('closing returns the leaves in order 3,2,1,0 over their sub-windows', () => {
  const L = (lc) => desktopPose(t, at('closing', lc)).leaves;
  // before each window starts, that leaf is still open
  assert.ok(near(L(0)[3], -180));
  assert.ok(near(L(0.1)[2], -180) && near(L(0.1)[1], -180) && near(L(0.1)[0], -180));
  assert.ok(near(L(0.15)[2], -180));
  assert.ok(near(L(0.3)[1], -180));
  assert.ok(near(L(0.45)[0], -180));
  // after each window ends, that leaf is home
  assert.ok(near(L(0.55)[3], 0));
  assert.ok(near(L(0.7)[2], 0));
  assert.ok(near(L(0.85)[1], 0));
  assert.ok(near(L(1)[0], 0));
  // mid-window: halfway through its eased turn, leaf3 is at -90
  assert.ok(near(L(0.275)[3], -90));
  // ordering: at every sample, leaf3 is at least as far home as leaf2, leaf2 as leaf1, leaf1 as leaf0
  for (let i = 0; i <= 100; i++) {
    const [a0, a1, a2, a3] = L(i / 100);
    assert.ok(a3 >= a2 - 1e-9 && a2 >= a1 - 1e-9 && a1 >= a0 - 1e-9, `order broken at ${i}%: ${[a0, a1, a2, a3]}`);
  }
});

test('shift: 1 in arrival, eases to 0 across ajar+open, holds 0 until closing midpoint, back to 1 by closing end', () => {
  assert.equal(desktopPose(t, mid('arrival')).shift, 1);
  assert.equal(desktopPose(t, R.ajar[0]).shift, 1);
  assert.equal(desktopPose(t, R.open[1]).shift, 0);
  for (const beat of ['spread1', 'flip1', 'spread2', 'flip2', 'spread3', 'uv', 'flip3', 'spread4']) {
    assert.equal(desktopPose(t, mid(beat)).shift, 0, beat);
  }
  assert.equal(desktopPose(t, at('closing', 0.5)).shift, 0);
  assert.equal(desktopPose(t, R.closing[1]).shift, 1);
  assert.equal(desktopPose(t, mid('finale')).shift, 1);
  // monotone down over ajar+open, monotone up over the second half of closing
  let prev = 1;
  for (let i = 0; i <= 50; i++) {
    const s = desktopPose(t, R.ajar[0] + ((R.open[1] - R.ajar[0]) * i) / 50).shift;
    assert.ok(s <= prev + 1e-12, `down ${i}: ${s} > ${prev}`);
    prev = s;
  }
  prev = 0;
  for (let i = 0; i <= 50; i++) {
    const s = desktopPose(t, at('closing', 0.5 + i / 100)).shift;
    assert.ok(s >= prev - 1e-12, `up ${i}: ${s} < ${prev}`);
    prev = s;
  }
});

test('tilt and scale follow the same curve as shift', () => {
  for (const p of [0, at('ajar', 0.5), R.open[0], mid('open'), at('closing', 0.75), 1]) {
    const d = desktopPose(t, p);
    assert.ok(near(d.tiltX, 8 * d.shift, 1e-9), `tiltX at ${p}`);
    assert.ok(near(d.tiltY, -14 * d.shift, 1e-9), `tiltY at ${p}`);
    assert.ok(near(d.scale, 1 - 0.08 * d.shift, 1e-9), `scale at ${p}`);
  }
});

test('coverLight: 0 -> 1 across ajar, back to 0 across open, 0 elsewhere', () => {
  assert.equal(desktopPose(t, 0).coverLight, 0);
  assert.equal(desktopPose(t, mid('arrival')).coverLight, 0);
  assert.ok(near(desktopPose(t, mid('ajar')).coverLight, 0.5));
  assert.equal(desktopPose(t, R.ajar[1]).coverLight, 1);
  assert.ok(near(desktopPose(t, mid('open')).coverLight, 0.5));
  assert.equal(desktopPose(t, R.open[1]).coverLight, 0);
  for (const beat of ['spread1', 'flip2', 'uv', 'spread4', 'closing', 'finale']) {
    assert.equal(desktopPose(t, mid(beat)).coverLight, 0, beat);
  }
});

test('flap/uvDim: rise over the first 20% of uv, hold, fall over the last 15%, 0 elsewhere', () => {
  const m = desktopPose(t, mid('uv'));
  assert.equal(m.flap, 1);
  assert.equal(m.uvDim, 1);
  assert.equal(desktopPose(t, R.uv[0]).flap, 0);
  assert.equal(desktopPose(t, R.uv[1]).flap, 0);
  assert.ok(near(desktopPose(t, at('uv', 0.1)).flap, 0.5));
  assert.equal(desktopPose(t, at('uv', 0.2)).flap, 1);
  assert.equal(desktopPose(t, at('uv', 0.85)).flap, 1);
  assert.ok(near(desktopPose(t, at('uv', 1 - 0.075)).uvDim, 0.5));
  for (const beat of ['spread3', 'flip3', 'spread1', 'closing', 'finale']) {
    const d = desktopPose(t, mid(beat));
    assert.equal(d.flap, 0, beat);
    assert.equal(d.uvDim, 0, beat);
  }
});

test('sky: 0 before spread3, linear to 1 at the end of closing, 1 in finale', () => {
  assert.equal(desktopPose(t, 0).sky, 0);
  assert.equal(desktopPose(t, mid('spread2')).sky, 0);
  assert.equal(desktopPose(t, R.spread3[0]).sky, 0);
  assert.equal(desktopPose(t, R.closing[1]).sky, 1);
  assert.equal(desktopPose(t, mid('finale')).sky, 1);
  const a = R.spread3[0];
  const b = R.closing[1];
  assert.ok(near(desktopPose(t, (a + b) / 2).sky, 0.5, 1e-9));
  assert.ok(near(desktopPose(t, a + (b - a) * 0.25).sky, 0.25, 1e-9));
  let prev = 0;
  for (let i = 0; i <= 200; i++) {
    const s = desktopPose(t, i / 200).sky;
    assert.ok(s >= prev, `sky dipped at ${i}`);
    prev = s;
  }
});

test('heroOpacity: 1 -> 0 across the first 70% of ajar; finaleOpacity: 0 -> 1 across the first 60% of finale', () => {
  assert.equal(desktopPose(t, mid('arrival')).heroOpacity, 1);
  assert.equal(desktopPose(t, R.ajar[0]).heroOpacity, 1);
  assert.ok(near(desktopPose(t, at('ajar', 0.35)).heroOpacity, 0.5));
  assert.ok(near(desktopPose(t, at('ajar', 0.7)).heroOpacity, 0, 1e-9));
  assert.equal(desktopPose(t, R.ajar[1]).heroOpacity, 0);
  assert.equal(desktopPose(t, mid('spread3')).heroOpacity, 0);

  assert.equal(desktopPose(t, mid('closing')).finaleOpacity, 0);
  assert.equal(desktopPose(t, R.finale[0]).finaleOpacity, 0);
  assert.ok(near(desktopPose(t, at('finale', 0.3)).finaleOpacity, 0.5));
  assert.ok(near(desktopPose(t, at('finale', 0.6)).finaleOpacity, 1, 1e-9));
  assert.equal(desktopPose(t, 1).finaleOpacity, 1);
});

test('bonVoyage at localT(closing) >= 0.9, blessing at >= 0.95, both held through finale', () => {
  const f = (lc) => desktopPose(t, at('closing', lc));
  assert.equal(f(0.89).bonVoyage, false);
  assert.equal(f(0.89).blessing, false);
  assert.equal(f(0.92).bonVoyage, true);
  assert.equal(f(0.92).blessing, false);
  assert.equal(f(0.96).bonVoyage, true);
  assert.equal(f(0.96).blessing, true);
  assert.equal(f(0).bonVoyage, false);
  const fin = desktopPose(t, R.finale[0]);
  assert.ok(fin.bonVoyage && fin.blessing);
  const end = desktopPose(t, 1);
  assert.ok(end.bonVoyage && end.blessing);
});

test('output is clean: no NaN, no -0, ranges respected, over 2000 samples (and bad input)', () => {
  const check = (p) => {
    const d = desktopPose(t, p);
    const nums = { shift: d.shift, scale: d.scale, tiltX: d.tiltX, tiltY: d.tiltY, coverLight: d.coverLight, flap: d.flap, uvDim: d.uvDim, sky: d.sky, heroOpacity: d.heroOpacity, finaleOpacity: d.finaleOpacity };
    d.leaves.forEach((a, i) => { nums[`leaf${i}`] = a; });
    assert.equal(d.leaves.length, 4);
    for (const [k, v] of Object.entries(nums)) {
      assert.ok(Number.isFinite(v), `${k} not finite at ${p}`);
      assert.ok(!Object.is(v, -0), `${k} is -0 at ${p}`);
    }
    for (const k of ['shift', 'coverLight', 'flap', 'uvDim', 'sky', 'heroOpacity', 'finaleOpacity']) {
      assert.ok(nums[k] >= 0 && nums[k] <= 1, `${k}=${nums[k]} at ${p}`);
    }
    d.leaves.forEach((a) => assert.ok(a <= 0 && a >= -180, `leaf ${a} at ${p}`));
    assert.equal(typeof d.bonVoyage, 'boolean');
    assert.equal(typeof d.blessing, 'boolean');
  };
  for (let i = 0; i <= 2000; i++) check(i / 2000);
  for (const bad of [-5, 7, NaN, undefined]) check(bad);
  assert.deepEqual(desktopPose(t, -5), desktopPose(t, 0));
  assert.deepEqual(desktopPose(t, 7), desktopPose(t, 1));
  assert.deepEqual(desktopPose(t, NaN), desktopPose(t, 0));
});

// ---------------------------------------------------------------- notepad

test('notepad: first half of a spread shows its left page, second half its right page', () => {
  assert.equal(notepadPose(t, at('spread1', 0.25)).page, idx('notice'));
  assert.equal(notepadPose(t, at('spread1', 0.75)).page, idx('data'));
  assert.equal(notepadPose(t, at('spread2', 0.25)).page, idx('visas1'));
  assert.equal(notepadPose(t, at('spread2', 0.75)).page, idx('visas2'));
  assert.equal(notepadPose(t, at('spread3', 0.25)).page, idx('entries'));
  assert.equal(notepadPose(t, at('spread3', 0.75)).page, idx('sources'));
  assert.equal(notepadPose(t, at('spread4', 0.25)).page, idx('travellers'));
  assert.equal(notepadPose(t, at('spread4', 0.75)).page, idx('observations'));
  for (const beat of ['spread1', 'spread2', 'spread3', 'spread4']) {
    assert.equal(notepadPose(t, at(beat, 0.25)).flip, 0, beat);
    assert.equal(notepadPose(t, at(beat, 0.75)).flip, 0, beat);
  }
});

test('notepad: a spread flips its left page away across the middle 20% (localT 0.4..0.6)', () => {
  const left = idx('notice');
  const right = idx('data');
  assert.deepEqual([notepadPose(t, at('spread1', 0.39)).page, notepadPose(t, at('spread1', 0.39)).flip], [left, 0]);
  const a = notepadPose(t, at('spread1', 0.4));
  assert.equal(a.page, left);
  assert.ok(near(a.flip, 0, 1e-9));
  const b = notepadPose(t, at('spread1', 0.5));
  assert.equal(b.page, left);
  assert.ok(near(b.flip, 0.5, 1e-9));
  const c = notepadPose(t, at('spread1', 0.59));
  assert.equal(c.page, left);
  assert.ok(c.flip > 0.9 && c.flip < 1);
  assert.deepEqual([notepadPose(t, at('spread1', 0.6)).page, notepadPose(t, at('spread1', 0.6)).flip], [right, 0]);
  assert.deepEqual([notepadPose(t, at('spread1', 0.61)).page, notepadPose(t, at('spread1', 0.61)).flip], [right, 0]);
});

test('notepad: arrival and ajar show the cover, open lifts it away across the whole beat', () => {
  for (const p of [0, mid('arrival'), R.ajar[0], mid('ajar')]) {
    const n = notepadPose(t, p);
    assert.equal(n.page, 0);
    assert.equal(n.flip, 0);
  }
  assert.equal(notepadPose(t, R.open[0]).page, 0);
  assert.equal(notepadPose(t, R.open[0]).flip, 0);
  const m = notepadPose(t, mid('open'));
  assert.equal(m.page, 0);
  assert.ok(near(m.flip, 0.5, 1e-9));
  const late = notepadPose(t, at('open', 0.99));
  assert.equal(late.page, 0);
  assert.ok(late.flip > 0.95 && late.flip <= 1);
});

test('notepad: flip beats lift the right page of the previous spread away', () => {
  const cases = [['flip1', 'data'], ['flip2', 'visas2'], ['flip3', 'sources']];
  for (const [beat, page] of cases) {
    assert.equal(notepadPose(t, at(beat, 0)).page, idx(page), beat);
    assert.equal(notepadPose(t, at(beat, 0)).flip, 0, beat);
    const m = notepadPose(t, mid(beat));
    assert.equal(m.page, idx(page), beat);
    assert.ok(near(m.flip, 0.5, 1e-9), beat);
    const late = notepadPose(t, at(beat, 0.99));
    assert.equal(late.page, idx(page), beat);
    assert.ok(late.flip > 0.95 && late.flip <= 1, beat);
  }
});

test('notepad: uv shows sources; closing lifts observations then lands on the cover; finale is the cover', () => {
  for (const l of [0, 0.5, 0.99]) {
    const n = notepadPose(t, at('uv', l));
    assert.equal(n.page, idx('sources'));
    assert.equal(n.flip, 0);
  }
  const c0 = notepadPose(t, at('closing', 0));
  assert.equal(c0.page, idx('observations'));
  assert.equal(c0.flip, 0);
  const c1 = notepadPose(t, at('closing', 0.25));
  assert.equal(c1.page, idx('observations'));
  assert.ok(near(c1.flip, 0.5, 1e-9));
  const c2 = notepadPose(t, at('closing', 0.499));
  assert.equal(c2.page, idx('observations'));
  assert.ok(c2.flip > 0.99 && c2.flip <= 1);
  for (const l of [0.5, 0.75, 0.99]) {
    const n = notepadPose(t, at('closing', l));
    assert.equal(n.page, 0, `closing ${l}`);
    assert.equal(n.flip, 0, `closing ${l}`);
  }
  for (const p of [R.finale[0], mid('finale'), 1]) {
    const n = notepadPose(t, p);
    assert.equal(n.page, 0);
    assert.equal(n.flip, 0);
  }
});

test('notepad: page is an integer 0..8 and flip stays within [0,1] for every sample', () => {
  for (let i = 0; i <= 5000; i++) {
    const n = notepadPose(t, i / 5000);
    assert.ok(Number.isInteger(n.page) && n.page >= 0 && n.page <= 8, `page ${n.page} at ${i}`);
    assert.ok(n.flip >= 0 && n.flip <= 1, `flip ${n.flip} at ${i}`);
    assert.ok(!Object.is(n.flip, -0), `flip -0 at ${i}`);
  }
  for (const bad of [-1, 3, NaN, undefined]) {
    const n = notepadPose(t, bad);
    assert.ok(Number.isInteger(n.page) && n.page >= 0 && n.page <= 8);
    assert.ok(n.flip >= 0 && n.flip <= 1);
  }
});

test('notepad: pages advance one at a time and each change follows a completed flip', () => {
  const N = 20000;
  const closingStart = R.closing[0];
  let prev = notepadPose(t, 0);
  const seen = [prev.page];
  for (let i = 1; i <= N; i++) {
    const p = i / N;
    const cur = notepadPose(t, p);
    if (cur.page !== prev.page) {
      if (p < R.closing[1]) {
        // forward only, by one page, and the outgoing page had finished lifting away
        assert.ok(p < closingStart || cur.page === 0, `unexpected jump at ${p}`);
        if (p < closingStart) assert.equal(cur.page, prev.page + 1, `skipped a page at ${p}`);
        assert.ok(prev.flip > 0.99, `page changed at ${p} while previous flip was only ${prev.flip}`);
      }
      seen.push(cur.page);
    }
    prev = cur;
  }
  assert.deepEqual(seen, [0, 1, 2, 3, 4, 5, 6, 7, 8, 0]);
});

// ---------------------------------------------------------------- parity

test('mode switch must not jump the sky or copy: shared fields equal in both poses', () => {
  for (let i = 0; i < 200; i++) {
    const p = i / 199;
    const d = desktopPose(t, p);
    const n = notepadPose(t, p);
    for (const k of ['sky', 'heroOpacity', 'finaleOpacity', 'flap', 'uvDim']) {
      assert.equal(n[k], d[k], `${k} differs at p=${p}`);
    }
  }
  // and notepadPose returns exactly the documented fields
  assert.deepEqual(Object.keys(notepadPose(t, 0.5)).sort(), ['finaleOpacity', 'flap', 'flip', 'heroOpacity', 'page', 'sky', 'uvDim']);
});

test('easeInOutCubic: endpoints, midpoint, symmetry', () => {
  assert.equal(easeInOutCubic(0), 0);
  assert.equal(easeInOutCubic(1), 1);
  assert.equal(easeInOutCubic(0.5), 0.5);
  assert.ok(near(easeInOutCubic(0.25) + easeInOutCubic(0.75), 1, 1e-12));
});
