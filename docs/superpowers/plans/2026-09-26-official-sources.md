# Official Sources Directory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A verified directory of official immigration links for all 195 countries, surfaced at `/sources` + `/sources/[code]` and inside Visa/Relocate results, with every Migrova country dropdown expanded to 195.

**Architecture:** Candidates (researched JSON per region + Wikidata corroboration) → `scripts/sources/verify.mjs` applies pure, unit-tested rules (https, gov-domain allow-list, content, corroboration, linked-from exception) using live fetches with a headless-Chrome fallback → generates static `app/data/officialSources.js` + `scripts/sources/report.md`. Next.js pages read the static file only (no runtime fetch, no AI).

**Tech Stack:** Next.js 16 App Router, Tailwind 4 paper tokens, Node 24 (`node:test`, global `fetch`), Wikidata SPARQL, headless Chrome (`--dump-dom`). No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-09-26-official-sources-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `app/data/countries195.js` (new) | Canonical 195 countries: code, name, flag, region, demonym; `REGIONS`; `countryByCode`; `findCountryInText` |
| `app/data/countries.js` (modify) | Re-derive `NATIONALITIES`, `ALL_COUNTRIES`, `COUNTRY_NAMES` from the 195 list |
| `scripts/sources/lib/domains.mjs` (new) | Pure host/domain rules |
| `scripts/sources/lib/checks.mjs` (new) | Pure verdict for one candidate given fetched page facts |
| `scripts/sources/lib/fetchPage.mjs` (new) | IO: fetch + redirects + text/href extraction, Chrome fallback |
| `scripts/sources/fetch-wikidata.mjs` (new) | Country portal + agency sites from Wikidata → `scripts/sources/wikidata.json` |
| `scripts/sources/candidates/*.json` (new) | Researched candidates per region |
| `scripts/sources/verify.mjs` (new) | Orchestrates checks → `app/data/officialSources.js`, `report.md` |
| `scripts/sources/__tests__/*.test.mjs` (new) | Unit tests for domains/checks + dataset integrity |
| `app/data/officialSources.js` (generated) | `OFFICIAL_SOURCES` + `SOURCES_VERIFIED_AT` |
| `app/lib/officialSources.js` (new) | `LINK_TYPES` metadata, `getSources`, `countVerified` |
| `app/components/SourceLinkCard.js` (new) | One link card (verified / not verified / n/a) |
| `app/components/OfficialSourcesBlock.js` (new) | Compact block for Visa/Relocate results |
| `app/sources/page.js`, `app/sources/SourcesIndex.js` (new) | Index page + client search/filter |
| `app/sources/[code]/page.js` (new) | Static country page (195) + metadata |
| `app/lib/pageCopy.js`, `app/components/Navbar.js`, `app/page.js` (modify) | Copy, nav, homepage tool |
| `app/visa/page.js`, `app/api/visa-intel/route.js` (modify) | 195 dropdowns, `?to=` prefill, sources block, no AI URLs |
| `app/relocate/page.js` (modify) | `?dest=` prefill, sources block |
| `package.json` (modify) | `test`, `sources:wikidata`, `sources:verify` scripts |

---

### Task 1: Canonical 195-country list

**Files:** Create `app/data/countries195.js`; Modify `app/data/countries.js`; Test `scripts/sources/__tests__/countries.test.mjs`

- [ ] **Step 1: Failing test**

```js
// scripts/sources/__tests__/countries.test.mjs
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

test('countryByCode + findCountryInText', () => {
  assert.equal(countryByCode('ca').name, 'Canada');
  assert.equal(findCountryInText('Lisbon, Portugal')?.code, 'pt');
  assert.equal(findCountryInText('Toronto, Canada')?.code, 'ca');
  assert.equal(findCountryInText('Dubai, UAE')?.code, 'ae');
  assert.equal(findCountryInText('London UK')?.code, 'gb');
  assert.equal(findCountryInText('New York, USA')?.code, 'us');
  assert.equal(findCountryInText('Niger')?.code, 'ne');
  assert.equal(findCountryInText('Lagos, Nigeria')?.code, 'ng'); // not Niger
  assert.equal(findCountryInText('Atlantis'), null);
});
```

