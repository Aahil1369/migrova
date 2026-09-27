// Verify every researched candidate and generate the app's data file.
//   npm run sources:verify            (re-checks everything)
//   node scripts/sources/verify.mjs --cache   (reuses same-day fetches)
// Inputs:  scripts/sources/candidates/*.json, scripts/sources/wikidata.json
// Outputs: app/data/officialSources.js, scripts/sources/report.md
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const toHttps = (u) => String(u).replace(/^http:\/\//i, 'https://');
const homeOf = (u) => { try { return `https://${new URL(u).host}/`; } catch { return null; } };
const ok2xx = (p) => p && !p.error && p.status >= 200 && p.status < 300 && p.finalUrl?.startsWith('https://');
// Portal pages worth checking for links to ministries and agencies.
const RELEVANT = /ministr|agenc|authorit|govern|organi[sz]|department|departement|beh(?:oe|ö)rde|myndig|virast|stofnun|service|immigr|migra|foreign|affaire|exteri|auswaert|udenrig|utenriks|utrikes|ulko|visa|visum|embass|links|portal/i;

// ---- load inputs -----------------------------------------------------------
const candidates = {};
// Files load alphabetically; a later file (e.g. zz-gapfill.json) adds or replaces
// individual link types and adds govDomains, without wiping earlier research.
for (const f of readdirSync(new URL('./candidates/', HERE)).filter((f) => f.endsWith('.json')).sort()) {
  const data = JSON.parse(readFileSync(new URL(`./candidates/${f}`, HERE), 'utf8'));
  for (const [code, entry] of Object.entries(data)) {
    if (!COUNTRIES_195.some((c) => c.code === code)) throw new Error(`${f}: unknown country code "${code}"`);
    const prev = candidates[code] || { govDomains: [], links: {} };
    candidates[code] = {
      govDomains: [...(prev.govDomains || []), ...(entry.govDomains || [])],
      links: { ...(prev.links || {}), ...(entry.links || {}) },
    };
  }
}
const wikidata = JSON.parse(readFileSync(new URL('./wikidata.json', HERE), 'utf8'));

// ---- fetching (shared by both rounds) ---------------------------------------
// --cache reuses fetch results from an earlier run the same day (for quick
// iterations); without it every URL is re-checked from scratch.
const CACHE = new URL('./.cache/pages.json', HERE);
const useCache = process.argv.includes('--cache');
const cached = useCache && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const pages = new Map();

async function fetchAll(list, label) {
  const queue = [...new Set(list)].filter((u) => !pages.has(u));
  for (const u of [...queue]) {
    if (cached[u]?.day === today) { pages.set(u, cached[u].page); queue.splice(queue.indexOf(u), 1); }
  }
  const total = queue.length;
  console.log(`${label}: fetching ${total} URLs`);
  const activeByHost = new Map();
  let done = 0;
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
      if (++done % 50 === 0) console.log(`  ${done}/${total}`);
    }
  }
  await Promise.all(Array.from({ length: 8 }, worker));
  if (useCache) {
    mkdirSync(new URL('./.cache/', HERE), { recursive: true });
    const all = { ...cached };
    for (const [u, page] of pages) all[u] = { day: today, page };
    writeFileSync(CACHE, JSON.stringify(all));
  }
}

// ---- round 1: candidates, their justification pages, national portals -------
const plan = {};
for (const { code } of COUNTRIES_195) {
  const cand = candidates[code] || { govDomains: [], links: {} };
  const declared = (cand.govDomains || []).map((d) => (typeof d === 'string' ? { domain: d, why: '' } : d))
    .map((d) => ({ domain: normDomain(d.domain), why: d.why || '' })).filter((d) => d.domain);
  const portals = (wikidata[code]?.portal || []).map(toHttps);
  const portalHosts = portals.map(hostOf).filter(Boolean);
  // Trusted roots: restricted government suffixes + the national portal (Wikidata P856).
  const roots = [...new Set([...declared.filter((d) => isRestricted(d.domain, code)).map((d) => d.domain), ...portalHosts])];
  const plainDomains = [...new Map(declared.filter((d) => !roots.some((r) => hostMatches(d.domain, r)))
    .map((d) => [d.domain, { domain: d.domain, vouchUrl: firstUrl(d.why) }])).values()];
  const links = {};
  const pool = new Set(portals); // every page fetched for a country can vouch / corroborate
  for (const d of plainDomains) if (d.vouchUrl) pool.add(d.vouchUrl);
  for (const t of LINK_TYPES) {
    const l = cand.links?.[t];
    if (!l) continue;
    links[t] = l;
    if (l.url) pool.add(l.url);
    if (l.linkedFrom) pool.add(l.linkedFrom);
  }
  plan[code] = { roots, portalHosts, declared, plainDomains, links, pool };
}
await fetchAll(Object.values(plan).flatMap((p) => [...p.pool]), 'round 1');

