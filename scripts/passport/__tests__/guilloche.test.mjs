import { test } from 'node:test';
import assert from 'node:assert/strict';
import { guillocheDataUri, rosetteDataUri } from '../../../app/components/passport/parts/guillochePattern.js';

test('guillocheDataUri is a CSS url() of an SVG data URI', () => {
  const uri = guillocheDataUri(3);
  assert.ok(uri.startsWith('url("data:image/svg+xml'), uri.slice(0, 40));
  assert.ok(uri.endsWith('")'));
  // Nothing that would break out of url("…") or need escaping.
  const body = uri.slice('url("'.length, -2);
  assert.ok(!/["<>#]/.test(body), 'quotes, angle brackets and # are escaped');
});

test('guillocheDataUri is deterministic: same seed -> identical string', () => {
  assert.equal(guillocheDataUri(5), guillocheDataUri(5));
  assert.equal(guillocheDataUri('data'), guillocheDataUri('data'));
  assert.equal(guillocheDataUri(), guillocheDataUri(0));
});

test('guillocheDataUri differs for different seeds', () => {
  assert.notEqual(guillocheDataUri(1), guillocheDataUri(2));
  assert.notEqual(guillocheDataUri('notice'), guillocheDataUri('data'));
});

test('rosetteDataUri is deterministic and seed-dependent', () => {
  const a = rosetteDataUri('M-MATCH');
  assert.ok(a.startsWith('url("data:image/svg+xml'));
  assert.equal(a, rosetteDataUri('M-MATCH'));
  assert.notEqual(a, rosetteDataUri('V-VISA'));
});
