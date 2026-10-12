import { OFFICIAL_SOURCES, SOURCES_VERIFIED_AT } from '../data/officialSources.js';

export { SOURCES_VERIFIED_AT };

// The label/format helpers live in sourcesFormat.js (no dataset); re-exported so server pages
// keep importing everything from here. Client components import sourcesFormat directly.
export { LINK_TYPES, linkTypeMeta, domainOf, formatVerified, domainList } from './sourcesFormat.js';

export function getSources(code) {
  return OFFICIAL_SOURCES[String(code || '').toLowerCase()] || null;
}

export function countVerified(entry) {
  return entry ? Object.values(entry.links).filter((l) => l.status === 'verified').length : 0;
}
