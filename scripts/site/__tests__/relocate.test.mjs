// Relocation Guide (/relocate): the boarding pass's pure logic and the API it reads. Ticket codes
// (always 3 letters), the fare box's budget tiers, the six chapters and which AI fields each one
// holds (every field the route asks for, in exactly one chapter), the device keys of the stub and
// the before-you-move checklist, the stale-response guard, and the route's cache key and shape.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const read = (path) => readFileSync(new URL(path, ROOT), 'utf8');

const {
  RELOCATE_CHAPTERS, ticketCode, budgetTiers, chaptersFor, stubKey, beforeKey, cityName, admittedStamp,
  weekPlan, saveWeekPlan, savedWeekPlan, telHref, safeUrl, visaLink, fetchGuide, relocatePrefill, usd,
} = await import(new URL('app/lib/relocate.js', ROOT));
const { RELOCATION_FIELDS, relocationCacheKey } = await import(new URL('app/api/relocation/fields.js', ROOT));
const { checklistKey } = await import(new URL('app/components/kit/checklistStore.js', ROOT));
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
const blocked = {
  getItem() { throw new Error('SecurityError'); },
  setItem() { throw new Error('QuotaExceededError'); },
};

// The top-level keys of the JSON shape the relocation prompt asks the AI for.
function promptKeys() {
  const src = read('app/api/relocation/route.js');
  const shape = /with this exact structure:\r?\n\{\r?\n([\s\S]*?)\r?\n\}\r?\n/.exec(src)?.[1];
  assert.ok(shape, 'found the JSON shape in the relocation prompt');
  return [...shape.matchAll(/^ {2}"(\w+)"\s*:/gm)].map((m) => m[1]);
}

test('ticketCode: the ISO3 code of the country named in the place, else its first three letters', () => {
  assert.equal(ticketCode('Toronto, Canada'), 'CAN');
  assert.equal(ticketCode('Lahore'), 'LAH');
  assert.equal(ticketCode('Saint Vincent and the Grenadines'), 'VCT');
  assert.equal(ticketCode('Pakistan'), 'PAK');
  assert.equal(ticketCode('London, UK'), 'GBR');
  assert.equal(ticketCode('Dubai, UAE'), 'ARE');
  assert.equal(ticketCode(''), 'XXX');
  assert.equal(ticketCode('Ōsaka!'), 'OSA');
  assert.equal(ticketCode('St. Al'), 'STA');
  assert.equal(ticketCode('Al'), 'ALX');
  assert.equal(ticketCode('東京'), 'XXX');
  for (const junk of [undefined, null, 42, {}, ['Canada'], '   ', '!!!', 'x'.repeat(500)]) {
    assert.match(ticketCode(junk), /^[A-Z]{3}$/, String(junk));
  }
});

test('budgetTiers: Budget / Comfortable / Luxury as $1,234/mo, dropping anything that is not an amount', () => {
  assert.deepEqual(budgetTiers({ budget: 1200, comfortable: 2400, luxury: 'n/a' }), [
    { label: 'Budget', amount: '$1,200/mo' },
    { label: 'Comfortable', amount: '$2,400/mo' },
  ]);
  assert.deepEqual(budgetTiers({ luxury: 12000.4, budget: '1,800', comfortable: '$2,950' }), [
    { label: 'Budget', amount: '$1,800/mo' },
    { label: 'Comfortable', amount: '$2,950/mo' },
    { label: 'Luxury', amount: '$12,000/mo' },
  ]);
  assert.deepEqual(budgetTiers({ budget: 0, comfortable: -5, luxury: Number.NaN }), []);
  assert.deepEqual(budgetTiers({ budget: Infinity, comfortable: '12 to 15', luxury: null }), []);
  for (const junk of [undefined, null, 'cheap', 1200, [1200, 2400]]) assert.deepEqual(budgetTiers(junk), [], String(junk));
});

