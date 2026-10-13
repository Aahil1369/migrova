// Country Match (/match): the route of stamps' pure logic and the API it reads. The 24-hour match
// cache on this device (per profile; blocked storage never throws), the profile's cache key, the
// prompt's country names (never bare ISO2 codes), the links that carry the route, where the five
// stamps sit on the dashed route, what a stamp may say, how the AI's answer is cleaned, the stale-
// response guard, and the one place a tap saves the destination.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);

const {
  MATCH_CACHE_KEY, profileKey, readMatchCache, writeMatchCache, readLastMatch, describeProfile, matchLinks,
  stampSlots, ROUTE_STOPS, ROUTE_BOX, ROUTE_PATH, ROUTE_LENGTH, STAMP_SIZE, pickMatches, stampFace, setDestination, fetchMatches,
  matchPrefill, requestProfile, costLevel,
} = await import(new URL('app/lib/match.js', ROOT));
const { readRoute, ROUTE_KEY } = await import(new URL('app/components/passport/routeStore.js', ROOT));
const { createLatest } = await import(new URL('app/components/kit/createLatest.js', ROOT));
const { friendlyError } = await import(new URL('app/lib/friendlyError.js', ROOT));

// A Storage stand-in, and one that throws on every call (Safari private mode, cookies blocked).
function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    removeItem: (k) => map.delete(k),
    map,
  };
}
const MATCHES_KEY_FOR_TEST = 'migrova_match';
const blocked = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
  removeItem() { throw new Error('SecurityError'); },
};

const HOUR = 60 * 60 * 1000;
const NOW = Date.UTC(2026, 9, 12, 9, 0, 0);
// What the page keeps: pickMatches' answer (every field present).
const MATCHES = pickMatches({ matches: [
  { country_code: 'ca', country_name: 'Canada', match_score: 92, visa_difficulty: 'Moderate' },
  { country_code: 'de', country_name: 'Germany', match_score: 87 },
] });

// ── The match cache ─────────────────────────────────────────────────────────────

test('the match cache: a result written now reads back for 24 hours, then is gone', () => {
  assert.equal(MATCH_CACHE_KEY, 'migrova_match');
  const storage = memoryStorage();
  const key = profileKey({ nationality: 'pk' });
  assert.equal(writeMatchCache(storage, key, MATCHES, NOW), true);
  assert.ok(storage.map.has(MATCH_CACHE_KEY), 'kept under migrova_match');
  assert.deepEqual(readMatchCache(storage, key, NOW), MATCHES);
  assert.deepEqual(readMatchCache(storage, key, NOW + 5 * HOUR), MATCHES, 'within 24h');
  assert.deepEqual(readMatchCache(storage, key, NOW + 24 * HOUR), MATCHES, 'exactly 24h is still fresh');
  assert.equal(readMatchCache(storage, key, NOW + 24 * HOUR + 1), null, 'older than 24h');
  assert.equal(readMatchCache(storage, key, NOW - 1), null, 'saved "in the future" (clock moved back): not trusted');
});

test('the match cache: another profile, nothing saved, junk or blocked storage read as null', () => {
  const storage = memoryStorage();
  const key = profileKey({ nationality: 'pk' });
  assert.equal(readMatchCache(storage, key, NOW), null, 'nothing saved');
  writeMatchCache(storage, key, MATCHES, NOW);
  assert.equal(readMatchCache(storage, profileKey({ nationality: 'in' }), NOW), null, 'another profile');
  for (const junk of ['{', 'null', '42', '[]', '"x"', JSON.stringify({ key, savedAt: NOW, matches: 'nope' }),
    JSON.stringify({ key, savedAt: NOW, matches: [] }), JSON.stringify({ key, savedAt: 'today', matches: MATCHES })]) {
    storage.setItem(MATCH_CACHE_KEY, junk);
    assert.equal(readMatchCache(storage, key, NOW), null, junk);
  }
  assert.equal(readMatchCache(blocked, key, NOW), null);
  assert.equal(readMatchCache(null, key, NOW), null);
  assert.equal(writeMatchCache(blocked, key, MATCHES, NOW), false);
  assert.equal(writeMatchCache(null, key, MATCHES, NOW), false);
  assert.equal(writeMatchCache(memoryStorage(), key, [], NOW), false, 'nothing to keep');
  assert.equal(writeMatchCache(memoryStorage(), key, 'junk', NOW), false);
});