- [ ] **Step 2:** `node --test scripts/sources/__tests__/countries.test.mjs` → FAIL (module not found).
- [ ] **Step 3: Implement** `app/data/countries195.js`: `REGIONS = ['Africa','Americas','Asia','Europe','Middle East','Oceania']`; a compact table `[code, name, region, demonym]` for all 193 UN members + `va` (Holy See) + `ps` (Palestine); `flag` computed from the code via regional-indicator code points; `ALIASES` (`usa|united states of america → us`, `uk|britain|england|scotland|wales → gb`, `uae|emirates → ae`, `south korea|korea → kr`, `czech republic → cz`, `ivory coast → ci`, `drc|dr congo → cd`, `holland → nl`, `turkiye → tr`, `burma → mm`, `swaziland → sz`, `cape verde → cv`, `east timor → tl`, `vatican → va`); `findCountryInText` matches whole words, case-insensitive, **longest name first** (so "Nigeria" wins over "Niger", "South Sudan" over "Sudan").
- [ ] **Step 4:** Modify `app/data/countries.js`: `NATIONALITIES = [...COUNTRIES_195 sorted by demonym → { code, label: \`${demonym} ${flag}\` }, { code: 'other', label: 'Other' }]`; `ALL_COUNTRIES = COUNTRIES_195 sorted by name → { code, label: name, flag, region }`; keep `ADZUNA_SUPPORTED`, `ADZUNA_COUNTRIES = ALL_COUNTRIES`, `COUNTRY_NAMES`, `COUNTRY_COORDS` exports.
- [ ] **Step 5:** Test passes. Commit `feat(data): canonical 195-country list`.

### Task 2: Domain rules (pure)

**Files:** Create `scripts/sources/lib/domains.mjs`; Test `scripts/sources/__tests__/domains.test.mjs`

- [ ] **Step 1: Failing test**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hostOf, hostMatches, isAllowedHost } from '../lib/domains.mjs';