test('usd: a bare AI amount reads as dollars per month / year; anything else is kept as written', () => {
  assert.equal(usd('2500', 'mo'), '$2,500/mo');
  assert.equal(usd(95000, 'yr'), '$95,000/yr');
  assert.equal(usd('$1,800', 'mo'), '$1,800/mo');
  assert.equal(usd('45'), '$45');
  assert.equal(usd('$1,200 - $1,500', 'mo'), '$1,200 - $1,500');
  assert.equal(usd(' about 45 USD ', 'mo'), 'about 45 USD');
  assert.equal(usd(0, 'mo'), '0', 'not an amount: kept as written');
  for (const junk of ['', '  ', null, undefined, {}, []]) assert.equal(usd(junk, 'mo'), '', String(junk));
});

test('RELOCATE_CHAPTERS: the six chapters, in order, with their ids and labels', () => {
  assert.deepEqual(
    RELOCATE_CHAPTERS.map((c) => [c.id, c.label]),
    [['money', 'Money'], ['living', 'Living'], ['work', 'Work'], ['safety', 'Safety'], ['settling', 'Settling in'], ['culture', 'Culture']],
  );
  assert.ok(Object.isFrozen(RELOCATE_CHAPTERS) && RELOCATE_CHAPTERS.every((c) => Object.isFrozen(c) && Object.isFrozen(c.keys)));
});

test('every field the relocation prompt asks for is in exactly one chapter (RELOCATION_FIELDS)', () => {
  const keys = promptKeys();
  assert.ok(keys.length >= 20, `parsed ${keys.length} prompt keys`);
  assert.deepEqual(keys, [...RELOCATION_FIELDS], 'RELOCATION_FIELDS lists the prompt shape, in order');
  const seen = RELOCATE_CHAPTERS.flatMap((c) => c.keys);
  for (const field of RELOCATION_FIELDS) {
    assert.equal(seen.filter((k) => k === field).length, 1, `${field} is in exactly one chapter`);
  }
  for (const key of seen) assert.ok(RELOCATION_FIELDS.includes(key), `chapter key ${key} is a real field`);
  // The ones the spec places by name.
  const chapterOf = (field) => RELOCATE_CHAPTERS.find((c) => c.keys.includes(field))?.id;
  assert.equal(chapterOf('costBreakdown'), 'money');
  assert.equal(chapterOf('monthlyBudget'), 'money');
  assert.equal(chapterOf('bankingSetup'), 'money');
  assert.equal(chapterOf('taxInfo'), 'money');
  assert.equal(chapterOf('neighborhoods'), 'living');
  assert.equal(chapterOf('climate'), 'living');
  assert.equal(chapterOf('healthcareInfo'), 'living');
  assert.equal(chapterOf('jobMarket'), 'work');
  assert.equal(chapterOf('workCulture'), 'work');
  assert.equal(chapterOf('safetyInfo'), 'safety');
  assert.equal(chapterOf('emergencyNumbers'), 'safety');
  assert.equal(chapterOf('beforeYouMove'), 'settling');
  assert.equal(chapterOf('firstMonthTips'), 'settling');
  assert.equal(chapterOf('simAndInternet'), 'settling');
  assert.equal(chapterOf('visaPathSummary'), 'settling');
  assert.equal(chapterOf('culturalTips'), 'culture');
  assert.equal(chapterOf('expatCommunities'), 'culture');
});

test('chaptersFor: only the chapters with at least one present field, in chapter order', () => {
  assert.deepEqual(chaptersFor({ costBreakdown: {}, safetyInfo: {} }).map((c) => c.id), ['money', 'safety']);
  assert.deepEqual(chaptersFor({ culturalTips: { dos: ['x'] }, overview: 'Calm city.' }).map((c) => c.id), ['living', 'culture']);
  // null (the route's "missing"), blank strings and empty lists do not open a chapter.
  assert.deepEqual(chaptersFor({ costBreakdown: null, beforeYouMove: [], taxInfo: '  ', jobMarket: { overview: 'Busy.' } }).map((c) => c.id), ['work']);
  for (const junk of [undefined, null, 'guide', 42, []]) assert.deepEqual(chaptersFor(junk), [], String(junk));
  const all = Object.fromEntries(RELOCATION_FIELDS.map((f) => [f, 'x']));
  assert.deepEqual(chaptersFor(all).map((c) => c.id), RELOCATE_CHAPTERS.map((c) => c.id));
});