test('the match cache: kept matches are checked again on the way out (junk or an older format never reaches the page)', () => {
  const storage = memoryStorage();
  const key = profileKey({ nationality: 'pk' });
  const profile = { nationality: 'pk' };
  const keep = (matches) => storage.setItem(MATCHES_KEY_FOR_TEST, JSON.stringify({ key, savedAt: NOW, matches, profile }));
  keep([{ country_code: 'xx' }, 'junk', null, 7]);
  assert.equal(readMatchCache(storage, key, NOW), null, 'nothing usable');
  assert.equal(readLastMatch(storage, NOW), null);
  keep([{ country_code: 'ca', match_score: 92 }, { visa_difficulty: { evil: true } }]);
  assert.deepEqual(readMatchCache(storage, key, NOW), pickMatches({ matches: [{ country_code: 'ca', match_score: 92 }] }), 'the usable ones, cleaned');
  assert.equal(readLastMatch(storage, NOW).matches[0].visa_difficulty, '', 'every text field a string');
});

test('readLastMatch: the last fresh result with the profile it ran for (to restore the form after a reload)', () => {
  const storage = memoryStorage();
  const profile = { nationality: 'pk', experience: '3-5', skills: 'Nursing', preferredCountries: ['Europe'], jobTypes: ['Research'] };
  assert.equal(readLastMatch(storage, NOW), null);
  writeMatchCache(storage, profileKey(profile), MATCHES, NOW, profile);
  assert.deepEqual(readLastMatch(storage, NOW + HOUR), { profile, matches: MATCHES });
  assert.equal(readLastMatch(storage, NOW + 24 * HOUR + 1), null, 'stale');
  // A profile that does not match the saved key, or none at all, restores nothing.
  writeMatchCache(storage, profileKey({ nationality: 'in' }), MATCHES, NOW, profile);
  assert.equal(readLastMatch(storage, NOW), null);
  writeMatchCache(storage, profileKey(profile), MATCHES, NOW);
  assert.equal(readLastMatch(storage, NOW), null);
  assert.equal(readLastMatch(blocked, NOW), null);
});

test('profileKey: the five profile fields as stable JSON, lists sorted', () => {
  assert.equal(profileKey({ skills: ['b', 'a'] }), profileKey({ skills: ['a', 'b'] }));
  assert.equal(
    profileKey({ nationality: 'pk', preferredCountries: ['Europe', 'ca'], experience: '3-5' }),
    profileKey({ experience: '3-5', preferredCountries: ['ca', 'Europe'], nationality: 'pk' }),
    'field order and list order do not matter',
  );
  assert.notEqual(profileKey({ nationality: 'pk' }), profileKey({ nationality: 'in' }));
  assert.notEqual(profileKey({ nationality: 'pk', skills: 'Nursing' }), profileKey({ nationality: 'pk', skills: 'Welding' }));
  assert.notEqual(profileKey({ nationality: 'pk', currentCountry: 'ae' }), profileKey({ nationality: 'pk' }));
  assert.notEqual(profileKey({ nationality: 'pk', experience: '0-2' }), profileKey({ nationality: 'pk', experience: '10+' }));
  assert.notEqual(profileKey({ nationality: 'pk', preferredCountries: ['Asia'] }), profileKey({ nationality: 'pk' }));
  // Missing, blank and empty are all "not given"; spaces around a value do not split the cache.
  assert.equal(profileKey({ nationality: 'pk', skills: '', preferredCountries: [] }), profileKey({ nationality: 'pk' }));
  assert.equal(profileKey({ nationality: ' pk ', skills: ['  a'] }), profileKey({ nationality: 'pk', skills: ['a'] }));
  // Other profile fields (name, job types, resume summary) are not part of it.
  assert.equal(profileKey({ nationality: 'pk', name: 'Ali', jobTypes: ['Design'] }), profileKey({ nationality: 'pk' }));
  assert.deepEqual(Object.keys(JSON.parse(profileKey({}))), ['nationality', 'currentCountry', 'experience', 'skills', 'preferredCountries']);
  for (const junk of [undefined, null, 'pk', 42, []]) assert.equal(profileKey(junk), profileKey({}), String(junk));
});

