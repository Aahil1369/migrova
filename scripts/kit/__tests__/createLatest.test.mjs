// The stale-request guard: a page asks for a new id per request and drops any response whose id
// is no longer current, so the newest request always wins (double submit, quick chip taps).
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { createLatest } = await import(new URL('../../../app/components/kit/createLatest.js', import.meta.url));

test('createLatest: every next() makes the earlier ids stale', () => {
  const l = createLatest();
  const a = l.next();
  const b = l.next();
  assert.equal(l.isCurrent(a), false);
  assert.equal(l.isCurrent(b), true);
  const c = l.next();
  assert.equal(l.isCurrent(b), false);
  assert.equal(l.isCurrent(c), true);
});

test('createLatest: a fresh guard\'s first id is current; guards are independent', () => {
  const one = createLatest();
  const two = createLatest();
  const first = one.next();
  assert.equal(one.isCurrent(first), true);
  // another guard's requests never make this one stale
  two.next();
  two.next();
  assert.equal(one.isCurrent(first), true);
  // nothing that was never handed out is current
  assert.equal(createLatest().isCurrent(undefined), false);
  assert.equal(one.isCurrent(first + 1), false);
});