test('stubKey and beforeKey: per-destination device keys (the checklist one carries a list fingerprint)', () => {
  assert.equal(stubKey('Toronto, Canada'), checklistKey(['relocate-week1', 'Toronto, Canada']));
  assert.equal(stubKey('Toronto, Canada'), 'migrova_check:relocate-week1:toronto-canada');
  assert.equal(beforeKey('Toronto, Canada'), checklistKey(['relocate', 'Toronto, Canada']));
  // Ticks are saved by position: a re-run that returns another list must not inherit them.
  const items = ['Get a work permit', 'Book a flat'];
  const keyed = beforeKey('Toronto, Canada', items);
  assert.match(keyed, /^migrova_check:relocate:toronto-canada:[0-9a-z]{7}$/);
  assert.equal(beforeKey('Toronto, Canada', [...items]), keyed, 'the same list keeps its ticks');
  assert.notEqual(beforeKey('Toronto, Canada', ['Book a flat', 'Get a work permit']), keyed);
  assert.notEqual(beforeKey('Berlin, Germany', items), keyed);
});

test('cityName and admittedStamp: the city for the ticket and its ADMITTED stamp (lines of at most 18 characters)', () => {
  assert.equal(cityName('Toronto, Canada'), 'Toronto');
  assert.equal(cityName('  Singapore '), 'Singapore');
  assert.equal(cityName(''), '');
  assert.equal(cityName(undefined), '');
  assert.deepEqual(admittedStamp('Toronto', 'CAN'), ['ADMITTED', 'TORONTO']);
  assert.deepEqual(admittedStamp('Rio de Janeiro', 'BRA'), ['ADMITTED', 'RIO DE JANEIRO']);
  assert.deepEqual(admittedStamp('São Paulo 🇧🇷', 'BRA'), ['ADMITTED', 'SÃO PAULO']);
  // Too long for the stamp: its 3-letter code instead (never a word cut in half).
  assert.deepEqual(admittedStamp('Saint Vincent and the Grenadines', 'VCT'), ['ADMITTED', 'VCT']);
  assert.deepEqual(admittedStamp('', 'CAN'), ['ADMITTED', 'CAN']);
  for (const city of ['x'.repeat(40), 'Llanfairpwllgwyngyll', '🇨🇦']) {
    for (const line of admittedStamp(city, 'XXX')) assert.ok(line.length > 0 && line.length <= 18, line);
  }
});

test('weekPlan: the first-month tips for the stub (trimmed strings, at most five)', () => {
  assert.deepEqual(weekPlan({ firstMonthTips: [' Get a SIM ', '', 42, null, 'Open a bank account'] }), ['Get a SIM', 'Open a bank account']);
  assert.equal(weekPlan({ firstMonthTips: Array.from({ length: 9 }, (_, i) => `Tip ${i}`) }).length, 5);
  for (const junk of [undefined, null, {}, { firstMonthTips: 'Get a SIM' }]) assert.deepEqual(weekPlan(junk), [], JSON.stringify(junk));
});

test('saveWeekPlan / savedWeekPlan: the torn stub kept on this device; blocked storage never throws', () => {
  const storage = memoryStorage();
  assert.equal(savedWeekPlan(storage, 'Toronto, Canada'), null);
  assert.equal(saveWeekPlan(storage, 'Toronto, Canada', ['Get a SIM', 'Open a bank account'], 1_000), true);
  assert.deepEqual(JSON.parse(storage.map.get(stubKey('Toronto, Canada'))), { items: ['Get a SIM', 'Open a bank account'], savedAt: 1_000 });
  assert.deepEqual(savedWeekPlan(storage, 'Toronto, Canada'), ['Get a SIM', 'Open a bank account']);
  assert.equal(savedWeekPlan(storage, 'Berlin, Germany'), null, 'per destination');
  for (const junk of ['not json', '[0,1]', '{"items":"x"}', 'null']) {
    storage.setItem(stubKey('Lisbon'), junk);
    assert.equal(savedWeekPlan(storage, 'Lisbon'), null, junk);
  }
  assert.equal(saveWeekPlan(blocked, 'Toronto, Canada', ['Get a SIM']), false);
  assert.equal(savedWeekPlan(blocked, 'Toronto, Canada'), null);
  assert.equal(saveWeekPlan(null, 'Toronto, Canada', ['Get a SIM']), false);
  assert.equal(savedWeekPlan(null, 'Toronto, Canada'), null);
});