// ── What the AI is told, and the links ──────────────────────────────────────────

test('describeProfile: country names instead of ISO2 codes (Georgia, not the US state "ge")', () => {
  assert.deepEqual(describeProfile({ nationality: 'in', currentCountry: 'ge' }), { nationality: 'India', currentCountry: 'Georgia', preferredRegions: [] });
  assert.deepEqual(
    describeProfile({ nationality: 'PK', currentCountry: 'United States', preferredCountries: ['ca', 'Europe', 'nz'] }),
    { nationality: 'Pakistan', currentCountry: 'United States', preferredRegions: ['Canada', 'Europe', 'New Zealand'] },
    'free text and region names stay as written',
  );
  assert.deepEqual(describeProfile({}), { nationality: '', currentCountry: '', preferredRegions: [] });
  assert.deepEqual(describeProfile(null), { nationality: '', currentCountry: '', preferredRegions: [] });
  assert.deepEqual(describeProfile({ nationality: 'pk', preferredCountries: 'ca' }).preferredRegions, [], 'not a list');
});

test('matchLinks: /visa?from=&to= (the unknown From left out) and /relocate?dest=<name>', () => {
  assert.deepEqual(matchLinks({ from: 'pk', to: 'ca', name: 'Canada' }), { visa: '/visa?from=pk&to=ca', relocate: '/relocate?dest=Canada' });
  assert.equal(matchLinks({ to: 'nz', name: 'New Zealand' }).visa, '/visa?to=nz');
  assert.equal(matchLinks({ to: 'nz', name: 'New Zealand' }).relocate, '/relocate?dest=New%20Zealand');
  assert.equal(matchLinks({ from: 'other', to: 'NZ', name: 'New Zealand' }).visa, '/visa?to=nz', 'a From that is not a country is left out');
  assert.equal(matchLinks({ from: 'pk', to: 'xx', name: 'Atlantis' }).visa, '/visa?from=pk');
  assert.equal(matchLinks({ to: 'ca' }).relocate, '/relocate?dest=Canada', 'the name from the code when none is given');
  assert.deepEqual(matchLinks(), { visa: '/visa', relocate: '/relocate' });
  assert.equal(matchLinks({ to: 'gb', name: 'A&B=C' }).relocate, '/relocate?dest=A%26B%3DC', 'the name is encoded');
});

// ── The route of stamps ─────────────────────────────────────────────────────────

test('stampSlots: up to five spots in percent on the dashed route, rotations alternating -10 / 9', () => {
  const five = stampSlots(5);
  assert.equal(five.length, 5);
  assert.equal(new Set(five.map((s) => `${s.x},${s.y}`)).size, 5, 'distinct');
  for (const s of five) {
    assert.ok(s.x >= 0 && s.x <= 100 && s.y >= 0 && s.y <= 100, JSON.stringify(s));
  }
  assert.deepEqual(five.map((s) => s.rotate), [-10, 9, -10, 9, -10]);
  assert.deepEqual(stampSlots(0), []);
  assert.deepEqual(stampSlots(5), five, 'deterministic');
  assert.equal(stampSlots(9).length, 5, 'never more than five');
  for (const junk of [-1, Number.NaN, undefined, '3']) assert.deepEqual(stampSlots(junk), [], String(junk));
  // Fewer matches spread along the whole route instead of bunching at its start.
  assert.deepEqual(stampSlots(3).map((s) => s.x), [five[0].x, five[2].x, five[4].x]);
  assert.deepEqual(stampSlots(3).map((s) => s.rotate), [-10, 9, -10]);
  assert.deepEqual(stampSlots(1).map((s) => s.x), [five[0].x]);
});

