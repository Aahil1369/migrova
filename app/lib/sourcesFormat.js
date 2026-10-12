// Pure helpers for showing official-source links: labels and URL/date formatting.
// Deliberately free of the sources dataset, so client components can import them
// without shipping the 195-country table to the browser.

export const LINK_TYPES = [
  { key: 'authority',   label: 'Immigration authority',  desc: 'The government agency that runs visas and residence permits.' },
  { key: 'apply',       label: 'Apply for a visa',       desc: 'The official online visa or e-visa application.' },
  { key: 'embassies',   label: 'Embassies & consulates', desc: "The foreign ministry's list of its embassies and consulates abroad." },
  { key: 'work',        label: 'Work permits',           desc: 'Official rules for working in the country as a foreigner.' },
  { key: 'study',       label: 'Study permits',          desc: 'Official student visa and study permit information.' },
  { key: 'citizenship', label: 'Citizenship',            desc: 'Official naturalization and citizenship information.' },
];

export const linkTypeMeta = (key) => LINK_TYPES.find((t) => t.key === key);

export function domainOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

// '2026-09-27' -> 'Sep 27, 2026'; anything that is not an ISO date is shown as given ('' for none).
// The one date format for "Verified <date>" (the sources pages and the kit's VerifiedLinkCard).
export function formatVerified(date) {
  const text = String(date ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const d = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return text;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

// "canada.ca or gc.ca" / ".gov" / "a, b or c" — for the official-domains callout.
export function domainList(domains) {
  const d = (domains || []).map((x) => (x.includes('.') ? x : `.${x}`));
  if (d.length <= 1) return d[0] || '';
  return `${d.slice(0, -1).join(', ')} or ${d[d.length - 1]}`;
}
