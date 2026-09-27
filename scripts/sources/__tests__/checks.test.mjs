import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judge, contentMatches } from '../lib/checks.mjs';

const CA = ['canada.ca', 'gc.ca'];
const ok = (finalUrl, text = 'Immigration and visas for Canada') => ({ finalUrl, status: 200, text });
const base = {
  type: 'authority',
  candidate: { name: 'Immigration, Refugees and Citizenship Canada (IRCC)', url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html' },
  govDomains: CA,
  wikidataHosts: new Set(['canada.ca']),
  linkedFromPage: null,
};

test('gov domain + wikidata corroboration → verified', () => {
  const r = judge({ ...base, page: ok('https://www.canada.ca/en/immigration-refugees-citizenship.html') });
  assert.equal(r.status, 'verified');
  assert.deepEqual(r.evidence, ['https', 'content', 'gov-domain', 'wikidata']);
});

test('fetch error → not verified', () => {
  const r = judge({ ...base, page: { error: 'timeout' } });
  assert.equal(r.status, 'not_verified');
  assert.equal(r.reason, 'fetch:timeout');
});

test('http final URL → not verified', () => {
  const r = judge({ ...base, page: ok('http://www.canada.ca/en/immigration.html') });
  assert.equal(r.reason, 'http');
});

test('non-2xx → not verified', () => {
  const r = judge({ ...base, page: { finalUrl: 'https://www.canada.ca/x', status: 404, text: 'Immigration' } });
  assert.equal(r.reason, 'status:404');
});

test('page not about the topic → not verified', () => {
  const r = judge({ ...base, page: ok('https://www.canada.ca/en/weather.html', 'Weather forecast for Ottawa') });
  assert.equal(r.reason, 'content');
});

test('gov domain without any corroboration → not verified', () => {
  const r = judge({ ...base, wikidataHosts: new Set(), page: ok('https://www.canada.ca/en/immigration.html') });
  assert.equal(r.reason, 'corroboration');
});

test('gov domain corroborated by a linking gov page', () => {
  const r = judge({
    ...base,
    wikidataHosts: new Set(),
    page: ok('https://ircc.canada.ca/english/apply.asp', 'Apply for a visa online'),
    linkedFromPage: { finalUrl: 'https://www.canada.ca/en/services.html', status: 200, text: '', hrefs: ['https://ircc.canada.ca/english/apply.asp'] },
  });
  assert.equal(r.status, 'verified');
  assert.deepEqual(r.evidence, ['https', 'content', 'gov-domain', 'linked-from:https://www.canada.ca/en/services.html']);
});

test('redirect to a non-gov host without linked-from → rejected', () => {
  const r = judge({ ...base, page: ok('https://canada-visa.com/apply', 'Canada visa application') });
  assert.equal(r.status, 'not_verified');
  assert.equal(r.reason, 'domain:canada-visa.com');
});

test('non-gov host allowed only when a verified gov page links to it', () => {
  const sa = { type: 'apply', candidate: { name: 'Saudi e-visa', url: 'https://visa.visitsaudi.com/' }, govDomains: ['gov.sa'], wikidataHosts: new Set() };
  const page = ok('https://visa.visitsaudi.com/', 'Apply for your tourist visa online');
  const linking = { finalUrl: 'https://www.mofa.gov.sa/en/eservices', status: 200, text: '', hrefs: ['https://visa.visitsaudi.com/'] };
  const r = judge({ ...sa, page, linkedFromPage: linking });
  assert.equal(r.status, 'verified');
  assert.deepEqual(r.evidence, ['https', 'content', 'linked-from:https://www.mofa.gov.sa/en/eservices']);

  const notLinking = { ...linking, hrefs: ['https://www.mofa.gov.sa/en/about'] };
  assert.equal(judge({ ...sa, page, linkedFromPage: notLinking }).reason, 'domain:visa.visitsaudi.com');

  const offGovLinker = { ...linking, finalUrl: 'https://some-blog.com/saudi-visa' };
  assert.equal(judge({ ...sa, page, linkedFromPage: offGovLinker }).reason, 'domain:visa.visitsaudi.com');

  const brokenLinker = { error: 'status:500' };
  assert.equal(judge({ ...sa, page, linkedFromPage: brokenLinker }).reason, 'domain:visa.visitsaudi.com');
});

test('contentMatches uses type keywords, candidate name and candidate keywords', () => {
  assert.ok(contentMatches('embassies', { name: 'x' }, 'Nos ambassades et consulats'));
  assert.ok(contentMatches('citizenship', { name: 'x' }, 'Einbürgerung in Deutschland'));
  assert.ok(contentMatches('authority', { name: 'x', keywords: ['extranjería'] }, 'Portal de Extranjería'));
  assert.ok(contentMatches('authority', { name: 'Útlendingastofnun (Directorate of Immigration)' }, 'Útlendingastofnun forsíða'));
  assert.ok(!contentMatches('study', { name: 'x' }, 'Tax return deadlines'));
});