test('the route passes through every stamp spot, inside its box', () => {
  assert.equal(ROUTE_STOPS.length, 5);
  stampSlots(5).forEach((slot, i) => {
    const stop = ROUTE_STOPS[i];
    assert.ok(Math.abs(slot.x - (stop.x / ROUTE_BOX.w) * 100) < 1e-9 && Math.abs(slot.y - (stop.y / ROUTE_BOX.h) * 100) < 1e-9);
    assert.ok(ROUTE_PATH.includes(` ${stop.x} ${stop.y}`), `the path reaches stop ${i + 1}`);
  });
  assert.match(ROUTE_PATH, /^M[\d. ]+(?: C[\d. ]+)+$/, 'a move then cubic curves (no NaN)');
  const numbers = ROUTE_PATH.match(/-?\d+(?:\.\d+)?/g).map(Number);
  for (let i = 0; i < numbers.length; i += 2) {
    assert.ok(numbers[i] >= 0 && numbers[i] <= ROUTE_BOX.w && numbers[i + 1] >= 0 && numbers[i + 1] <= ROUTE_BOX.h, `${numbers[i]},${numbers[i + 1]}`);
  }
  assert.ok(ROUTE_LENGTH > 400 && ROUTE_LENGTH < 2000, `length ${ROUTE_LENGTH}`);
});

test('the five stamps (STAMP_SIZE of the route\'s width) stay inside the route box and never overlap', () => {
  const size = STAMP_SIZE * ROUTE_BOX.w; // units; the stamps are square buttons (round)
  for (const [i, a] of ROUTE_STOPS.entries()) {
    assert.ok(a.x - size / 2 >= 0 && a.x + size / 2 <= ROUTE_BOX.w, `stop ${i + 1} across`);
    assert.ok(a.y - size / 2 >= 0 && a.y + size / 2 <= ROUTE_BOX.h, `stop ${i + 1} down`);
    for (const b of ROUTE_STOPS.slice(i + 1)) {
      assert.ok(Math.abs(a.x - b.x) >= size || Math.abs(a.y - b.y) >= size, `${JSON.stringify(a)} and ${JSON.stringify(b)} overlap`);
    }
  }
  // match.css draws them at that size: STAMP_SIZE of the route box's width (container units).
  const css = readFileSync(new URL('app/match/match.css', ROOT), 'utf8');
  const cqi = `${STAMP_SIZE * 100}cqi`;
  assert.match(css, new RegExp(`\\.mt-stop \\{[^}]*width: ${cqi};[^}]*height: ${cqi};[^}]*margin: -${STAMP_SIZE * 50}cqi 0 0 -${STAMP_SIZE * 50}cqi;`));
  assert.match(css, new RegExp(`aspect-ratio: ${ROUTE_BOX.w} / ${ROUTE_BOX.h};`));
});

