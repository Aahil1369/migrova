import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ROUTE_KEY, readRoute, saveRoute, forgetRoute, routeLabel,
} from '../../../app/components/passport/routeStore.js';

function fakeStorage(initial = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = String(v); },
    removeItem: (k) => { delete data[k]; },
  };
}

function throwingStorage() {
  const boom = () => { throw new Error('SecurityError'); };
  return { getItem: boom, setItem: boom, removeItem: boom };
}

test('ROUTE_KEY', () => {
  assert.equal(ROUTE_KEY, 'migrova_route');
});

test('save then read round-trips (case-normalised)', () => {
  const s = fakeStorage();
  assert.equal(saveRoute(s, { from: 'pk', to: 'ca' }, 1234), true);
  assert.deepEqual(readRoute(s), { from: 'pk', to: 'ca' });
  assert.deepEqual(JSON.parse(s.data[ROUTE_KEY]), { from: 'pk', to: 'ca', savedAt: 1234 });
  assert.equal(saveRoute(s, { from: 'PK', to: 'CA' }), true);
  assert.deepEqual(readRoute(s), { from: 'pk', to: 'ca' });
});

test("to:'any' is allowed; null/undefined fields are allowed", () => {
  const s = fakeStorage();
  assert.equal(saveRoute(s, { from: 'pk', to: 'any' }), true);
  assert.deepEqual(readRoute(s), { from: 'pk', to: 'any' });
  assert.equal(saveRoute(s, { from: null, to: null }), true);
  assert.deepEqual(readRoute(s), { from: null, to: null });
  assert.equal(saveRoute(s, { from: 'pk' }), true);
  assert.deepEqual(readRoute(s), { from: 'pk', to: null });
});

test('invalid codes are rejected and nothing is written', () => {
  const s = fakeStorage();
  assert.equal(saveRoute(s, { from: 'zz' }), false);
  assert.equal(saveRoute(s, { from: 'pk', to: 'zz' }), false);
  assert.equal(saveRoute(s, { from: 'pk', to: 'nowhere' }), false);
  assert.equal(saveRoute(s, { from: 42, to: 'ca' }), false);
  assert.deepEqual(s.data, {});
  assert.equal(readRoute(s), null);
});

test('nothing stored, malformed JSON, or non-object JSON -> null', () => {
  assert.equal(readRoute(fakeStorage()), null);
  assert.equal(readRoute(fakeStorage({ [ROUTE_KEY]: '{not json' })), null);
  assert.equal(readRoute(fakeStorage({ [ROUTE_KEY]: '42' })), null);
  assert.equal(readRoute(fakeStorage({ [ROUTE_KEY]: '"pk"' })), null);
  assert.equal(readRoute(fakeStorage({ [ROUTE_KEY]: 'null' })), null);
  assert.equal(readRoute(fakeStorage({ [ROUTE_KEY]: '["pk","ca"]' })), null);
  assert.equal(readRoute(null), null);
  assert.equal(readRoute(undefined), null);
});

test('invalid stored codes become null fields instead of throwing', () => {
  const s = fakeStorage({ [ROUTE_KEY]: JSON.stringify({ from: 'zz', to: 'ca' }) });
  assert.deepEqual(readRoute(s), { from: null, to: 'ca' });
  const s2 = fakeStorage({ [ROUTE_KEY]: JSON.stringify({ from: 'PK', to: 'ANY' }) });
  assert.deepEqual(readRoute(s2), { from: 'pk', to: 'any' });
  const s3 = fakeStorage({ [ROUTE_KEY]: JSON.stringify({ from: 7, to: {} }) });
  assert.deepEqual(readRoute(s3), { from: null, to: null });
});

test('throwing storage: read -> null, save -> false, forget does not throw', () => {
  const s = throwingStorage();
  assert.equal(readRoute(s), null);
  assert.equal(saveRoute(s, { from: 'pk', to: 'ca' }), false);
  assert.doesNotThrow(() => forgetRoute(s));
  assert.doesNotThrow(() => forgetRoute(null));
});

test('forgetRoute removes the saved route', () => {
  const s = fakeStorage();
  saveRoute(s, { from: 'pk', to: 'ca' });
  forgetRoute(s);
  assert.equal(readRoute(s), null);
  assert.deepEqual(s.data, {});
});

test('routeLabel uses ISO3 codes with defaults', () => {
  assert.equal(routeLabel({ from: 'pk', to: 'ca' }), 'PAK ✈ CAN');
  assert.equal(routeLabel({ from: 'PK', to: 'CA' }), 'PAK ✈ CAN');
  assert.equal(routeLabel({ from: 'pk', to: 'any' }), 'PAK ✈ ANY');
  assert.equal(routeLabel({ from: 'pk', to: null }), 'PAK ✈ ANY');
  assert.equal(routeLabel({ from: null, to: null }), 'ANY ✈ ANY');
  assert.equal(routeLabel({ from: 'zz', to: 'qq' }), 'ANY ✈ ANY');
  assert.equal(routeLabel({}), 'ANY ✈ ANY');
  assert.equal(routeLabel(), 'ANY ✈ ANY');
  assert.equal(routeLabel({ from: null, to: 'ca' }), 'ANY ✈ CAN');
});
