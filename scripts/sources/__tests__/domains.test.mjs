import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostOf, hostMatches, isAllowedHost } from '../lib/domains.mjs';

test('hostOf normalizes case and strips www', () => {
  assert.equal(hostOf('https://WWW.Canada.ca/en/x.html'), 'canada.ca');
  assert.equal(hostOf('https://evisa.gov.tr/en/'), 'evisa.gov.tr');
  assert.equal(hostOf('not a url'), null);
  assert.equal(hostOf(''), null);
});

test('hostMatches is a label-boundary suffix match', () => {
  assert.ok(hostMatches('canada.ca', 'canada.ca'));
  assert.ok(hostMatches('ircc.canada.ca', 'canada.ca'));
  assert.ok(hostMatches('uscis.gov', 'gov'));
  assert.ok(!hostMatches('notcanada.ca', 'canada.ca'));
  assert.ok(!hostMatches('canada.ca.evil.com', 'canada.ca'));
  assert.ok(!hostMatches('gov.uk.example.com', 'gov.uk'));
  assert.ok(!hostMatches('www.gov.uk', 'gov'));
});

test('isAllowedHost rejects look-alikes', () => {
  assert.ok(isAllowedHost('gov.uk', ['gov.uk']));
  assert.ok(isAllowedHost('visas-immigration.service.gov.uk', ['gov.uk']));
  assert.ok(!isAllowedHost('uk-visa-online.com', ['gov.uk']));
  assert.ok(!isAllowedHost('esta-us.com', ['gov']));
  assert.ok(!isAllowedHost('canada-visa.com', ['canada.ca', 'gc.ca']));
  assert.ok(!isAllowedHost(null, ['gov']));
  assert.ok(!isAllowedHost('uscis.gov', []));
});