test('stampFace: our own country name (never the AI\'s words) and the score, every line at most 11 characters', () => {
  assert.deepEqual(stampFace({ country_code: 'ca', country_name: 'Canada', match_score: 92 }), ['CANADA', '92']);
  assert.deepEqual(stampFace({ country_code: 'nz', country_name: 'New Zealand', match_score: 76 }), ['NEW ZEALAND', '76']);
  assert.deepEqual(stampFace({ country_code: 'gb', country_name: 'United Kingdom', match_score: 84 }), ['UNITED', '84', 'KINGDOM']);
  assert.deepEqual(stampFace({ country_code: 'ae', country_name: 'United Arab Emirates', match_score: 70 }), ['UNITED ARAB', '70', 'EMIRATES']);
  assert.deepEqual(stampFace({ country_code: 'vc', country_name: 'Saint Vincent and the Grenadines', match_score: 5 }), ['VCT', '5']);
  assert.deepEqual(stampFace({ country_code: 'ca', match_score: null }), ['CANADA', '–'], 'no score');
  for (const code of ['ba', 'cf', 'do', 'kn', 'st', 'tt', 'pg', 'ch', 'ag']) {
    for (const line of stampFace({ country_code: code, match_score: 100 })) assert.ok(line.length <= 11, `${code}: ${line}`);
  }
});

test('pickMatches: the AI\'s answer as at most five known countries, best first, nothing trusted', () => {
  const picked = pickMatches({
    matches: [
      { country_code: 'DE', country_name: 'Deutschland', match_score: '87/100', visa_difficulty: ' Moderate ', job_availability: 'High', cost_of_living: '$$$', language_barrier: 'Medium', top_reason: 'Skilled-worker demand.', visa_path: 'EU Blue Card.' },
      { country_code: 'ca', country_name: 'Canada', match_score: 92.4 },
      { country_code: 'zz', country_name: 'United Kingdom', match_score: 140 },
      { country_code: 'xx', country_name: 'Atlantis', match_score: 99 },
      { country_code: 'ca', country_name: 'Canada again', match_score: 91 },
      'junk', null, { match_score: 50 },
      { country_code: 'nz', match_score: 'n/a', top_reason: 42 },
      { country_code: 'ie', match_score: -3 },
      { country_code: 'au', match_score: 60 },
    ],
  });
  assert.deepEqual(picked.map((m) => [m.country_code, m.country_name, m.match_score]), [
    ['gb', 'United Kingdom', 100],
    ['ca', 'Canada', 92],
    ['de', 'Germany', 87],
    ['au', 'Australia', 60],
    ['ie', 'Ireland', 0],
  ]);
  const de = picked[2];
  assert.equal(de.visa_difficulty, 'Moderate');
  assert.equal(de.cost_of_living, '$$$');
  assert.equal(de.top_reason, 'Skilled-worker demand.');
  assert.equal(de.visa_path, 'EU Blue Card.');
  assert.equal(picked[1].visa_path, '', 'missing text is empty');
  const nz = pickMatches({ matches: [{ country_code: 'nz', match_score: 'n/a', top_reason: 42 }] })[0];
  assert.equal(nz.match_score, null, 'no number, no score');
  assert.equal(nz.top_reason, '42');
  for (const junk of [undefined, null, {}, { matches: 'x' }, { matches: [] }, [], 'x']) assert.deepEqual(pickMatches(junk), [], String(junk));
});

