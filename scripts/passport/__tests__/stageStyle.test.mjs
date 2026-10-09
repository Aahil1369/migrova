import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  leafStyle, closedShiftPx, bookTransform, flapStyle, inlineFlapStyle,
  notepadPageStyle, litePageStyle, fadePageStyle, skyLayers, FLIP_Z,
} from '../../../app/components/passport/stageStyle.js';

const zOf = (transform) => Number(/translateZ\(([-\d.]+)px\)/.exec(transform)[1]);

test('leafStyle: cover highest on the right, lowest on the left, a turning leaf at FLIP_Z', () => {
  const right = [0, 1, 2, 3].map((i) => zOf(leafStyle(i, 0).transform));
  assert.deepEqual([...right].sort((a, b) => b - a), right, 'right stack: cover on top');
  const left = [0, 1, 2, 3].map((i) => zOf(leafStyle(i, -180).transform));
  assert.deepEqual([...left].sort((a, b) => a - b), left, 'left stack: cover at the bottom');
  assert.equal(zOf(leafStyle(2, -90).transform), FLIP_Z);
  assert.ok(FLIP_Z > Math.max(...right, ...left));
});

test('leafStyle: dim is |sin(angle)| x 0.35 and NaN angles are safe', () => {
  assert.equal(leafStyle(0, 0).dim, 0);
  assert.equal(leafStyle(0, -90).dim, 0.35);
  assert.ok(leafStyle(0, -180).dim < 0.001);
  assert.match(leafStyle(1, NaN).transform, /rotateY\(0deg\)/);
});

test('closedShiftPx / bookTransform', () => {
  assert.equal(closedShiftPx(1440, 470), Math.min(1440 * 0.13, 720 - 470 * 1.08));
  assert.equal(closedShiftPx(800, 400), 0); // never negative
  assert.equal(
    bookTransform({ shift: 1, scale: 0.92, tiltX: 8, tiltY: -14 }, 100),
    'translate3d(100px,0,0) rotateX(8deg) rotateY(-14deg) scale(0.92)',
  );
});

test('bookTransform: the open UV flap shifts the book left by flapW/2 x flap', () => {
  const xOf = (t) => Number(/translate3d\(([-\d.]+)px/.exec(t)[1]);
  const open = { shift: 0, scale: 1, tiltX: 0, tiltY: 0 };
  assert.equal(xOf(bookTransform({ ...open, flap: 0 }, 187, 282)), 0, 'flap 0 -> no extra shift');
  assert.equal(xOf(bookTransform({ ...open, flap: 1 }, 187, 282)), -141, 'flap 1 -> -flapW/2');
  assert.equal(xOf(bookTransform({ ...open, flap: 0.5 }, 187, 282)), -70.5);
  assert.equal(xOf(bookTransform({ ...open, flap: 1 }, 187)), 0, 'no flap width -> no shift');
  assert.equal(xOf(bookTransform({ ...open, shift: 1, flap: 0 }, 187, 282)), 187);
});

test('flapStyle: hidden when folded, interactive only when open', () => {
  assert.deepEqual(flapStyle(0), { transform: 'rotateY(0deg)', opacity: 0, pointerEvents: 'none' });
  assert.deepEqual(flapStyle(1), { transform: 'rotateY(180deg)', opacity: 1, pointerEvents: 'auto' });
});

test('notepad/lite/fade: the page underneath is page + 1, or the cover after the last page', () => {
  for (const fn of [notepadPageStyle, litePageStyle, fadePageStyle]) {
    const showing = fn(3, 3, 0.2);
    const under = fn(4, 3, 0.2);
    const other = fn(0, 3, 0.2);
    assert.ok(showing.zIndex > under.zIndex && under.zIndex > other.zIndex);
    assert.equal(other.opacity, 0);
    assert.equal(fn(0, 8, 0.5).zIndex, 1, 'cover sits under page 8');
    assert.equal(fn(0, 8, 0.5).opacity, 1);
  }
  assert.equal(notepadPageStyle(2, 2, 1).transform, 'perspective(1600px) rotateX(180deg)');
  assert.equal(litePageStyle(2, 2, 1).opacity, 0);
});

test('fadePageStyle (reduced motion): pages crossfade with opacity only, never move', () => {
  for (const page of [0, 3, 8]) {
    for (const flip of [0, 0.25, 0.5, 0.75, 1]) {
      for (let i = 0; i < 9; i++) assert.equal(fadePageStyle(i, page, flip).transform, 'none', `${i} ${page} ${flip}`);
    }
  }
  assert.equal(fadePageStyle(4, 4, 0).opacity, 1);
  assert.equal(fadePageStyle(4, 4, 0.25).opacity, 0.75);
  assert.equal(fadePageStyle(5, 4, 0.25).opacity, 1, 'the page underneath is already there');
  assert.equal(fadePageStyle(4, 4, 1).opacity, 0);
  assert.equal(fadePageStyle(4, 4, 0.4).pointerEvents, 'auto');
  assert.equal(fadePageStyle(5, 4, 0.6).pointerEvents, 'auto');
  assert.equal(fadePageStyle(4, 4, 0.6).pointerEvents, 'none');
});

test('inlineFlapStyle: the still variant (fade layout) crossfades without the 24px slide', () => {
  for (const f of [0, 0.3, 0.7, 1]) {
    const moving = inlineFlapStyle(f);
    const still = inlineFlapStyle(f, true);
    assert.equal(still.transform, 'none');
    assert.equal(still.opacity, moving.opacity);
    assert.equal(still.pageOpacity, moving.pageOpacity);
    assert.equal(still.pointerEvents, moving.pointerEvents);
  }
  assert.equal(inlineFlapStyle(0.5).transform, 'translate3d(0, 24px, 0)');
});

test('skyLayers: night always 1, upper layers ramp in order', () => {
  assert.deepEqual(skyLayers(0), { night: 1, predawn: 0, sunrise: 0, day: 0 });
  assert.deepEqual(skyLayers(1), { night: 1, predawn: 1, sunrise: 1, day: 1 });
  const mid = skyLayers(0.5);
  assert.equal(mid.predawn, 1);
  assert.ok(mid.sunrise > 0 && mid.sunrise < 1);
  assert.equal(mid.day, 0);
  assert.equal(skyLayers(0.9).day, 1);
});
