// The UV check on /sources/[code]: the country's real official site beside an invented look-alike.
// Pure, and server-side only: it reads the 195-country table (lib/officialSources), so pages call
// it on the server and hand the client UvCheck just the pair. Unit-tested in
// scripts/site/__tests__/uvPair.test.mjs.
import { getSources, domainOf, linkTypeMeta } from '../lib/officialSources.js';
import { countryByCode } from '../data/countries195.js';
import { fakeDomain } from '../components/kit/fakeDomain.js';

// Which verified link stands for "the real site": the immigration authority, else the first of these.
const REAL_ORDER = ['authority', 'apply', 'embassies', 'work', 'study', 'citizenship'];

// A verified link we can show as the real government site: an https page (the card is a live link).
function realSite(links, type) {
  const link = Object.hasOwn(links, type) ? links[type] : null;
  if (!link || link.status !== 'verified' || typeof link.url !== 'string' || !/^https:\/\//i.test(link.url)) return null;
  const title = typeof link.name === 'string' && link.name.trim() ? link.name.trim() : linkTypeMeta(type).label;
  return { url: link.url, domain: domainOf(link.url), title };
}

/**
 * The pair for one sources entry and country name: `real` = { url, domain, title } of the verified
 * authority link (else the first verified apply / embassies / work / study / citizenship link), or
 * null when nothing is verified; `fake` = { domain: fakeDomain(name) }, a reserved .example name
 * that is shown as plain text, never as a link.
 */
export function uvPairFrom(entry, name) {
  const links = entry && typeof entry.links === 'object' && entry.links ? entry.links : {};
  let real = null;
  for (const type of REAL_ORDER) {
    real = realSite(links, type);
    if (real) break;
  }
  return { real, fake: { domain: fakeDomain(name) } };
}

/** uvPairFrom for a two-letter country code ('ca'), or null for an unknown or junk code. */
export function uvPair(code) {
  if (typeof code !== 'string' || !/^[a-z]{2}$/i.test(code)) return null;
  const country = countryByCode(code);
  const entry = getSources(code);
  if (!country || !entry) return null;
  return uvPairFrom(entry, country.name);
}