test('pickMatches: a code and a name that are two different countries are dropped, never shown as the code\'s', () => {
  // 'ch' is Switzerland, but the reason and visa path were written about China: which country the AI
  // meant is unknown, so neither the card nor "Set as destination" (the saved route) may name one.
  const picked = pickMatches({
    matches: [
      { country_code: 'ch', country_name: 'China', match_score: 95, top_reason: 'Tech hubs in Shenzhen.', visa_path: 'Z visa.' },
      { country_code: 'AT', country_name: 'Australia', match_score: 90 },
      { country_code: 'sk', country_name: 'South Korea', match_score: 88 },
      { country_code: 'cd', country_name: 'Republic of the Congo', match_score: 86 },
      { country_code: 'us', country_name: 'United States', match_score: 80 }, // both agree: kept
      { country_code: 'gb', country_name: 'UK', match_score: 75 }, // an alias of the same country: kept
      { country_code: 'de', country_name: 'Deutschland', match_score: 70 }, // the name is not one we know: the code decides
      { country_code: 'cg', country_name: 'Congo', match_score: 65 }, // "Congo" alone names neither: the code decides
      { country_code: 'cn', country_name: 'China', match_score: 60 }, // a dropped entry does not block the right one
    ],
  });
  assert.deepEqual(picked.map((m) => [m.country_code, m.country_name, m.match_score]), [
    ['us', 'United States', 80],
    ['gb', 'United Kingdom', 75],
    ['de', 'Germany', 70],
    ['cg', 'Republic of the Congo', 65],
    ['cn', 'China', 60],
  ]);
  assert.ok(picked.every((m) => m.top_reason !== 'Tech hubs in Shenzhen.'), 'China\'s reason is never shown under Switzerland');
  // The device cache re-cleans its matches with the same rule.
  assert.deepEqual(pickMatches({ matches: [{ country_code: 'ch', country_name: 'China' }] }), []);
  assert.deepEqual(pickMatches({ matches: [{ country_code: 'ch', country_name: 'Switzerland' }] }).map((m) => m.country_code), ['ch']);
  assert.deepEqual(pickMatches({ matches: [{ country_code: '', country_name: 'China' }] }).map((m) => m.country_code), ['cn'], 'no code: the name decides');
});

// ── Picking a destination (explicit tap only) ───────────────────────────────────

test('setDestination: saves From -> the match as the route and tells the page; blocked storage says no', () => {
  const storage = memoryStorage();
  let told = 0;
  assert.equal(setDestination(storage, { from: 'pk', to: 'ca' }, () => { told += 1; }), true);
  assert.deepEqual(readRoute(storage), { from: 'pk', to: 'ca' });
  assert.equal(told, 1, 'the route pill is told once');
  assert.equal(setDestination(storage, { from: 'other', to: 'nz' }, () => { told += 1; }), true, 'a From that is not a country is left unset');
  assert.deepEqual(readRoute(storage), { from: null, to: 'nz' });
  assert.equal(setDestination(storage, { from: 'pk', to: 'xx' }, () => { told += 1; }), false);
  assert.deepEqual(readRoute(storage), { from: null, to: 'nz' }, 'an unknown country is never saved');
  assert.equal(setDestination(blocked, { from: 'pk', to: 'ca' }, () => { told += 1; }), false);
  assert.equal(setDestination(null, { from: 'pk', to: 'ca' }, () => { told += 1; }), false);
  assert.equal(told, 2, 'nothing is announced when nothing was saved');
  assert.ok(storage.map.has(ROUTE_KEY));
});

// ── The form's prefill ──────────────────────────────────────────────────────────

test('matchPrefill: nationality from the saved route\'s From, else the profile; the rest from the profile', () => {
  const profile = { nationality: 'in', currentCountry: 'United Arab Emirates', experience: '3-5', skills: ['Python', 'SQL'], preferredCountries: ['ca', 'Europe'], jobTypes: ['Research'] };
  assert.deepEqual(matchPrefill({ route: { from: 'pk', to: null }, profile }), {
    value: { nationality: 'pk', currentCountry: 'ae', experience: '3-5', skills: 'Python, SQL', preferredCountries: ['ca', 'Europe'] },
    nationalityFrom: 'route',
  });
  assert.deepEqual(matchPrefill({ route: null, profile: { ...profile, currentCountry: 'ae', skills: ' Nursing ' } }).value,
    { nationality: 'in', currentCountry: 'ae', experience: '3-5', skills: 'Nursing', preferredCountries: ['ca', 'Europe'] });
  assert.equal(matchPrefill({ route: null, profile }).nationalityFrom, 'profile');
  assert.deepEqual(matchPrefill({ route: { from: 'pk', to: 'ca' } }), {
    value: { nationality: 'pk', currentCountry: '', experience: '', skills: '', preferredCountries: [] },
    nationalityFrom: 'route',
  });
  const junk = matchPrefill({ route: { from: 'xx' }, profile: { nationality: 'other', currentCountry: 'Narnia', experience: 'lots', skills: 7, preferredCountries: 'Asia' } });
  assert.deepEqual(junk, { value: { nationality: '', currentCountry: '', experience: '', skills: '', preferredCountries: [] }, nationalityFrom: null });
  assert.deepEqual(matchPrefill(), junk);
});

