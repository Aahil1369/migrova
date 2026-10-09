import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  PAGES, ANCHORS, BEATS, SPREAD_OF,
  buildTimeline, localT, beatAt, progressForPage,
} from '../../../app/components/passport/timeline.js';

const t = buildTimeline();

test('ranges cover [0,1] contiguously and in BEATS order', () => {
  const ids = BEATS.map(([id]) => id);
  assert.deepEqual(Object.keys(t.ranges), ids);
  assert.deepEqual(t.order, ids);
  assert.equal(t.ranges[ids[0]][0], 0);
  assert.equal(t.ranges[ids[ids.length - 1]][1], 1);
  for (let i = 0; i < ids.length; i++) {
    const [s, e] = t.ranges[ids[i]];
    assert.ok(e > s, `${ids[i]} has positive width`);
    if (i > 0) assert.equal(s, t.ranges[ids[i - 1]][1], `${ids[i]} starts where previous ends`);
  }
});

test('viewports is the sum of the beat weights (7.95)', () => {
  assert.ok(Math.abs(t.viewports - 7.95) < 1e-9, String(t.viewports));
});

test('beatAt resolves the endpoints and interior points', () => {
  assert.equal(beatAt(t, 0), 'arrival');
  assert.equal(beatAt(t, 1), 'finale');
  assert.equal(beatAt(t, -3), 'arrival');
  assert.equal(beatAt(t, 7), 'finale');
  for (const id of t.order) {
    const [s, e] = t.ranges[id];
    assert.equal(beatAt(t, (s + e) / 2), id);
    assert.equal(beatAt(t, s), id, `${id} includes its start`);
  }
});

test('localT clamps to 0..1 and is linear inside a beat', () => {
  const [s, e] = t.ranges.spread2;
  assert.equal(localT(t, 'spread2', -0.5), 0);
  assert.equal(localT(t, 'spread2', 2), 1);
  assert.equal(localT(t, 'spread2', s), 0);
  assert.equal(localT(t, 'spread2', e), 1);
  assert.ok(Math.abs(localT(t, 'spread2', (s + e) / 2) - 0.5) < 1e-9);
});

test('progressForPage: cover is 0, other pages sit inside their spread beat', () => {
  assert.equal(progressForPage(t, 'cover'), 0);
  const p = progressForPage(t, 'sources');
  const [s, e] = t.ranges.spread3;
  assert.ok(p > s && p < e, `${p} not strictly inside [${s}, ${e}]`);
  for (const page of PAGES.filter((x) => x !== 'cover')) {
    const [bs, be] = t.ranges[SPREAD_OF[page]];
    const pp = progressForPage(t, page);
    assert.ok(pp > bs && pp < be, page);
    assert.equal(beatAt(t, pp), SPREAD_OF[page]);
  }
});

test('every ANCHORS value is a page, every page but cover has a spread', () => {
  for (const page of Object.values(ANCHORS)) assert.ok(PAGES.includes(page), page);
  for (const page of PAGES.filter((x) => x !== 'cover')) assert.ok(SPREAD_OF[page], page);
});

test('buildTimeline works for a custom beat list', () => {
  const c = buildTimeline([['a', 1], ['b', 3]]);
  assert.equal(c.viewports, 4);
  assert.deepEqual(c.ranges.a, [0, 0.25]);
  assert.deepEqual(c.ranges.b, [0.25, 1]);
});