// ---- round 2: more official pages to vouch for domains / corroborate links ---
const round2 = [];
for (const { code } of COUNTRIES_195) {
  const p = plan[code];
  const rootPages = [...p.pool].map((u) => pages.get(u)).filter((pg) => ok2xx(pg) && isAllowedHost(hostOf(pg.finalUrl), p.roots));
  const unvouched = p.plainDomains.filter((d) => !rootPages.some((pg) => pg.hrefs.some((h) => hostMatches(hostOf(h), d.domain))));
  // (a) Crawl one level into the national portal when a plain domain still needs vouching.
  if (unvouched.length) {
    const portalPages = rootPages.filter((pg) => p.portalHosts.some((h) => hostMatches(hostOf(pg.finalUrl), h)));
    const inner = [...new Set(portalPages.flatMap((pg) => pg.hrefs))]
      .filter((h) => h.startsWith('https://') && p.portalHosts.some((ph) => hostMatches(hostOf(h), ph)) && !/\.(pdf|jpe?g|png|gif|webp|svg|ico|zip|docx?|xlsx?|css|js|json|xml|rss|woff2?|ttf|mp4|mp3)(\?|$)/i.test(h) && !h.includes('/_next/'))
      .sort((a, b) => Number(RELEVANT.test(b)) - Number(RELEVANT.test(a)))
      .slice(0, 20);
    inner.forEach((u) => { p.pool.add(u); round2.push(u); });
  }
  // (b) Home pages of this country's agencies listed on Wikidata — used only if
  //     they sit on a root or declared domain (checked again when deciding).
  const agencyHomes = [...new Set((wikidata[code]?.agencies || []).map((a) => homeOf(a.site)).filter(Boolean))]
    .filter((u) => isAllowedHost(hostOf(u), [...p.roots, ...p.declared.map((d) => d.domain)]))
    .slice(0, 12);
  agencyHomes.forEach((u) => { p.pool.add(u); round2.push(u); });
}
await fetchAll(round2, 'round 2');

// ---- decide ------------------------------------------------------------------
const out = {};
const report = [];
const totals = Object.fromEntries(LINK_TYPES.map((t) => [t, { verified: 0, not_verified: 0, not_applicable: 0 }]));

for (const { code, name } of COUNTRIES_195) {
  const { roots, plainDomains, links, pool } = plan[code];
  const poolPages = [...pool].map((u) => pages.get(u)).filter(ok2xx);
  const notes = [];

  // A plain (non-government-suffix) domain joins the allow-list only if
  //   (a) a page on a trusted root links to it, or
  //   (b) our research declared it AND Wikidata lists it as the official website
  //       of an agency in this country — two independent sources.
  // Links on (b) domains may not use Wikidata again as their corroboration.
  const rootPages = poolPages.filter((pg) => isAllowedHost(hostOf(pg.finalUrl), roots));
  const agencies = wikidata[code]?.agencies || [];
  const vouched = [];
  const viaWikidata = [];
  for (const { domain } of plainDomains) {
    const by = rootPages.find((pg) => pg.hrefs.some((h) => hostMatches(hostOf(h), domain)));
    const agency = agencies.find((a) => hostMatches(hostOf(a.site), domain));
    if (by) vouched.push(domain);
    else if (agency) { vouched.push(domain); viaWikidata.push(domain); }
    else notes.push(`domain ${domain} not allowed (no page on ${roots.join(', ') || 'a trusted root'} links to it, and Wikidata lists no agency using it)`);
  }
  const govDomains = [...new Set([...roots, ...vouched])];
  const wikidataHosts = new Set([
    ...(wikidata[code]?.portal || []),
    ...agencies.map((a) => a.site),
  ].map(hostOf).filter((h) => h && !viaWikidata.some((d) => hostMatches(h, d))));

  // A linking page must be an official page of this country on another host.
  const officialPages = poolPages.filter((pg) => isAllowedHost(hostOf(pg.finalUrl), govDomains));
  const pickLinker = (explicitUrl, url) => {
    const target = hostOf(pages.get(url)?.finalUrl || url);
    const linksTo = (pg) => ok2xx(pg) && hostOf(pg.finalUrl) !== target && isAllowedHost(hostOf(pg.finalUrl), govDomains)
      && pg.hrefs.some((h) => hostOf(h) === target);
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
        // Drop per-visitor session ids (";jsessionid=…") from stored URLs.
        const clean = (s) => s.replace(/;jsessionid=[^?#]*/i, '');
        result = { status: 'verified', name: c.name, url: clean(pages.get(c.url).finalUrl), verifiedAt: today, evidence: v.evidence.map(clean) };
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
  `Countries: ${COUNTRIES_195.length}. Pages checked: ${pages.size}.`,
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
