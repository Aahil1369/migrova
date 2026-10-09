import { test } from 'node:test';
import assert from 'node:assert/strict';
import { routeCodes, routeLabel, routeSpoken, hasRoute, sameRoute, ROUTE_EVENT } from '../../../app/components/passport/routeStore.js';
import { visaHref, visaPrefill, relocateDestination } from '../../../app/components/passport/search.js';

// ---- boarding pass codes / route identity -----------------------------------------------------

test('routeCodes: ISO3 codes, ANY for unset, any or invalid', () => {
  assert.deepEqual(routeCodes({ from: 'pk', to: 'ca' }), { from: 'PAK', to: 'CAN' });
  assert.deepEqual(routeCodes({ from: 'PK', to: 'any' }), { from: 'PAK', to: 'ANY' });
  assert.deepEqual(routeCodes({ from: null, to: null }), { from: 'ANY', to: 'ANY' });
  assert.deepEqual(routeCodes(null), { from: 'ANY', to: 'ANY' });
  assert.deepEqual(routeCodes({ from: 'zz', to: 42 }), { from: 'ANY', to: 'ANY' });
  assert.deepEqual(routeCodes({ from: 'vc', to: 'ci' }), { from: 'VCT', to: 'CIV' }, 'long names -> 3 letters');
  assert.equal(routeLabel({ from: 'pk', to: 'ca' }), 'PAK ✈ CAN');
});

test('routeSpoken: country names for screen readers, "anywhere" for unset parts', () => {
  assert.equal(routeSpoken({ from: 'pk', to: 'ca' }), 'Pakistan to Canada');
  assert.equal(routeSpoken({ from: 'pk', to: 'any' }), 'Pakistan to anywhere');
  assert.equal(routeSpoken({ from: null, to: 'ci' }), "anywhere to Côte d'Ivoire");
  assert.equal(routeSpoken(null), 'anywhere to anywhere');
  assert.equal(ROUTE_EVENT, 'migrova:route');
});

test('hasRoute: something worth remembering (a From, or a real To)', () => {
  assert.equal(hasRoute({ from: 'pk', to: 'ca' }), true);
  assert.equal(hasRoute({ from: 'pk', to: 'any' }), true);
  assert.equal(hasRoute({ from: null, to: 'ca' }), true);
  assert.equal(hasRoute({ from: null, to: 'any' }), false);
  assert.equal(hasRoute({ from: null, to: null }), false);
  assert.equal(hasRoute({ from: 'zz', to: 'nope' }), false);
  assert.equal(hasRoute(null), false);
});

test('sameRoute: compares valid codes case-insensitively; unset == unset', () => {
  assert.equal(sameRoute({ from: 'pk', to: 'ca' }, { from: 'PK', to: 'CA' }), true);
  assert.equal(sameRoute({ from: 'pk', to: 'ca' }, { from: 'pk', to: 'gb' }), false);
  assert.equal(sameRoute({ from: null, to: 'any' }, { from: null, to: 'any' }), true);
  assert.equal(sameRoute({ from: 'pk', to: null }, { from: 'pk', to: 'any' }), false);
  assert.equal(sameRoute(null, { from: 'pk', to: 'ca' }), false);
  assert.equal(sameRoute(null, null), false);
});

// ---- "Check a visa" link -------------------------------------------------------------------

test('visaHref: /visa?from&to, omitting empty / any / invalid parts', () => {
  assert.equal(visaHref({ from: 'pk', to: 'ca' }), '/visa?from=pk&to=ca');
  assert.equal(visaHref({ from: 'pk', to: 'any' }), '/visa?from=pk');
  assert.equal(visaHref({ from: null, to: 'ca' }), '/visa?to=ca');
  assert.equal(visaHref({ from: null, to: null }), '/visa');
  assert.equal(visaHref({ from: 'ZZ', to: 'GB' }), '/visa?to=gb');
  assert.equal(visaHref(undefined), '/visa');
});

// ---- Visa / Relocate prefill from the saved route -------------------------------------------

test('visaPrefill: query params win, the saved route fills what the query left empty', () => {
  const saved = { from: 'pk', to: 'ca' };
  assert.deepEqual(visaPrefill({ from: 'ng', to: 'gb' }, saved), { nationality: 'ng', destination: 'gb', fromRoute: false });
  assert.deepEqual(visaPrefill({ from: null, to: null }, saved), { nationality: 'pk', destination: 'ca', fromRoute: true });
  assert.deepEqual(visaPrefill({ from: null, to: 'fr' }, saved), { nationality: 'pk', destination: 'fr', fromRoute: true });
  assert.deepEqual(visaPrefill({ from: 'xx', to: '' }, saved), { nationality: 'pk', destination: 'ca', fromRoute: true });
});

test("visaPrefill: To 'any' never becomes a destination; no route -> nulls (profile may fill)", () => {
  assert.deepEqual(visaPrefill({}, { from: 'pk', to: 'any' }), { nationality: 'pk', destination: null, fromRoute: true });
  assert.deepEqual(visaPrefill({}, null), { nationality: null, destination: null, fromRoute: false });
  assert.deepEqual(visaPrefill({}, { from: null, to: null }), { nationality: null, destination: null, fromRoute: false });
  assert.deepEqual(visaPrefill(undefined, undefined), { nationality: null, destination: null, fromRoute: false });
});

test('relocateDestination: ?dest wins (capped at 120 chars), else the saved To country name', () => {
  assert.equal(relocateDestination('Portugal', { from: 'pk', to: 'ca' }), 'Portugal');
  assert.equal(relocateDestination('x'.repeat(200), null).length, 120);
  assert.equal(relocateDestination(null, { from: 'pk', to: 'ca' }), 'Canada');
  assert.equal(relocateDestination('', { from: 'pk', to: 'ci' }), "Côte d'Ivoire");
  assert.equal(relocateDestination(null, { from: 'pk', to: 'any' }), '');
  assert.equal(relocateDestination(null, null), '');
  assert.equal(relocateDestination(null, { to: 'zz' }), '');
});
