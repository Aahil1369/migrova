// The official-links cache behind OfficialSourcesBlock (/visa, /relocate): one request per country
// per tab, failures not cached, and the block's effect always hearing about a payload, including
// one that lands between the render that found the cache empty and the effect (the race that kept
// the trust block hidden after a prefetch started with the search).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const { cachedSources, prefetchSources, watchSources } = await import(new URL('app/components/officialSourcesCache.js', ROOT));

// A fetch stub whose responses are released by hand: release(code, payload | null).
const requests = [];
const waiting = new Map();
globalThis.fetch = (url) => {
  requests.push(url);
  const code = decodeURIComponent(String(url).replace('/api/sources/', ''));
  return new Promise((resolve) => {
    waiting.set(code, (payload) => resolve(payload ? { ok: true, json: async () => payload } : { ok: false, json: async () => null }));
  });
};
const release = (code, payload) => waiting.get(code)(payload);
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
const payloadFor = (code) => ({ code, name: `Country ${code}`, links: {}, domains: [] });

test('prefetchSources: one request per country, the payload cached; no code, no request', async () => {
  const before = requests.length;
  const a = prefetchSources('ca');
  const b = prefetchSources('ca');
  assert.equal(requests.length - before, 1, 'a second call joins the request in flight');
  assert.equal(cachedSources('ca'), null, 'nothing cached before the response');
  release('ca', payloadFor('ca'));
  assert.deepEqual(await a, payloadFor('ca'));
  assert.equal(await b, await a);
  assert.deepEqual(cachedSources('ca'), payloadFor('ca'));
  assert.deepEqual(await prefetchSources('ca'), payloadFor('ca'));
  assert.equal(requests.length - before, 1, 'served from the cache afterwards');
  assert.equal(await prefetchSources(''), null);
  assert.equal(cachedSources(''), null);
  assert.equal(requests.length - before, 1);
});

test('a failed or unknown country resolves null and is not cached, so a later call tries again', async () => {
  const first = prefetchSources('zz');
  release('zz', null);
  assert.equal(await first, null);
  assert.equal(cachedSources('zz'), null);
  const before = requests.length;
  const second = prefetchSources('zz');
  assert.equal(requests.length - before, 1, 'retried');
  release('zz', payloadFor('zz'));
  assert.deepEqual(await second, payloadFor('zz'));
});

test('the race: a payload that lands between the render and the effect still reaches the block', async () => {
  // handleSearch starts the prefetch; the report renders while it is still in flight.
  const prefetch = prefetchSources('de');
  assert.equal(cachedSources('de'), null, 'render: the block finds nothing and renders null');
  // The response lands after the commit but before the passive effect runs.
  release('de', payloadFor('de'));
  await prefetch;
  assert.deepEqual(cachedSources('de'), payloadFor('de'));
  // The effect: it must still deliver the payload (so the block re-renders), not return early
  // because the cache is already filled.
  const heard = [];
  watchSources('de', (payload) => heard.push(payload));
  await flush();
  assert.deepEqual(heard, [payloadFor('de')]);
});

test('watchSources: delivers once the request lands; its cleanup drops a stale answer; no code is a no-op', async () => {
  const heard = [];
  const stop = watchSources('fr', (payload) => heard.push(payload));
  await flush();
  assert.deepEqual(heard, [], 'nothing before the response');
  release('fr', payloadFor('fr'));
  await flush();
  assert.deepEqual(heard, [payloadFor('fr')]);
  stop();

  const stale = [];
  const stopStale = watchSources('jp', (payload) => stale.push(payload));
  stopStale(); // the code changed (or the block unmounted) before the answer
  release('jp', payloadFor('jp'));
  await flush();
  assert.deepEqual(stale, [], 'a cancelled watch never calls back');
  assert.deepEqual(cachedSources('jp'), payloadFor('jp'), 'the payload is still cached for the next render');

  const none = [];
  const before = requests.length;
  const stopNone = watchSources('', (payload) => none.push(payload));
  assert.equal(typeof stopNone, 'function');
  await flush();
  assert.deepEqual(none, []);
  assert.equal(requests.length, before);
});

test('OfficialSourcesBlock subscribes on every code, with no early return on a cached payload', () => {
  const src = readFileSync(new URL('app/components/OfficialSourcesBlock.js', ROOT), 'utf8');
  assert.match(src, /import \{ cachedSources, watchSources \} from '\.\/officialSourcesCache'/);
  assert.match(src, /useEffect\(\(\) => watchSources\(code, \(payload\) => setFetched\(\{ code, payload \}\)\), \[code\]\);/);
  assert.match(src, /const entry = cachedSources\(code\) \|\| \(fetched && fetched\.code === code \? fetched\.payload : null\);/);
  assert.doesNotMatch(src, /loaded\.has|new Map\(/, 'the cache lives in officialSourcesCache.js only');
  const visa = readFileSync(new URL('app/visa/page.js', ROOT), 'utf8');
  assert.match(visa, /import \{ prefetchSources \} from '\.\.\/components\/officialSourcesCache';/);
  assert.match(visa, /prefetchSources\(targetCountry\);/, '/visa starts the request with the search');
});
