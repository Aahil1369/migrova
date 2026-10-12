// The UV check on /sources/[code]: the country's real official site (a verified link) beside an
// invented look-alike from fakeDomain() (.example, never a link). Server-side only: it reads the
// 195-country table, and the client UvCheck receives just the pair.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const ROOT = new URL('../../../', import.meta.url);
const { uvPair, uvPairFrom } = await import(new URL('app/sources/uvPair.js', ROOT));
const { getSources, domainOf } = await import(new URL('app/lib/officialSources.js', ROOT));
const { OFFICIAL_SOURCES } = await import(new URL('app/data/officialSources.js', ROOT));
const { fakeDomain } = await import(new URL('app/components/kit/fakeDomain.js', ROOT));

// The order the real site is picked in: the immigration authority, then the other link types.
const ORDER = ['authority', 'apply', 'embassies', 'work', 'study', 'citizenship'];
const verified = (url, name) => ({ status: 'verified', url, name, verifiedAt: '2026-09-27' });

test('uvPair: Canada pairs its verified immigration authority with a .example look-alike', () => {
  const pair = uvPair('ca');
  const authority = getSources('ca').links.authority;
  assert.equal(pair.real.domain, domainOf(authority.url));
  assert.equal(pair.real.domain, 'canada.ca');
  assert.equal(pair.real.url, authority.url);
  assert.equal(pair.real.title, authority.name);
  assert.match(pair.fake.domain, /\.example$/);
  assert.notEqual(pair.fake.domain, pair.real.domain);
  assert.equal(pair.fake.domain, fakeDomain('Canada'));
  // Exactly the documented shape, so nothing else from the table reaches the client.
  assert.deepEqual(Object.keys(pair).sort(), ['fake', 'real']);
  assert.deepEqual(Object.keys(pair.real).sort(), ['domain', 'title', 'url']);
  assert.deepEqual(Object.keys(pair.fake), ['domain']);
  assert.deepEqual(uvPair('CA'), pair, 'the code is matched case-insensitively');
});

test('uvPair: without a verified authority, the next verified link type stands in', () => {
  // Benin: the authority is not verified, the visa application is. Burundi: neither the authority
  // nor the application is, the embassy list is.
  for (const [code, type] of [['bj', 'apply'], ['bi', 'embassies']]) {
    const entry = getSources(code);
    assert.notEqual(entry.links.authority.status, 'verified', `${code}: data still has no verified authority`);
    assert.equal(uvPair(code).real.url, entry.links[type].url, code);
    assert.equal(uvPair(code).real.title, entry.links[type].name, code);
  }
  // Every country: the first verified link in that order, or no real site at all.
  for (const [code, entry] of Object.entries(OFFICIAL_SOURCES)) {
    const first = ORDER.find((t) => entry.links[t]?.status === 'verified');
    const pair = uvPair(code);
    assert.equal(pair.real?.url ?? null, first ? entry.links[first].url : null, code);
    assert.match(pair.fake.domain, /^[a-z0-9]+(?:-[a-z0-9]+)*-visa-fastpass\.example$/, code);
    assert.notEqual(pair.fake.domain, pair.real?.domain, code);
  }
});

test('uvPair: a country with nothing verified gets only the fake example', () => {
  assert.deepEqual(uvPair('dz'), { real: null, fake: { domain: 'algeria-visa-fastpass.example' } });
});

test('uvPairFrom: the fallback order on a stubbed entry', () => {
  const entry = {
    links: {
      authority: { status: 'not_verified' },
      apply: { status: 'not_applicable', note: 'Apply at an embassy' },
      embassies: verified('https://www.mfa.gov.zz/embassies', 'Zedland Foreign Ministry'),
      work: verified('https://work.gov.zz/', 'Labour Office'),
    },
  };
  assert.deepEqual(uvPairFrom(entry, 'Zedland'), {
    real: { url: 'https://www.mfa.gov.zz/embassies', domain: 'mfa.gov.zz', title: 'Zedland Foreign Ministry' },
    fake: { domain: 'zedland-visa-fastpass.example' },
  });
});

test('uvPairFrom: only an https page counts as the real site; an unnamed one takes its link type as title', () => {
  const entry = {
    links: {
      authority: verified('javascript:alert(1)', 'A'),
      apply: verified('http://plain.gov.zz/', 'B'),
      embassies: { status: 'verified' },
      work: verified('https://www.work.gov.zz/permits', ''),
    },
  };
  // No name: the link type's label stands in as the title.
  assert.deepEqual(uvPairFrom(entry, 'Zedland').real, { url: 'https://www.work.gov.zz/permits', domain: 'work.gov.zz', title: 'Work permits' });
});

test('uvPairFrom: junk entries give no real site but still the fake example', () => {
  for (const junk of [null, undefined, 'ca', {}, { links: null }, { links: 'x' }, { links: { authority: 'verified' } }]) {
    assert.deepEqual(uvPairFrom(junk, 'Zedland'), { real: null, fake: { domain: 'zedland-visa-fastpass.example' } }, JSON.stringify(junk));
  }
});

test('uvPair: unknown or junk codes are null, never a crash', () => {
  for (const bad of ['zz', 'ZZ', '', 'c', 'can', 'ca/', ' ca', '../x', '__proto__', 'constructor', null, undefined, 42, ['ca'], { code: 'ca' }]) {
    assert.equal(uvPair(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});
