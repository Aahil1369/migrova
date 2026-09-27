// Pull corroboration data from Wikidata for all 195 countries:
//   - the country's official website (P856) → a trusted root for its domains
//   - agencies located in the country (P17) whose names match immigration /
//     foreign-affairs / citizenship terms, with their official websites
// Output: scripts/sources/wikidata.json
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { COUNTRIES_195 } from '../../app/data/countries195.js';

const UA = 'MigrovaSourcesBot/0.1 (https://migrova.netlify.app)';
const API = 'https://www.wikidata.org/w/api.php';
const SPARQL = 'https://query.wikidata.org/sparql';
const TERMS = ['immigration', 'migration', 'foreign affairs', 'citizenship', 'interior', 'visa'];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 4) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' }, signal: AbortSignal.timeout(60_000) });
      if (res.status === 429 || res.status >= 500) {
        const wait = Number(res.headers.get('retry-after')) || 5;
        await sleep(wait * 1000);
        throw new Error(`status ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await sleep(2000 * (i + 1));
    }
  }
}

async function countryItems() {
  const iso = COUNTRIES_195.map((c) => `"${c.code.toUpperCase()}"`).join(' ');
  const q = `SELECT ?iso ?c ?site WHERE { VALUES ?iso { ${iso} } ?c wdt:P297 ?iso . OPTIONAL { ?c wdt:P856 ?site } }`;
  const j = await getJson(`${SPARQL}?format=json&query=${encodeURIComponent(q)}`);
  const out = {};
  for (const b of j.results.bindings) {
    const code = b.iso.value.toLowerCase();
    out[code] ??= { qid: b.c.value.split('/').pop(), portal: [] };
    if (b.site && !out[code].portal.includes(b.site.value)) out[code].portal.push(b.site.value);
  }
  return out;
}

async function searchAgencies(qid) {
  const ids = new Set();
  for (const term of TERMS) {
    const u = `${API}?action=query&list=search&format=json&srlimit=10&srnamespace=0&srsearch=${encodeURIComponent(`haswbstatement:P17=${qid} ${term}`)}`;
    const j = await getJson(u);
    for (const r of j.query?.search || []) ids.add(r.title);
    await sleep(150);
  }
  return [...ids];
}

async function entitySites(ids) {
  const out = [];
  for (let i = 0; i < ids.length; i += 50) {
    const u = `${API}?action=wbgetentities&format=json&props=labels|claims&languages=en&ids=${ids.slice(i, i + 50).join('|')}`;
    const j = await getJson(u);
    for (const [id, e] of Object.entries(j.entities || {})) {
      for (const c of e.claims?.P856 || []) {
        const site = c.mainsnak?.datavalue?.value;
        if (site) out.push({ qid: id, label: e.labels?.en?.value || id, site });
      }
    }
    await sleep(150);
  }
  return out;
}

// --retry: redo only countries whose agency search failed last time, gently.
const OUT = new URL('./wikidata.json', import.meta.url);
const retry = process.argv.includes('--retry') && existsSync(OUT);
const previous = retry ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const countries = retry ? previous : await countryItems();
const result = retry ? { ...previous } : {};
let done = 0;
const queue = COUNTRIES_195.map((c) => c.code).filter((code) => !retry || previous[code]?.error);
if (retry) console.log(`retrying ${queue.length} countries`);
async function worker() {
  while (queue.length) {
    const code = queue.shift();
    const c = countries[code];
    if (!c) { result[code] = { qid: null, portal: [], agencies: [] }; continue; }
    delete c.error;
    try {
      c.agencies = await entitySites(await searchAgencies(c.qid));
    } catch (e) {
      c.agencies = [];
      c.error = String(e.message || e);
    }
    result[code] = c;
    if (++done % 20 === 0) console.log(`${done}/195`);
  }
}
await Promise.all(Array.from({ length: retry ? 1 : 4 }, worker));

const sorted = Object.fromEntries(COUNTRIES_195.map((c) => [c.code, result[c.code]]));
writeFileSync(OUT, JSON.stringify(sorted, null, 1));
const withPortal = Object.values(sorted).filter((c) => c.portal.length).length;
const errors = Object.entries(sorted).filter(([, c]) => c.error).map(([k]) => k);
console.log(`countries with portal: ${withPortal}/195; agencies found: ${Object.values(sorted).reduce((n, c) => n + c.agencies.length, 0)}; errors: ${errors.join(',') || 'none'}`);
