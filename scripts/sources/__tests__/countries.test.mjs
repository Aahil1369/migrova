import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES_195, REGIONS, countryByCode, findCountryInText } from '../../../app/data/countries195.js';

test('exactly 195 unique ISO codes with required fields', () => {
  assert.equal(COUNTRIES_195.length, 195);
  assert.equal(new Set(COUNTRIES_195.map((c) => c.code)).size, 195);
  for (const c of COUNTRIES_195) {
    assert.match(c.code, /^[a-z]{2}$/);
    assert.ok(c.name && c.demonym && c.flag, c.code);
    assert.ok(REGIONS.includes(c.region), `${c.code} region ${c.region}`);
  }
});

test('flag is derived from the code', () => {
  assert.equal(countryByCode('ca').flag, '🇨🇦');
  assert.equal(countryByCode('gb').flag, '🇬🇧');
});

test('countryByCode', () => {
  assert.equal(countryByCode('ca').name, 'Canada');
  assert.equal(countryByCode('CA').name, 'Canada');
  assert.equal(countryByCode('zz'), null);
});

test('findCountryInText matches names and aliases, longest first', () => {
  assert.equal(findCountryInText('Lisbon, Portugal')?.code, 'pt');
  assert.equal(findCountryInText('Toronto, Canada')?.code, 'ca');
  assert.equal(findCountryInText('Dubai, UAE')?.code, 'ae');
  assert.equal(findCountryInText('London UK')?.code, 'gb');
  assert.equal(findCountryInText('New York, USA')?.code, 'us');
  assert.equal(findCountryInText('Niger')?.code, 'ne');
  assert.equal(findCountryInText('Lagos, Nigeria')?.code, 'ng');
  assert.equal(findCountryInText('Juba, South Sudan')?.code, 'ss');
  assert.equal(findCountryInText('Seoul, South Korea')?.code, 'kr');
  assert.equal(findCountryInText('Atlantis'), null);
  assert.equal(findCountryInText(''), null);
});
