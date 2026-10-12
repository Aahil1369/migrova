// The per-country official-sources payload that /api/sources/[code] serves, so the tool pages
// fetch one small JSON file instead of bundling the whole 195-country table.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { sourcesPayload } = await import(new URL('../../../app/lib/sourcesPayload.js', import.meta.url));
const { GET } = await import(new URL('../../../app/api/sources/[code]/route.js', import.meta.url));
const { OFFICIAL_SOURCES } = await import(new URL('../../../app/data/officialSources.js', import.meta.url));
const { LINK_TYPES } = await import(new URL('../../../app/lib/officialSources.js', import.meta.url));

test('sourcesPayload: Canada has the identity fields and stays small', () => {
  const p = sourcesPayload('ca');
  assert.equal(p.code, 'ca');
  assert.equal(p.name, 'Canada');
  assert.equal(p.flag, '\u{1F1E8}\u{1F1E6}');
  assert.equal(p.verifiedAt, '2026-09-27');
  assert.deepEqual(p.domains, ['gc.ca', 'canada.ca']);
  assert.ok(JSON.stringify(p).length < 4000, `payload is ${JSON.stringify(p).length} chars`);
});

test('sourcesPayload: links keep only status, url and title, for every link type', () => {
  const p = sourcesPayload('ca');
  assert.deepEqual(Object.keys(p.links), LINK_TYPES.map((t) => t.key));
  assert.deepEqual(p.links.authority, {
    status: 'verified',
    url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
    title: 'Immigration, Refugees and Citizenship Canada (IRCC)',
  });
  for (const link of Object.values(p.links)) {
    for (const key of Object.keys(link)) assert.ok(['status', 'url', 'title'].includes(key), `unexpected key ${key}`);
  }
  // A link that was never verified carries no url or title at all.
  assert.deepEqual(sourcesPayload('dz').links.authority, { status: 'not_verified' });
});

test('sourcesPayload: the code is matched case-insensitively', () => {
  assert.deepEqual(sourcesPayload('CA'), sourcesPayload('ca'));
  assert.equal(sourcesPayload('Ca').code, 'ca');
});

test('sourcesPayload: unknown or junk codes are null, never a crash', () => {
  for (const bad of ['zz', '../x', '', undefined, null, 'c', 'can', 'c1', ' ca', 'ca ', 'ca/', '__proto__', 12, ['ca'], { code: 'ca' }]) {
    assert.equal(sourcesPayload(bad), null, `expected null for ${JSON.stringify(bad)}`);
  }
});

test('sourcesPayload: every country in the dataset serves a small, JSON-safe payload', () => {
  const codes = Object.keys(OFFICIAL_SOURCES);
  assert.ok(codes.length >= 190);
  for (const code of codes) {
    const p = sourcesPayload(code);
    assert.ok(p, `no payload for ${code}`);
    assert.equal(p.code, code);
    assert.ok(JSON.stringify(p).length < 4000, `${code} payload is ${JSON.stringify(p).length} chars`);
    assert.deepEqual(JSON.parse(JSON.stringify(p)), p);
  }
});

test('GET /api/sources/[code]: 200 with the payload and the cache header', async () => {
  const res = await GET(new Request('http://localhost/api/sources/ca'), { params: Promise.resolve({ code: 'ca' }) });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get('Cache-Control'), 'public, max-age=3600, s-maxage=86400');
  assert.deepEqual(await res.json(), sourcesPayload('ca'));
});

test('GET /api/sources/[code]: unknown codes are a 404 with a short error', async () => {
  for (const code of ['zz', '..', 'canada']) {
    const res = await GET(new Request('http://localhost/api/sources/x'), { params: Promise.resolve({ code }) });
    assert.equal(res.status, 404, code);
    assert.deepEqual(await res.json(), { error: 'Unknown country' });
  }
});
