// Verify every researched candidate and generate the app's data file.
//   npm run sources:verify
// Inputs:  scripts/sources/candidates/*.json, scripts/sources/wikidata.json
// Outputs: app/data/officialSources.js, scripts/sources/report.md
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { COUNTRIES_195 } from '../../app/data/countries195.js';
import { hostOf, hostMatches, isAllowedHost } from './lib/domains.mjs';
import { judge } from './lib/checks.mjs';
import { fetchPage } from './lib/fetchPage.mjs';

export const LINK_TYPES = ['authority', 'apply', 'embassies', 'work', 'study', 'citizenship'];
const HERE = new URL('.', import.meta.url);
const today = new Date().toISOString().slice(0, 10);

// Suffixes only a government can register (e.g. gov.uk, gouv.fr, go.jp, gob.mx).
const RESTRICTED = /^(?:gov|gob|gouv|go|govt|gub|gv|admin)\.[a-z]{2}$/;
function isRestricted(domain, code) {
  if (domain === 'gov') return code === 'us';
  if (domain === 'gc.ca') return code === 'ca';
  return RESTRICTED.test(domain);
}
const normDomain = (d) => String(d || '').trim().toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').replace(/^\./, '');
const firstUrl = (s) => String(s || '').match(/https?:\/\/[^\s)"'\]]+/)?.[0] || null;

// ---- load inputs -----------------------------------------------------------
const candidates = {};
for (const f of readdirSync(new URL('./candidates/', HERE)).filter((f) => f.endsWith('.json'))) {
  const data = JSON.parse(readFileSync(new URL(`./candidates/${f}`, HERE), 'utf8'));
  for (const [code, entry] of Object.entries(data)) {
    if (!COUNTRIES_195.some((c) => c.code === code)) throw new Error(`${f}: unknown country code "${code}"`);
    candidates[code] = entry;
  }
}
const wikidata = JSON.parse(readFileSync(new URL('./wikidata.json', HERE), 'utf8'));

// ---- phase A: fetch every URL we need, once -------------------------------
const plan = {}; // code → { roots, plainDomains: [{ domain, vouchUrl }], links: { type: candidate } }
const urls = new Set();
for (const { code } of COUNTRIES_195) {
  const cand = candidates[code] || { govDomains: [], links: {} };
  const declared = (cand.govDomains || []).map((d) => (typeof d === 'string' ? { domain: d, why: '' } : d))
    .map((d) => ({ domain: normDomain(d.domain), why: d.why || '' })).filter((d) => d.domain);
  const portalHosts = (wikidata[code]?.portal || []).map(hostOf).filter(Boolean);
  const roots = [...new Set([...declared.filter((d) => isRestricted(d.domain, code)).map((d) => d.domain), ...portalHosts])];
  const plainDomains = declared.filter((d) => !roots.some((r) => hostMatches(d.domain, r)))
    .map((d) => ({ domain: d.domain, vouchUrl: firstUrl(d.why) }));
  // Every page we fetch for a country can later corroborate its other links.
  const countryUrls = new Set((wikidata[code]?.portal || []).filter((u) => u.startsWith('https://')));
  plainDomains.forEach((d) => d.vouchUrl && countryUrls.add(d.vouchUrl));
  const links = {};
  for (const t of LINK_TYPES) {
    const l = cand.links?.[t];
    if (!l) continue;
    links[t] = l;
    if (l.url) countryUrls.add(l.url);
    if (l.linkedFrom) countryUrls.add(l.linkedFrom);
  }
  countryUrls.forEach((u) => urls.add(u));
  plan[code] = { roots, plainDomains, links, countryUrls: [...countryUrls] };
}

const pages = new Map();
const queue = [...urls];
const activeByHost = new Map();
let fetched = 0;
async function worker() {
  while (queue.length) {
    // Be polite: at most 2 requests in flight per host.
    const i = queue.findIndex((u) => (activeByHost.get(hostOf(u)) || 0) < 2);
    if (i === -1) { await new Promise((r) => setTimeout(r, 200)); continue; }
    const [u] = queue.splice(i, 1);
    const h = hostOf(u);
    activeByHost.set(h, (activeByHost.get(h) || 0) + 1);
    try { pages.set(u, await fetchPage(u)); } catch (e) { pages.set(u, { error: String(e.message || e) }); }
    activeByHost.set(h, activeByHost.get(h) - 1);
    if (++fetched % 50 === 0) console.log(`fetched ${fetched}/${urls.size}`);
  }
}
console.log(`fetching ${urls.size} URLs…`);
await Promise.all(Array.from({ length: 8 }, worker));

// ---- phase B: decide ---------------------------------------------------------
const out = {};
const report = [];
const totals = Object.fromEntries(LINK_TYPES.map((t) => [t, { verified: 0, not_verified: 0, not_applicable: 0 }]));

for (const { code, name } of COUNTRIES_195) {
  const { roots, plainDomains, links, countryUrls } = plan[code];
  const notes = [];

  // A plain (non-government-suffix) domain joins the allow-list only if a page
  // on a trusted root links to it — checked here, not taken on trust.
  const vouched = [];
  for (const { domain, vouchUrl } of plainDomains) {
    const p = vouchUrl && pages.get(vouchUrl);
    const ok = p && !p.error && p.status >= 200 && p.status < 300 && p.finalUrl.startsWith('https://')
      && roots.some((r) => hostMatches(hostOf(p.finalUrl), r))
      && p.hrefs.some((h) => hostMatches(hostOf(h), domain));
    if (ok) vouched.push(domain);
    else notes.push(`domain ${domain} not allowed (${vouchUrl ? `not linked from a trusted page: ${vouchUrl}` : 'no justification URL'})`);
  }
  const govDomains = [...roots, ...vouched];
  const wikidataHosts = new Set([
    ...(wikidata[code]?.portal || []),
    ...(wikidata[code]?.agencies || []).map((a) => a.site),
  ].map(hostOf).filter(Boolean));

  // A linking page must be an official page of this country on another host.
  const ok2xx = (p) => p && !p.error && p.status >= 200 && p.status < 300 && p.finalUrl?.startsWith('https://');
  const officialPages = countryUrls.map((u) => pages.get(u)).filter((p) => ok2xx(p) && isAllowedHost(hostOf(p.finalUrl), govDomains));
  const pickLinker = (explicitUrl, url) => {
    const target = hostOf(pages.get(url)?.finalUrl || url);
    const linksTo = (p) => ok2xx(p) && hostOf(p.finalUrl) !== target && isAllowedHost(hostOf(p.finalUrl), govDomains)
      && p.hrefs.some((h) => hostOf(h) === target);
    const explicit = explicitUrl ? pages.get(explicitUrl) : null;
    if (linksTo(explicit)) return explicit;
    return officialPages.find(linksTo) || explicit;
  };

  const entry = { code, govDomains, links: {} };
  for (const t of LINK_TYPES) {
    const c = links[t];
    let result;
    if (!c) result = { status: 'not_verified' };
    else if (c.notApplicable) result = { status: 'not_applicable', note: String(c.notApplicable) };
    else {
      const v = judge({
        type: t, candidate: c, page: pages.get(c.url), govDomains, wikidataHosts,
        linkedFromPage: pickLinker(c.linkedFrom, c.url),
      });
      if (v.status === 'verified') {
        result = { status: 'verified', name: c.name, url: pages.get(c.url).finalUrl, verifiedAt: today, evidence: v.evidence };
      } else {
        result = { status: 'not_verified' };
        notes.push(`${t}: ${v.reason} — ${c.url}`);
      }
    }
    entry.links[t] = result;
    totals[t][result.status]++;
  }
  out[code] = entry;
  if (notes.length) report.push(`### ${name} (${code})\n${notes.map((n) => `- ${n}`).join('\n')}`);
}

// ---- write outputs -----------------------------------------------------------
writeFileSync(new URL('../../app/data/officialSources.js', HERE),
  `// GENERATED by scripts/sources/verify.mjs — do not edit by hand.\n`
  + `// Re-run: npm run sources:verify\n`
  + `export const SOURCES_VERIFIED_AT = '${today}';\n`
  + `export const OFFICIAL_SOURCES = ${JSON.stringify(out, null, 1)};\n`);

const row = (t) => `| ${t} | ${totals[t].verified} | ${totals[t].not_verified} | ${totals[t].not_applicable} |`;
writeFileSync(new URL('./report.md', HERE), [
  `# Official sources verification report — ${today}`,
  '',
  `Countries: ${COUNTRIES_195.length}. URLs fetched: ${urls.size}.`,
  '',
  '| Link type | Verified | Not verified | Not applicable |',
  '|---|---|---|---|',
  ...LINK_TYPES.map(row),
  '',
  '## Failures by country',
  '',
  report.join('\n\n') || 'None.',
  '',
].join('\n'));

console.log(LINK_TYPES.map((t) => `${t}: ${totals[t].verified} verified`).join(' · '));