test('requestProfile: the form\'s five fields plus the saved profile\'s job types, nothing else (no name)', () => {
  const form = { nationality: 'pk', currentCountry: '', experience: '3-5', skills: 'Nursing', preferredCountries: ['Europe'] };
  const saved = { name: 'Ali', nationality: 'in', jobTypes: ['Research', 7, ''], resumeSummary: 'x'.repeat(9000), rememberOnDevice: true };
  assert.deepEqual(requestProfile(form, saved), { ...form, jobTypes: ['Research'] });
  assert.deepEqual(requestProfile(form, null), form);
  assert.deepEqual(requestProfile(form, { jobTypes: 'Design' }), form);
  assert.equal(profileKey(requestProfile(form, saved)), profileKey(form), 'job types do not split the cache');
  assert.deepEqual(requestProfile({ nationality: 'pk', extra: 1 }), { nationality: 'pk', currentCountry: '', experience: '', skills: '', preferredCountries: [] });
});

test('costLevel: the AI\'s $ signs in words', () => {
  assert.deepEqual(costLevel('$'), { signs: '$', word: 'Low' });
  assert.deepEqual(costLevel(' $$ '), { signs: '$$', word: 'Moderate' });
  assert.deepEqual(costLevel('$$$'), { signs: '$$$', word: 'High' });
  assert.deepEqual(costLevel('$$$$'), { signs: '$$$$', word: 'Very high' });
  assert.deepEqual(costLevel('Moderate'), { signs: '', word: 'Moderate' }, 'words stay as written');
  assert.deepEqual(costLevel(undefined), { signs: '', word: '' });
});

// ── The request, under the page's stale-response guard ──────────────────────────

test('fetchMatches: the newest search wins; a failure is the friendly sentence; the answer is cleaned', async () => {
  const latest = createLatest();
  const answer = { matches: [{ country_code: 'ca', match_score: 92 }, { country_code: 'xx', match_score: 99 }] };
  const sent = [];
  const slow = (url, body) => { sent.push([url, body]); return new Promise((r) => setTimeout(() => r(answer), 20)); };
  const first = fetchMatches(latest, { nationality: 'pk' }, { post: slow });
  const second = fetchMatches(latest, { nationality: 'in' }, { post: async (url, body) => { sent.push([url, body]); return answer; } });
  assert.equal(await first, null, 'the older search is dropped');
  const won = await second;
  assert.deepEqual(won.matches.map((m) => m.country_code), ['ca']);
  assert.equal(typeof won.id, 'number');
  assert.deepEqual(sent.map(([url]) => url), ['/api/country-match', '/api/country-match']);
  assert.deepEqual(sent[1][1], { profile: { nationality: 'in' } });
  // "Refresh matches" asks the AI again: the request says so (the route then skips its own cache).
  await fetchMatches(latest, { nationality: 'in' }, { refresh: true, post: async (url, body) => { sent.push([url, body]); return answer; } });
  assert.deepEqual(sent[2][1], { profile: { nationality: 'in' }, refresh: true });
  for (const bad of [async () => null, async () => ({ matches: [] }), async () => { throw new Error('offline'); }]) {
    const failed = await fetchMatches(latest, { nationality: 'pk' }, { post: bad });
    assert.deepEqual(failed, { id: failed.id, error: friendlyError('match') });
  }
});