test('hostOf normalizes', () => {
  assert.equal(hostOf('https://WWW.Canada.ca/en/x.html'), 'canada.ca');
  assert.equal(hostOf('not a url'), null);
});
test('hostMatches is label-boundary suffix match', () => {
  assert.ok(hostMatches('canada.ca', 'canada.ca'));
  assert.ok(hostMatches('ircc.canada.ca', 'canada.ca'));
  assert.ok(hostMatches('www.uscis.gov', 'gov'));          // TLD-level suffix (US)
  assert.ok(!hostMatches('notcanada.ca', 'canada.ca'));
  assert.ok(!hostMatches('canada.ca.evil.com', 'canada.ca'));
  assert.ok(!hostMatches('gov.uk.example.com', 'gov.uk'));
});
test('isAllowedHost against a country allow-list', () => {
  const gb = ['gov.uk'];
  assert.ok(isAllowedHost('www.gov.uk', gb));
  assert.ok(!isAllowedHost('uk-visa-online.com', gb));
  assert.ok(!isAllowedHost('esta-us.com', ['gov']));
});
```

- [ ] **Step 2:** run → FAIL. **Step 3:** implement (`hostOf` via `new URL`, lower-case, strip leading `www.`; `hostMatches(h,d) = h === d || h.endsWith('.' + d)`; `isAllowedHost(h, list) = list.some(d => hostMatches(h, d))`). **Step 4:** PASS. **Step 5:** commit `feat(sources): domain rules`.

### Task 3: Candidate verdict (pure)

**Files:** Create `scripts/sources/lib/checks.mjs`; Test `scripts/sources/__tests__/checks.test.mjs`

`judge({ candidate, page, govDomains, wikidataHosts, linkedFromPage })` → `{ status: 'verified'|'not_verified', evidence: string[], reason?: string }`.
- `page` = `{ finalUrl, status, text }` or `{ error }`; `linkedFromPage` = same shape plus `hrefs: string[]`, or null.
- Rules in order: fetch error → `not_verified` reason `fetch:<msg>`; final URL not https → `http`; status not 2xx → `status:<n>`; content: text includes candidate name (case-insensitive) or any of `KEYWORDS[type]` (multilingual list, see below) or any `candidate.keywords` → else `content`; domain: final host allowed → evidence `gov-domain`; else if `linkedFromPage` is on an allowed host, fetched OK, and its `hrefs` include the candidate's final host → evidence `linked-from:<url>`; else reason `domain:<host>`; corroboration: final host in `wikidataHosts` → `wikidata`, or linked-from as above → counts; gov-domain alone **also** requires corroboration: a `linked-from` page on an allowed host that links to the host, or wikidata. Evidence always includes `https`, `content`.
- `KEYWORDS` per type — authority/apply: `immigration, visa, visas, migration, residence permit, entry, border, immigración, migración, visado, visto, immigrazione, einwanderung, migration, visum, aufenthalt, immigratie, visum, göç, vize, иммиграц, виза, миграц, هجرة, تأشيرة, 签证, 移民, 出入境, ビザ, 査証, 入国, 비자, 출입국, imigração, visa`; embassies: `embassy, embassies, consulate, consular, mission, ambassade, consulat, embajada, consulado, botschaft, konsulat, ambasciata, büyükelçilik, посольств, консульств, سفارة, 大使馆, 領事, 大使館, 대사관, embaixada`; work: authority list + `work permit, employment, labour, labor, travail, trabajo, arbeit, lavoro, çalışma, работ, عمل, 工作, 就労, 취업`; study: authority list + `study, student, university, études, estudio, estudiante, studium, studio, öğrenci, учеб, студент, دراسة, 学习, 留学, 유학`; citizenship: `citizenship, naturalisation, naturalization, nationality, citoyenneté, nationalité, ciudadanía, nacionalidad, einbürgerung, staatsangehörigkeit, cittadinanza, vatandaşlık, гражданств, جنسية, 国籍, 국적, cidadania`.

- [ ] **Step 1: Failing test** covering: http final URL rejected; non-2xx rejected; content miss rejected; gov-domain + wikidata → verified with evidence `['https','content','gov-domain','wikidata']`; gov-domain + no corroboration → `not_verified` reason `corroboration`; non-gov host + linked-from allowed page containing the host → verified with `linked-from:…`; non-gov host + linked-from page NOT containing host → `domain:<host>`; look-alike `canada-visa.com` with `govDomains ['canada.ca','gc.ca']` and no linked-from → rejected.
- [ ] **Step 2–4:** fail → implement → pass. **Step 5:** commit `feat(sources): candidate verification rules`.

### Task 4: Page fetcher (IO)

**Files:** Create `scripts/sources/lib/fetchPage.mjs`

`fetchPage(url, { timeoutMs = 20000 })` → `{ finalUrl, status, text, hrefs }` or `{ error }`.
- `fetch(url, { redirect: 'follow', headers: { 'User-Agent': <Chrome desktop UA>, 'Accept-Language': 'en,*;q=0.5' }, signal: AbortSignal.timeout })`; `finalUrl = res.url`.
- Body → `text` = `<title>` + visible text (strip `<script>/<style>`, tags, collapse whitespace, first 200k chars); `hrefs` = all `href="…"` resolved against `finalUrl`, deduped.
- Fallback to Chrome when status ∈ {401,403,406,429,503}, or `text.length < 200`, or text matches `/just a moment|enable javascript|access denied|captcha/i`: run `chrome --headless=new --disable-gpu --dump-dom --virtual-time-budget=8000 --user-data-dir=<tmp> <url>` via `execFile` (timeout 45s), parse DOM the same way; status taken as 200 if DOM has real text, final URL stays the fetch `finalUrl` (Chrome dump-dom doesn't expose it) unless fetch errored, then the input URL.
- Chrome path: `process.env.CHROME_PATH` or `C:/Program Files/Google/Chrome/Application/chrome.exe`.
- [ ] Smoke check: `node -e "import('./scripts/sources/lib/fetchPage.mjs').then(m=>m.fetchPage('https://www.gov.uk/government/organisations/uk-visas-and-immigration')).then(r=>console.log(r.status,r.finalUrl,r.text.slice(0,80),r.hrefs.length))"` → `200 https://www.gov.uk/... UK Visas and Immigration …`. Commit `feat(sources): page fetcher with Chrome fallback`.

