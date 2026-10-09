// JourneySearch helpers: the initial From/To, the Explore link and the Visa page's ?from=.
// Pure and framework-free (storage is injected; unit-tested in stage-helpers.test.mjs).

import { countryByCode } from '../../data/countries195.js';
import { readRoute } from './routeStore.js';

const PROFILE_KEY = 'opportumap_profile';

/** A valid country code (lower case) from a query value / stored value, else null. */
export function countryParam(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const country = countryByCode(value.trim());
  return country ? country.code : null;
}

function profileNationality(storage) {
  try {
    const raw = storage.getItem(PROFILE_KEY);
    if (!raw) return null;
    const profile = JSON.parse(raw);
    return countryParam(profile?.nationality);
  } catch {
    return null;
  }
}

/**
 * Where the search starts: the saved route (readRoute), else the saved profile's nationality
 * as From, else empty. A saved route without a From still takes the profile's nationality.
 * Never throws (storage may be null or throw).
 */
export function initialRoute(storage) {
  if (!storage) return { from: null, to: null };
  const saved = readRoute(storage) || { from: null, to: null };
  return {
    from: saved.from || profileNationality(storage),
    to: saved.to || null,
  };
}

/** Explore →: no destination / Anywhere -> /match; otherwise /visa?from=&to= (empty From omitted). */
export function exploreHref(route) {
  const to = countryParam(route?.to);
  if (!to) return '/match';
  const from = countryParam(route?.from);
  return from ? `/visa?from=${from}&to=${to}` : `/visa?to=${to}`;
}

/** "Check a visa" (boarding pass, route pill): /visa?from=&to=, leaving out empty / 'any' parts. */
export function visaHref(route) {
  const params = [];
  const from = countryParam(route?.from);
  const to = countryParam(route?.to);
  if (from) params.push(`from=${from}`);
  if (to) params.push(`to=${to}`);
  return params.length ? `/visa?${params.join('&')}` : '/visa';
}

/**
 * Visa page prefill. `query` = { from, to } raw ?from= / ?to= values; `saved` = readRoute().
 * A valid query value wins; the saved route fills whatever the query left empty (its To only
 * when it is a real country, never 'any'). `fromRoute` is true when the route supplied a value.
 * Nationality still null -> the caller may try the saved profile (which must not overwrite).
 */
export function visaPrefill(query, saved) {
  const qFrom = countryParam(query?.from);
  const qTo = countryParam(query?.to);
  const rFrom = countryParam(saved?.from);
  const rTo = countryParam(saved?.to); // 'any' is not a country code -> null
  const nationality = qFrom || rFrom || null;
  const destination = qTo || rTo || null;
  const fromRoute = (!qFrom && Boolean(rFrom)) || (!qTo && Boolean(rTo));
  return { nationality, destination, fromRoute };
}

/** Relocate page prefill: ?dest= (capped at 120 chars) wins, else the saved route's To country name. */
export function relocateDestination(dest, saved) {
  if (typeof dest === 'string' && dest.trim()) return dest.slice(0, 120);
  const to = countryParam(saved?.to);
  return to ? countryByCode(to).name : '';
}
