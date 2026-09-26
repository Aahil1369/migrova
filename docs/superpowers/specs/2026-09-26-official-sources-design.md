# Official Sources Directory — Design

**Date:** 2026-09-26
**Status:** Approved in brainstorming, pending spec review
**Project:** Migrova (sub-project 1 of 3)

## Context

Aahil asked for three things: (1) a section of official country immigration websites, pulled from country databases and verified as official; (2) a feed of the latest visa / immigration rule changes; (3) much more detail across every Migrova page. These are three independent sub-projects, built in order 1 → 2 → 3. This spec covers **only sub-project 1**. Sub-project 2 will read from the agencies verified here and will add the scheduled-job infrastructure; sub-project 3 is the depth pass.

**Problem this also fixes.** Visa Intelligence currently asks the LLM for `officialWebsite`, `embassyContacts`, and `where_to_apply` ("URL or instructions"). Those URLs come from model memory and can be invented — the same failure the Lawyer guide already forbids. Once verified data exists, the AI must stop producing URLs.

## Goals

- Every country in the world (195 = 193 UN members + 2 observers) has a page listing its official immigration links, each either **verified with a date**, **not verified**, or **not applicable** — never a guessed link.
- Verification is automated, repeatable, and conservative enough that a user can trust "Verified" as meaning "official government source".
- Visa and Relocate results show verified links instead of AI-generated ones.
- All Migrova country dropdowns cover the same 195 countries.

## Non-goals

