import { OFFICIAL_SOURCES, SOURCES_VERIFIED_AT } from '../data/officialSources';

export { SOURCES_VERIFIED_AT };

export const LINK_TYPES = [
  { key: 'authority',   label: 'Immigration authority',  desc: 'The government agency that runs visas and residence permits.' },
  { key: 'apply',       label: 'Apply for a visa',       desc: 'The official online visa or e-visa application.' },
  { key: 'embassies',   label: 'Embassies & consulates', desc: "The foreign ministry's list of its embassies and consulates abroad." },
  { key: 'work',        label: 'Work permits',           desc: 'Official rules for working in the country as a foreigner.' },
  { key: 'study',       label: 'Study permits',          desc: 'Official student visa and study permit information.' },
  { key: 'citizenship', label: 'Citizenship',            desc: 'Official naturalization and citizenship information.' },
];

export const linkTypeMeta = (key) => LINK_TYPES.find((t) => t.key === key);

export function getSources(code) {
  return OFFICIAL_SOURCES[String(code || '').toLowerCase()] || null;
}

export function countVerified(entry) {
  return entry ? Object.values(entry.links).filter((l) => l.status === 'verified').length : 0;
}

export function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

export function formatVerified(date) {
  const d = new Date(`${date}T00:00:00Z`);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// "canada.ca or gc.ca" / ".gov" / "a, b or c" — for the official-domains callout.
export function domainList(domains) {
  const d = (domains || []).map((x) => (x.includes('.') ? x : `.${x}`));
  if (d.length <= 1) return d[0] || '';
  return `${d.slice(0, -1).join(', ')} or ${d[d.length - 1]}`;
}