// ── The route itself, against a stand-in for api.groq.com ───────────────────────

let groqCalls = 0;
let lastPrompt = '';
let answer = {};
const server = http.createServer((req, res) => {
  let body = '';
  req.on('data', (chunk) => { body += chunk; });
  req.on('end', () => {
    groqCalls += 1;
    try { lastPrompt = JSON.parse(body).messages[0].content; } catch { lastPrompt = ''; }
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      id: 'x', object: 'chat.completion', created: 0, model: 'm',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: typeof answer === 'string' ? answer : JSON.stringify(answer) } }],
    }));
  });
});

let route;
before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  route = await import(new URL('app/api/country-match/route.js', ROOT));
});
after(() => {
  server.closeAllConnections();
  server.close();
});

const post = async (body) => {
  const res = await route.POST(new Request('http://localhost/api/country-match', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: res.status, data: await res.json() };
};

test('the country-match prompt names countries (India, Georgia), never bare ISO2 codes', async () => {
  answer = { matches: [{ country_code: 'ca', country_name: 'Canada', match_score: 90 }] };
  const { status } = await post({ profile: { nationality: 'in', currentCountry: 'ge', preferredCountries: ['nz', 'Europe'], skills: 'Nursing' } });
  assert.equal(status, 200);
  assert.match(lastPrompt, /- Nationality: India\n/);
  assert.match(lastPrompt, /- Currently in: Georgia\n/);
  assert.match(lastPrompt, /- Preferred regions: New Zealand, Europe\n/);
  assert.doesNotMatch(lastPrompt, /Nationality: in\b|Currently in: ge\b/);
});

test('the country-match route answers cleaned matches, caches per profile, and never caches junk', async () => {
  answer = { matches: [{ country_code: 'DE', country_name: 'Deutschland', match_score: '88' }, { country_code: 'xx', match_score: 99 }] };
  const start = groqCalls;
  const profile = { nationality: 'pk', skills: ['b', 'a'], experience: 'cache-test' };
  const first = await post({ profile });
  assert.equal(first.status, 200);
  assert.deepEqual(first.data.matches.map((m) => [m.country_code, m.country_name, m.match_score]), [['de', 'Germany', 88]]);
  await post({ profile: { ...profile, skills: ['a', 'b'] } });
  assert.equal(groqCalls - start, 1, 'the same profile is served from the cache');
  // "Refresh matches" asks the AI again, and its answer replaces the cached one.
  answer = { matches: [{ country_code: 'nz', match_score: 70 }] };
  const refreshed = await post({ profile, refresh: true });
  assert.equal(groqCalls - start, 2, 'a refresh is not served from the cache');
  assert.deepEqual(refreshed.data.matches.map((m) => m.country_code), ['nz']);
  assert.deepEqual((await post({ profile })).data.matches.map((m) => m.country_code), ['nz'], 'the new answer is cached');
  assert.equal(groqCalls - start, 2);

  // The real error goes to the server log (kept out of the test output); the visitor reads the calm sentence.
  const logged = [];
  const consoleError = console.error;
  console.error = (...args) => logged.push(args.map(String).join(' '));
  try {
    answer = 'not json at all';
    const junkProfile = { nationality: 'pk', experience: 'junk-test' };
    const failed = await post({ profile: junkProfile });
    assert.equal(failed.status, 500);
    assert.deepEqual(failed.data, { error: friendlyError('match') });
    answer = { matches: [{ country_code: 'xx', country_name: 'Atlantis', match_score: 99 }] };
    assert.equal((await post({ profile: junkProfile })).status, 500, 'no known country is an error too');
  } finally {
    console.error = consoleError;
  }
  assert.equal(logged.length, 2);
  assert.match(logged[1], /no known country/);
  assert.equal(groqCalls - start, 4, 'a junk answer was not cached');

  assert.equal((await post({ profile: {} })).status, 400, 'nationality is required');
});