- Live rule-change feed and any scheduled jobs (sub-project 2).
- Deeper AI content on existing pages, including the invented `expatCommunities[].url` in Relocate (sub-project 3).
- Per-embassy addresses/phone numbers (we link the foreign ministry's own directory instead).
- Automatic periodic re-verification (arrives with sub-project 2's scheduler; until then, re-run the script).

## 1. Country master list

`app/data/countries.js` gains a canonical `COUNTRIES_195` list (ISO 3166-1 alpha-2 code, English name, flag emoji, region, nationality adjective e.g. "Pakistani"). Regions: Africa, Americas, Asia, Europe, Middle East, Oceania.

All dropdowns switch to it:
- Visa page nationality + destination selects.
- Relocate popular-destination data is unchanged; destination stays free text.
- Match / ProfileModal nationality + current-country selects.

Existing exports (`NATIONALITIES`, `ALL_COUNTRIES`, `COUNTRY_NAMES`) are re-derived from `COUNTRIES_195` so current imports keep working. `visaData.js` (static status table for 7 destinations) is untouched. Unused OpportuMap leftovers (`ADZUNA_*`, `COUNTRY_COORDS`) are left alone unless they block the change.

## 2. Data model

Generated file `app/data/officialSources.js` (committed), exporting `OFFICIAL_SOURCES` keyed by country code:

```js
ca: {
  code: 'ca',
  govDomains: ['canada.ca', 'gc.ca'],          // reviewed allow-list for this country
  links: {
    authority:   { status: 'verified', name: 'Immigration, Refugees and Citizenship Canada (IRCC)',
                   url: 'https://www.canada.ca/en/immigration-refugees-citizenship.html',
                   verifiedAt: '2026-09-27', evidence: ['https', 'gov-domain', 'content', 'wikidata'] },
    apply:       { status: 'verified', ... },
    embassies:   { status: 'verified', ... },   // foreign ministry's list of its missions abroad
    work:        { status: 'verified', ... },
    study:       { status: 'not_verified' },
    citizenship: { status: 'not_applicable', note: 'Handled on the authority site' },
  },
}
```

Link types: `authority`, `apply`, `embassies`, `work`, `study`, `citizenship`.
Statuses: `verified` (has `name`, `url`, `verifiedAt`, `evidence`), `not_verified`, `not_applicable` (has `note`).

## 3. Verification pipeline

Scripts in `scripts/sources/` (Node, no new dependencies):

1. **`countries.mjs`** — emits the 195-country list (source of truth for §1).
2. **`fetch-candidates.mjs`** — Wikidata SPARQL: per country, government agencies (immigration authority, foreign ministry, relevant ministries) and their official websites (P856), plus the country's main government portal. Writes `scripts/sources/candidates.json`.
3. **Gap research** — for link types Wikidata lacks (mostly `apply`, `work`, `study`, `citizenship`), candidate URLs are researched per country (parallel agents split by region) and added to `candidates.json` with a `source` note. Researched URLs are only candidates; they get no special trust.
4. **`verify.mjs`** (`npm run sources:verify`) — checks each candidate. A link is `verified` only if **all** pass:
   - **https:** final URL (after redirects) is HTTPS and responds 2xx.
   - **gov-domain:** final host equals or is a subdomain of an entry in that country's `govDomains`.
   - **content:** page text/title contains the agency name or topic keywords (English or local-language label from Wikidata).
   - **corroboration:** Wikidata lists the same site, **or** a verified government page for that country links to it.

   **Exception rule:** a candidate on a non-government domain (e.g. Saudi Arabia's `visa.visitsaudi.com`) can be verified only if a verified government page of that country links to it. Evidence then records `linked-from:<url>`. Nothing else bypasses the domain rule.

   **`govDomains` — the key trust input.** Two kinds of entries:
   - *Restricted national government suffixes*, where a country has one: `.gov` (US), `gc.ca`/`canada.ca`, `gov.uk`, `gouv.fr`, `gob.mx`, `go.jp`, `gov.in`, `go.ke`, … Only that government can register under these.
   - *Plain agency domains* for countries without such a suffix (e.g. Germany's `bamf.de`, `auswaertiges-amt.de`). These are added **only** if the national government portal links to that domain; the report records the justification per entry. A Wikidata listing alone never puts a domain on the allow-list (that would make Wikidata corroborate itself).

   **Blocked or JS-rendered pages.** Requests use a normal browser User-Agent. If a site blocks automated requests (403/429/challenge page) or returns no readable text, the content check retries with headless Chrome (`--dump-dom`; already installed, no new dependency). If both fail, the link is `not_verified` with reason `blocked` in the report.

   Output: `app/data/officialSources.js` and `scripts/sources/report.md` (per-country failures + coverage totals). Re-running re-checks everything; links that now fail flip to `not_verified`.

## 4. Pages

**`/sources` — Official Sources index** (client search over static data)
- EditorialHero with a new `pageCopy` entry.
- Search box (country name, instant) + region filter chips.
- Country list: flag, name, count of verified links.
- "How we verify" block listing the four checks.

**`/sources/[code]` — country page** (all 195 statically generated via `generateStaticParams`, with per-page metadata for search, e.g. "Official Canada immigration & visa websites")
- Header: flag + name.
- "Official domains" callout: "Canada's official sites end in canada.ca or gc.ca" + scam warning (look-alike agent sites charge extra fees).
- One card per link type: agency name, **domain shown prominently**, full URL, "Verified <date>" tag, Open ↗ (`target="_blank" rel="noopener noreferrer"`).
- `not_verified` → muted card: "Not verified — start from the immigration authority above."
- `not_applicable` → muted card with the note.
- Shortcuts: "Check a visa for <country>" (`/visa?to=<code>`), "Relocation guide" (`/relocate?dest=<name>`). Visa/Relocate read these query params to pre-fill.
- Footnote: links verified on the stated date; governments move sites — always check the domain before paying.

Visual style follows Migrova's existing paper editorial system (EditorialHero, SectionHead, Tag, Btn, Footnote, paper tokens). No new animation library.

## 5. Changes to existing pages

**Visa Intelligence**
- `app/api/visa-intel/route.js` prompt: remove `officialWebsite` and `embassyContacts`; `where_to_apply` becomes "instructions only — never a URL". Fewer output tokens per lookup.
- `app/visa/page.js`: remove the AI "Official resource" line and embassy contacts; add an **"Official sources for <country>"** block (authority, apply, embassies from `OFFICIAL_SOURCES`) + "All official links →" to `/sources/<code>`. Hidden if the country has no entry.

**Relocation Guide**
- Same block (authority, work, study, citizenship) when the destination text matches a country name in `COUNTRIES_195` (whole-word, case-insensitive; aliases like "USA", "UK", "UAE"). No match → no block.

**Navigation**
- Navbar Tools menu + homepage tool list gain "Official Sources" → `/sources`.

## 6. Error handling

- Directory pages are static; no runtime fetches, no AI calls, cannot hit the Groq rate limit.
- Countries with zero verified links still render, clearly marked.
- Missing dataset entry for a code → sources block is omitted, never an error.
- `verify.mjs` network failures mark that link `not_verified` for this run (never keep a stale "verified" on failure) and are listed in the report.

## 7. Testing

- **Unit (node:test)** for `verify.mjs` rules: http rejected; redirect to non-gov host rejected; look-alike domains (`canada-visa.com`, `gov.uk.example.com`) rejected; subdomain of an allowed gov domain accepted; exception rule accepts only with a verified linking gov page.
- **Dataset integrity test:** exactly 195 unique codes matching `COUNTRIES_195`; every `verified` link has https URL, `verifiedAt`, and passes the domain rule or carries `linked-from` evidence.
- **Build:** `next build` generates 195 `/sources/[code]` pages.
- **Browser:** `/sources` search + filter, one country page, Visa result block, Relocate result block, pre-fill query params.
- **Live:** after deploy, spot-check index + several country pages + a visa lookup.

`package.json` gains `"test": "node --test"` and `"sources:verify": "node scripts/sources/verify.mjs"`.

## 8. Delivery

Order: country list → verifier + tests → candidates (Wikidata + research) → verify & generate → pages → Visa/Relocate integration → nav/home → build, deploy via Netlify CLI, commit + push to `master`.

Expected coverage (report will give real numbers): `authority` and `embassies` near-complete; `apply` ~120–150 countries; `work` / `study` / `citizenship` patchy for small states.
