// The small per-country slice of the official-sources table that /api/sources/[code] serves,
// so the visa and relocation pages fetch one country (about 1 KB) instead of bundling all 195.
import { getSources, SOURCES_VERIFIED_AT } from './officialSources.js';
import { countryByCode } from '../data/countries195.js';

/**
 * { code, name, flag, links, domains, verifiedAt } for a two-letter country code, or null when
 * the code is not exactly two letters or there is no entry for it. `links` maps each link type
 * to { status, url, title }; url and title are only present for links we have verified.
 */
export function sourcesPayload(code) {
  if (typeof code !== 'string' || !/^[a-z]{2}$/i.test(code)) return null;
  const entry = getSources(code);
  const country = countryByCode(code);
  if (!entry || !country) return null;

  const links = {};
  for (const [type, link] of Object.entries(entry.links)) {
    links[type] = { status: link.status };
    if (link.url) links[type].url = link.url;
    if (link.name) links[type].title = link.name;
  }
  return {
    code: country.code,
    name: country.name,
    flag: country.flag,
    links,
    domains: entry.govDomains || [],
    verifiedAt: SOURCES_VERIFIED_AT,
  };
}
