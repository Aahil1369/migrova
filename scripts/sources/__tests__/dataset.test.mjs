import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES_195 } from '../../../app/data/countries195.js';
import { OFFICIAL_SOURCES, SOURCES_VERIFIED_AT } from '../../../app/data/officialSources.js';
import { hostOf, isAllowedHost } from '../lib/domains.mjs';

const TYPES = ['authority', 'apply', 'embassies', 'work', 'study', 'citizenship'];
const STATUSES = new Set(['verified', 'not_verified', 'not_applicable']);

test('one entry per country, every link type present with a known status', () => {
  assert.deepEqual(Object.keys(OFFICIAL_SOURCES).sort(), COUNTRIES_195.map((c) => c.code).sort());
  assert.match(SOURCES_VERIFIED_AT, /^\d{4}-\d{2}-\d{2}$/);
  for (const [code, s] of Object.entries(OFFICIAL_SOURCES)) {
    assert.equal(s.code, code);
    for (const t of TYPES) {
      assert.ok(s.links[t], `${code}.${t} missing`);
      assert.ok(STATUSES.has(s.links[t].status), `${code}.${t} status ${s.links[t].status}`);
    }
    for (const t of Object.keys(s.links)) assert.ok(TYPES.includes(t), `${code}: unexpected link type ${t}`);
  }
});

test('every verified link is https, dated, on-topic and domain-justified', () => {
  for (const [code, s] of Object.entries(OFFICIAL_SOURCES)) {
    for (const [t, l] of Object.entries(s.links)) {
      if (l.status === 'not_applicable') { assert.ok(l.note, `${code}.${t} n/a without a note`); continue; }
      if (l.status !== 'verified') continue;
      assert.ok(l.name, `${code}.${t} has no name`);
      assert.match(l.url, /^https:\/\//, `${code}.${t}`);
      assert.match(l.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
      assert.ok(l.evidence.includes('https') && l.evidence.includes('content'), `${code}.${t} evidence ${l.evidence}`);
      const onGov = isAllowedHost(hostOf(l.url), s.govDomains);
      const linked = l.evidence.find((e) => e.startsWith('linked-from:'));
      assert.ok(onGov || linked, `${code}.${t} ${l.url} is neither on a government domain nor linked from one`);
      if (linked) assert.ok(isAllowedHost(hostOf(linked.slice(12)), s.govDomains), `${code}.${t} linked from a non-government page`);
      if (onGov) assert.ok(l.evidence.includes('wikidata') || linked, `${code}.${t} lacks corroboration`);
    }
  }
});