test('telHref: a tap-to-call link for the first number in an emergency entry', () => {
  assert.equal(telHref('911'), 'tel:911');
  assert.equal(telHref(112), 'tel:112');
  assert.equal(telHref('112 or 999'), 'tel:112');
  assert.equal(telHref('+44 20 7946 0000'), 'tel:+442079460000');
  assert.equal(telHref('1-1-0'), 'tel:110');
  for (const junk of ['N/A', '', undefined, null, {}, 'none']) assert.equal(telHref(junk), '', String(junk));
});

test('safeUrl: only http(s) web addresses become links', () => {
  assert.equal(safeUrl('https://www.internations.org/toronto-expats'), 'https://www.internations.org/toronto-expats');
  assert.equal(safeUrl('http://example.org'), 'http://example.org/');
  assert.equal(safeUrl('meetup.com/toronto-expats'), 'https://meetup.com/toronto-expats');
  for (const junk of ['javascript:alert(1)', 'data:text/html,hi', 'Facebook group: Expats in Toronto', '<URL if known>', 'N/A', '', undefined, 42, 'ftp://x.org']) {
    assert.equal(safeUrl(junk), '', String(junk));
  }
});

test('visaLink: the visa check for this move carries the route when the countries are known', () => {
  assert.equal(visaLink({ origin: 'Pakistan', destination: 'Toronto, Canada' }), '/visa?from=pk&to=ca');
  assert.equal(visaLink({ origin: 'Lahore', destination: 'Toronto, Canada' }), '/visa?to=ca');
  assert.equal(visaLink({ origin: 'Pakistan', destination: 'Atlantis' }), '/visa?from=pk');
  assert.equal(visaLink({}), '/visa');
});

test('relocatePrefill: ?dest= or the saved To; origin from the saved route From (as a name), else the profile', () => {
  assert.deepEqual(
    relocatePrefill({ dest: 'Portugal', route: { from: 'pk', to: 'ca' }, profile: { currentCountry: 'UAE', jobTypes: ['Data Science / ML'] } }),
    { destination: 'Portugal', origin: 'Pakistan', originFrom: 'route', field: 'Data Science' },
  );
  assert.deepEqual(
    relocatePrefill({ dest: null, route: { from: null, to: 'ca' }, profile: { currentCountry: ' Lagos, Nigeria ', jobTypes: ['Nursing'] } }),
    { destination: 'Canada', origin: 'Lagos, Nigeria', originFrom: 'profile', field: 'Nursing' },
  );
  assert.deepEqual(relocatePrefill({ route: { from: 'pk', to: 'any' } }), { destination: '', origin: 'Pakistan', originFrom: 'route', field: '' });
  assert.deepEqual(relocatePrefill({}), { destination: '', origin: '', originFrom: null, field: '' });
  for (const profile of ['UAE', ['UAE'], { currentCountry: 42, jobTypes: 'Nursing' }, null]) {
    assert.deepEqual(relocatePrefill({ profile }), { destination: '', origin: '', originFrom: null, field: '' }, JSON.stringify(profile));
  }
});