### Task 5: Wikidata corroboration pull

**Files:** Create `scripts/sources/fetch-wikidata.mjs`; Output `scripts/sources/wikidata.json`

- One SPARQL query per batch of 40 countries (`VALUES ?iso {…}`, `wdt:P297`): country `P856` (government portal), and any item with `wdt:P17 ?country` + `wdt:P856 ?site` whose English label matches `/immigration|migration|visa|citizenship|naturali|border|foreign affairs|foreign ministry|home affairs|interior|labour|labor|education/i` (regex filter via `FILTER(REGEX(?label, …, "i"))`).
- Header `User-Agent: MigrovaSourcesBot/0.1 (https://migrova.netlify.app)` — never a personal email.
- Output `{ [code]: { portal: [urls], agencies: [{ label, site }] } }`. Verify step derives `wikidataHosts` = hosts of all these sites.
- [ ] Run `npm run sources:wikidata`; expect ≥180 countries with a portal. Commit `feat(sources): wikidata corroboration pull`.

### Task 6: Researched candidates (parallel, per region)

**Files:** Create `scripts/sources/candidates/{africa-1,africa-2,americas,asia,europe-1,europe-2,middle-east,oceania}.json`

Schema per country (research agents write exactly this; the verifier is the gatekeeper, agents add nothing they have not opened themselves):

```json
{
  "ca": {
    "govDomains": [
      { "domain": "canada.ca", "why": "restricted: Government of Canada portal" },
      { "domain": "gc.ca", "why": "restricted: Government of Canada suffix" }
    ],
    "links": {
      "authority":   { "name": "Immigration, Refugees and Citizenship Canada (IRCC)", "url": "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
      "apply":       { "name": "IRCC online application portal", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/application/account.html", "linkedFrom": "https://www.canada.ca/en/immigration-refugees-citizenship.html" },
      "embassies":   { "name": "Global Affairs Canada — embassies and consulates", "url": "https://travel.gc.ca/assistance/embassies-consulates" },
      "work":        { "name": "Work in Canada", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/work-canada.html" },
      "study":       { "name": "Study in Canada", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/study-canada.html" },
      "citizenship": { "name": "Canadian citizenship", "url": "https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-citizenship.html" }
    }
  }
}
```