test('fetchGuide: a newer search wins; the older response is dropped (null)', async () => {
  const latest = createLatest();
  const answers = new Map();
  const post = (url, body) => new Promise((resolve) => answers.set(body.destination, { url, resolve }));
  const first = fetchGuide(latest, { destination: 'Toronto, Canada' }, post);
  const second = fetchGuide(latest, { destination: 'Berlin, Germany' }, post);
  assert.equal(answers.get('Toronto, Canada').url, '/api/relocation');
  // The second answer lands first, then the first one: only the second is kept.
  answers.get('Berlin, Germany').resolve({ overview: 'Berlin' });
  answers.get('Toronto, Canada').resolve({ overview: 'Toronto' });
  const [a, b] = await Promise.all([first, second]);
  assert.equal(a, null, 'the stale Toronto response is dropped');
  assert.deepEqual(b.data, { overview: 'Berlin' });
  assert.ok(latest.isCurrent(b.id));
  // A failed call (post resolves null) gives the friendly sentence, never the raw error.
  const failed = await fetchGuide(latest, { destination: 'Lisbon' }, async () => null);
  assert.deepEqual(failed, { id: failed.id, error: friendlyError('relocation') });
});

test('relocationCacheKey: destination, origin and field all count (and cannot run into each other)', () => {
  const key = relocationCacheKey({ destination: 'Toronto', origin: 'Lahore', field: 'Nursing' });
  assert.notEqual(key, relocationCacheKey({ destination: 'Toronto', origin: 'Lahore', field: 'Software' }));
  assert.notEqual(key, relocationCacheKey({ destination: 'Toronto', origin: 'Lahore' }));
  assert.equal(key, relocationCacheKey({ destination: ' toronto ', origin: 'LAHORE', field: 'nursing ' }), 'case and spaces do not split the cache');
  assert.notEqual(relocationCacheKey({ destination: 'a:b', origin: 'c' }), relocationCacheKey({ destination: 'a', origin: 'b:c' }));
});

// ── The route itself, against a stand-in for api.groq.com ───────────────────────

let groqCalls = 0;
let answer = {};
const server = http.createServer((req, res) => {
  req.resume();
  req.on('end', () => {
    groqCalls += 1;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({
      id: 'x', object: 'chat.completion', created: 0, model: 'm',
      choices: [{ index: 0, finish_reason: 'stop', message: { role: 'assistant', content: JSON.stringify(answer) } }],
    }));
  });
});

let route;
before(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  process.env.GROQ_API_KEY = 'test-key';
  process.env.GROQ_BASE_URL = `http://127.0.0.1:${server.address().port}`;
  route = await import(new URL('app/api/relocation/route.js', ROOT));
});
after(() => {
  server.closeAllConnections();
  server.close();
});

const post = async (body) => {
  const res = await route.POST(new Request('http://localhost/api/relocation', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  }));
  return { status: res.status, data: await res.json() };
};

test('the relocation route answers exactly RELOCATION_FIELDS (missing ones null, extras dropped)', async () => {
  answer = { overview: 'A calm, cold city.', monthlyBudget: { budget: 1800 }, firstMonthTips: ['Get a SIM'], connections: [1], madeUp: 'x' };
  const { status, data } = await post({ destination: 'Toronto-shape', origin: 'Lahore' });
  assert.equal(status, 200);
  assert.deepEqual(Object.keys(data).sort(), [...RELOCATION_FIELDS].sort());
  assert.equal(data.overview, 'A calm, cold city.');
  assert.deepEqual(data.monthlyBudget, { budget: 1800 });
  assert.equal(data.safetyInfo, null);
  assert.equal(data.connections, undefined, 'no community posts any more');
});

test('the relocation route caches per destination, origin AND field', async () => {
  answer = { overview: 'Cached.' };
  const start = groqCalls;
  await post({ destination: 'Lisbon-cache', origin: 'Lagos', field: 'Nursing' });
  await post({ destination: 'Lisbon-cache', origin: 'Lagos', field: 'Nursing' });
  assert.equal(groqCalls - start, 1, 'the same search is served from the cache');
  await post({ destination: 'Lisbon-cache', origin: 'Lagos', field: 'Software Engineering' });
  assert.equal(groqCalls - start, 2, 'another field is another guide');
});

test('the relocation route no longer queries community posts', () => {
  const src = read('app/api/relocation/route.js');
  assert.doesNotMatch(src, /getCommunityConnections|supabase|\.from\('posts'\)/);
});