- Every link: `name`, `url` (https), optional `linkedFrom` (an official page of the same country that links to `url`; **required** when `url`'s host is not in `govDomains`), optional `keywords` (local-language words appearing on the page).
- Not applicable: `{ "notApplicable": "No e-visa system — apply through an embassy or consulate" }`.
- Unknown: omit the key (becomes `not_verified`).
- `govDomains`: restricted suffixes (`gov.uk`, `gouv.fr`, `go.jp`, `gov.in`, `gob.mx`, `.gov` → `"gov"` for US only) with `why: "restricted: …"`; plain agency domains only with `why: "linked from <national portal URL>"`.

- [ ] Dispatch 8 research agents (one per file) with this schema, the country list for their region, and the rule "only URLs you fetched and saw belong to the national government". Wait for all.
- [ ] Validate every file parses and keys are in `COUNTRIES_195`. Commit `data(sources): researched candidates`.

### Task 7: Verify + generate

**Files:** Create `scripts/sources/verify.mjs`; Generate `app/data/officialSources.js`, `scripts/sources/report.md`; Modify `package.json`

- Loads `COUNTRIES_195`, all `candidates/*.json`, `wikidata.json`. For each country × each of `LINK_TYPES` order `authority, apply, embassies, work, study, citizenship`: n/a → `{ status: 'not_applicable', note }`; missing → `{ status: 'not_verified' }`; else `fetchPage(url)` (+ `fetchPage(linkedFrom)` when present, cached per URL) → `judge(...)` → verified entries become `{ status, name, url: finalUrl, verifiedAt: today, evidence }`.
- Concurrency 8 via a simple promise pool; per-host sequential to be polite.
- Writes `app/data/officialSources.js`:

```js
// GENERATED by scripts/sources/verify.mjs — do not edit by hand.
export const SOURCES_VERIFIED_AT = '2026-09-27';
export const OFFICIAL_SOURCES = { /* code → { code, govDomains: [...], links: {...} } */ };
```

- Writes `report.md`: totals per link type (verified / not verified / n/a), then per country the failures with reasons.
- `package.json` scripts: `"test": "node --test scripts/sources/__tests__/"`, `"sources:wikidata": "node scripts/sources/fetch-wikidata.mjs"`, `"sources:verify": "node scripts/sources/verify.mjs"`.
- [ ] Run `npm run sources:verify`; review report; fix candidate data errors (typos, wrong linkedFrom) — **never** relax rules to pass a link. Commit `data(sources): verified official sources`.

### Task 8: Dataset integrity test

**Files:** Create `scripts/sources/__tests__/dataset.test.mjs`

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { COUNTRIES_195 } from '../../../app/data/countries195.js';
import { OFFICIAL_SOURCES } from '../../../app/data/officialSources.js';
import { hostOf, isAllowedHost } from '../lib/domains.mjs';

const TYPES = ['authority', 'apply', 'embassies', 'work', 'study', 'citizenship'];

test('one entry per country, all six link types present', () => {
  assert.deepEqual(Object.keys(OFFICIAL_SOURCES).sort(), COUNTRIES_195.map((c) => c.code).sort());
  for (const [code, s] of Object.entries(OFFICIAL_SOURCES)) {
    for (const t of TYPES) assert.ok(s.links[t], `${code}.${t} missing`);
  }
});

test('every verified link is https, dated, and domain-justified', () => {
  for (const [code, s] of Object.entries(OFFICIAL_SOURCES)) {
    for (const [t, l] of Object.entries(s.links)) {
      if (l.status !== 'verified') continue;
      assert.match(l.url, /^https:\/\//, `${code}.${t}`);
      assert.match(l.verifiedAt, /^\d{4}-\d{2}-\d{2}$/);
      const ok = isAllowedHost(hostOf(l.url), s.govDomains) || l.evidence.some((e) => e.startsWith('linked-from:'));
      assert.ok(ok, `${code}.${t} ${l.url} not justified`);
      assert.ok(l.evidence.includes('content'), `${code}.${t} lacks content evidence`);
    }
  }
});
```

- [ ] `npm test` → all pass. Commit `test(sources): dataset integrity`.

### Task 9: App helpers + components

**Files:** Create `app/lib/officialSources.js`, `app/components/SourceLinkCard.js`, `app/components/OfficialSourcesBlock.js`

- `app/lib/officialSources.js`: `LINK_TYPES = [{ key: 'authority', label: 'Immigration authority', desc: 'The government agency that runs visas and immigration.' }, { key: 'apply', label: 'Apply for a visa', desc: 'The official application or e-visa portal.' }, { key: 'embassies', label: 'Embassies & consulates', desc: "The foreign ministry's list of its missions abroad." }, { key: 'work', label: 'Work permits', … }, { key: 'study', label: 'Study permits', … }, { key: 'citizenship', label: 'Citizenship', … }]`; `getSources(code)`; `countVerified(entry)`; `formatVerified(date)` → "Sep 27, 2026".
- `SourceLinkCard({ type, link })`: verified → label (mono kicker), agency name, domain in `font-display` large, full URL small, `Tag outline` "Verified <date>", `Btn` "Open ↗" (`target=_blank rel="noopener noreferrer"`); `not_verified` → muted "Not verified — start from the immigration authority."; `not_applicable` → muted note.
- `OfficialSourcesBlock({ code, types })`: returns null if no entry; header `// OFFICIAL SOURCES — <COUNTRY>`, rows for requested verified types (domain + Open ↗), line "Only trust sites on <govDomains>", link "All official links →" `/sources/<code>`.

### Task 10: Pages

**Files:** Create `app/sources/page.js`, `app/sources/SourcesIndex.js`, `app/sources/[code]/page.js`; Modify `app/lib/pageCopy.js`

- `pageCopy`: `HERO_COPY.sources = { kicker: '§ Tool 05 · Official Sources', title: 'Only the', italic: 'official', tail: ' sites.', sub: "Verified government immigration websites for every country — the authority, where to apply, embassies, work, study and citizenship. Checked by us, dated, and never guessed." }`; `FOOTNOTES.sources = 'Governments move their websites. Before you pay any fee, check the address bar matches the official domain listed here.'`.
- `app/sources/page.js` (server): `metadata = { title: 'Official immigration websites for every country — Migrova' }`; renders Navbar, EditorialHero, `<SourcesIndex />`, "How we verify" 4-item list, Footnote.
- `SourcesIndex` (client): search input + region chips (`All` + `REGIONS`) filter `COUNTRIES_195`; each row `Link` to `/sources/<code>`: flag, name, "<n>/6 verified".
- `app/sources/[code]/page.js` (server): `generateStaticParams` → 195 codes; `dynamicParams = false`; `generateMetadata` → `Official ${name} immigration & visa websites — Migrova`; `await params` (Next 16); header (flag, name, region kicker), official-domains callout + scam warning, grid of 6 `SourceLinkCard`, shortcuts `Btn href={/visa?to=<code>}` "Check a visa" and `Btn href={/relocate?dest=<name>}` "Relocation guide", Footnote.
- [ ] `npm run build` → shows `● /sources/[code]` with 195 paths. Commit `feat(sources): official sources pages`.

### Task 11: Visa + Relocate integration

**Files:** Modify `app/api/visa-intel/route.js`, `app/visa/page.js`, `app/relocate/page.js`

- visa-intel prompt: delete the `officialWebsite` and `embassyContacts` fields; change `"where_to_apply": "<URL or instructions>"` → `"where_to_apply": "<plain-language instructions only — never a URL or web address>"`; add to the persona line: "Never output URLs or web addresses — official links are provided separately."
- visa page: replace local `COUNTRIES` with `COUNTRIES_195` (sorted by name, label `${name} ${flag}`); prefill `targetCountry` from `?to=` in a mount `useEffect` via `new URLSearchParams(window.location.search)` (only if the code exists); remove the `officialWebsite` block; render `<OfficialSourcesBlock code={targetCountryOfResult} types={['authority','apply','embassies']} />` right after the status banner, where `targetCountryOfResult` is the code captured at search time.
- relocate page: prefill `destination` from `?dest=`; after the overview card render `<OfficialSourcesBlock code={findCountryInText(result.destination || searchedDestination)?.code} types={['authority','work','study','citizenship']} />`.
- [ ] Browser check both pages. Commit `feat(sources): verified sources in visa + relocate; AI stops emitting URLs`.

### Task 12: Nav + homepage

**Files:** Modify `app/components/Navbar.js`, `app/page.js`

- `TOOL_LINKS` append `{ href: '/sources', label: 'Official Sources' }`.
- Homepage `TOOLS` append `{ n: '05', tag: 'SRC', href: '/sources', glyph: 'globe-wire', name: 'Official Sources', desc: 'Verified government sites for every country — no look-alikes.' }`; grid `lg:grid-cols-4` → `lg:grid-cols-5`; SectionHead sub "Four tools." → "Five tools."
- [ ] Commit `feat(sources): nav + homepage entry`.

### Task 13: Ship

- [ ] `npm test` all pass; `npm run build` passes with 195 sources pages.
- [ ] Browser: `/sources` search "ken" → Kenya; filter Oceania; `/sources/ca` cards; `/visa?to=de` prefilled + block after lookup; `/relocate?dest=Lisbon, Portugal` block.
- [ ] Deploy `npx netlify-cli deploy --build --prod`; live spot-check `/sources`, `/sources/us`, `/sources/ng`, one visa lookup.
- [ ] Push `master`; update memory.
