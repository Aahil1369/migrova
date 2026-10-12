# Passport Site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every Migrova page the Journey Book look (night header → warm paper, Inter 800 + gradient word, stamps/vignettes/seals) and give Visa, Official Sources, Relocate and Country Match their signature moments, without slowing any page or breaking on iPhone Safari.

**Architecture:** Extract the homepage's presentational passport parts into a small `app/components/kit/` (no scroll engine), add a shared `ToolShell` + `ToolHeader`, then rebuild the four tool pages on it. Every behaviour that can be pure (stamp choice, MRZ lines, checklist storage, stale-request guard, match cache, sources payload) lives in a tested module; React components stay thin. Two delivery steps: Tasks 1–6 (step 1), Tasks 7–8 (step 2), each shipped through a private Netlify test link first.

**Tech Stack:** Next.js 16 App Router, React 19, plain JS, Tailwind 4 (`app/globals.css`), node:test (`npm test` = `node --test "scripts/**/__tests__/*.test.mjs"`), Groq via `lib/ai.js`, Supabase (anon client).

**Spec:** `docs/superpowers/specs/2026-10-12-passport-site-design.md`

## Global Constraints

- No new runtime dependencies, no animation libraries; plain JS, no TypeScript.
- Animate only `transform` and `opacity` (plus `stroke-dashoffset` for route lines).
- No CSS trig (`tan(`, `atan2(` …) in any CSS — WebKit resolves it wrongly.
- No motion gating on `navigator.hardwareConcurrency`. `prefers-reduced-motion: reduce` → final state at once (opacity fades allowed).
- Signature moments play once (on result arrival, or when scrolled into view on static pages); ambient loops pause off screen.
- Body text ≥ 16px on phones; inputs 16px; every text/background pair ≥ 4.5:1 (stamp inks = `STAMP_INKS` on `--page` #fbf8f2).
- Decorative stamps/MRZ/seals/SVG are `aria-hidden` with the real information as plain text beside them; AI text never inside a rotated stamp; results announced (`aria-live`) and focus moved to the result heading; labels bound with `htmlFor`; forms are real `<form>`s; chips are `<button aria-pressed>`.
- Never stamp DENIED / REFUSED / REJECTED (use LIKELY, CHECK, CAUTION, PENDING, NOTICE). Fake-site examples come from `fakeDomain()` (`.example` TLD) and are never links. Every AI result keeps the "general information, not legal advice" disclaimer.
- Budgets: no tool page ships more JS than the homepage (≤ 281 KB gzip, `node scripts/perf/js-size.mjs <url>`); the kit adds ≤ 5 KB JS + ≤ 6 KB CSS gzip; `/visa` and `/sources/ca` LCP (`node scripts/perf/lcp.mjs <url>`) not worse than master by > 150 ms (paired median).
- Homepage behaviour unchanged: all existing `scripts/passport/__tests__` keep passing.
- Git through the PowerShell tool in `C:\Users\aahil\migrova-passport` (branch `passport-site`); commit with `git commit -F <file>`; every message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never push or deploy (the controller does). Never send the owner's email anywhere.

## Review Focus

1. **Partial / malformed AI JSON** (missing `visaTypes`, `currentStatus` unknown, probability call failed, `monthlyBudget` missing) → the page renders what it has, the stamp falls back to CHECK, no crash. Pinned in Task 5 (`visaReport` tests) and Task 7 (`relocate` tests).
2. **Blocked storage** (Safari private mode, cookies blocked) → checklists, ticket stub and match cache silently do nothing; pages still work. Pinned in Task 3 (`checklistStore`) and Task 8 (`matchCache`).
3. **Long names / long AI strings** ("Saint Vincent and the Grenadines", 200-char visa names) → MRZ lines exactly 44 chars, stamp lines ≤ 18 chars, ticket codes exactly 3 letters. Pinned in Task 5 and Task 7.
4. **Double submit / changing inputs mid-request** → the newest request wins; stale responses are ignored. Pinned in Task 3 (`createLatest`) and used by Tasks 5, 7, 8.
5. **Unknown or junk country codes** (`/sources/zz`, `?to=xx`, `/api/sources/../`) → 404 / ignored prefill, never a crash or a fetched table. Pinned in Task 4 (`sourcesPayload`) and Task 6.

---

## File structure

```
app/components/kit/                 shared passport kit (no imports from app/components/passport/)
  kit.css                           sky band, paper, vignette, stamp, seal, chips/inputs, motion prefs
  Stamp.js stampInks.js Guilloche.js guillochePattern.js HologramSeal.js Vignette.js Glyphs.js   (moved)
  mrz.js fakeDomain.js countUp.js starField.js useMediaQuery.js                                  (moved/extracted)
  ToolShell.js ToolHeader.js heroMrz.js                         Task 2
  PassportCard.js VerifiedLinkCard.js ChecklistPage.js checklistStore.js
  ResultArrival.js useInView.js MrzDecode.js createLatest.js Chip.js                              Task 3
  Ticket.js                                                     Task 7
app/lib/friendlyError.js app/lib/sourcesPayload.js              Task 4
app/api/sources/[code]/route.js                                  Task 4
app/visa/visaReport.js                                           Task 5
app/sources/uvPair.js app/sources/UvCheck.js app/not-found.js    Task 6
app/lib/relocate.js                                              Task 7
app/lib/match.js                                                 Task 8
scripts/kit/__tests__/*.test.mjs  scripts/site/__tests__/*.test.mjs
```

---

## STEP 1

### Task 1: Extract the passport kit

**Files:**
- Move (git mv) from `app/components/passport/parts/` to `app/components/kit/`: `Stamp.js`, `stampInks.js`, `Guilloche.js`, `guillochePattern.js`, `HologramSeal.js`, `Vignette.js`, `Glyphs.js`.
- Move `app/components/passport/mrz.js` → `app/components/kit/mrz.js`; `app/components/passport/useMediaQuery.js` → `app/components/kit/useMediaQuery.js`.
- Create `app/components/kit/fakeDomain.js` (moved from `passport/pages/uv.js:12`; `uv.js` re-exports it), `app/components/kit/countUp.js` (moved from `passport/pages/UvSources.js:26`), `app/components/kit/starField.js` (moved from `passport/stageStyle.js:192`; `stageStyle.js` re-exports it).
- Create `app/components/kit/kit.css` from `app/components/passport/passport.css` sections NightSky (528–616), Visa vignette (617–765), Entry stamp (766–892), Hologram seal (893–957), Motion preferences (958–1008) — rules that style the parts themselves move; rules scoped to book layouts (`.jb-lite …`, `.jb-stack …`, `.ps-stage[data-quality] …`, `[data-sweep] …`) stay in `passport.css`.
- Modify every importer (passport components, pages, tests under `scripts/passport/__tests__/`) to the new paths; the moved parts import `./kit.css` instead of `../passport.css`.
- Test: `scripts/kit/__tests__/kit-boundary.test.mjs`

**Interfaces:**
- Produces (unchanged signatures, new paths): `Stamp({ shape, color, lines, applied, rotate, className, style })`, `STAMP_INKS`, `PAGE_PAPER`, `contrastRatio`, `Guilloche({ seed, variant, color, className })`, `HologramSeal({ count, label, className, style })`, `Vignette({ type, title, desc, href, mrz, applied, as })` (new `as`: `'link'` default, `'div'` renders a non-link card), `buildMrz`, `decodeFrame`, `MRZ_LEN`, `DECODE_FRAMES`, `fakeDomain(name)`, `countUp(el, target) → cleanup()`, `starField(count, layers)`, `useMediaQuery(query, serverValue)`, `REDUCED_MOTION`, `useHydrated()`.

- [ ] **Step 1: Write the failing test** `scripts/kit/__tests__/kit-boundary.test.mjs`
  - `test('kit never imports the homepage passport code')`: for every `.js` file under `app/components/kit/`, its source contains no `'../passport` / `"../passport` / `/passport/` import.
  - `test('kit CSS has no CSS trig')`: `app/components/kit/kit.css` with comments stripped does not match `/atan2|tan\(/`.
  - `test('moved parts keep their API')`: dynamic-import `app/components/kit/stampInks.js`, `mrz.js`, `fakeDomain.js`, `starField.js`; assert `Object.keys(STAMP_INKS)` equals `['green','blue','terracotta','purple','gold']`, `buildMrz({ fromIso3: 'PAK', toIso3: 'CAN', count: 418 })` lines are each 44 chars, `fakeDomain('Canada')` ends with `.example`, `starField(64, 3)` returns 3 layers.
- [ ] **Step 2: Run** `node --test scripts/kit/__tests__/kit-boundary.test.mjs` → FAIL (files missing).
- [ ] **Step 3: Move the files, split the CSS, update imports** (re-exports in `uv.js` and `stageStyle.js` keep homepage call sites unchanged).
- [ ] **Step 4: Run** `npm test` → all pass (existing passport tests + new); `npm run build` → compiles. Homepage smoke: `npx next start -p 3200`, load `/`, no console errors, stamps/vignettes/seal render.
- [ ] **Step 5: Commit** `refactor(kit): extract presentational passport parts into app/components/kit`

### Task 2: Foundation — tokens, ToolShell, ToolHeader, controls, viewport, motion clean-up

**Files:**
- Modify: `app/globals.css` (add `--ground: #efe7d6;` to `:root` and `@theme inline`; `.tool-card-underline` animates `transform: scaleX()` instead of width; delete `.italic-draw` rules; `.reveal` loses `will-change`), `app/layout.js` (add `export const viewport = { width: 'device-width', initialScale: 1 }`), `app/components/ui/Btn.js` (transitions only `transform, opacity`; new paper/lime look: primary = lime `#b8cf5d` on `#15231a` text, 800 weight, radius 12px; ghost = `--page-ink` outline), `app/components/Navbar.js` (tool progress bar uses `transform: scaleX(...)` with `transform-origin: left`), `app/lib/pageCopy.js` (`HERO_COPY.<page>` gains `code`, `name`, `accent`, `tail` — see below).
- Create: `app/components/kit/ToolShell.js`, `app/components/kit/ToolHeader.js`, `app/components/kit/heroMrz.js`, `app/components/kit/Chip.js`; styles in `kit.css` (`.kit-shell`, `.kit-sky`, `.kit-ground`, `.kit-h1`, `.kit-accent`, `.kit-input`, `.kit-select`, `.kit-chip`).
- Modify pages to use ToolShell + ToolHeader instead of `<Navbar />` + `EditorialHero`: `app/visa/page.js`, `app/relocate/page.js`, `app/match/page.js`, `app/lawyer/page.js`, `app/stories/page.js`, `app/sources/page.js`. Remove every `useScrollReveal()` call and delete `app/components/ui/hooks/useScrollReveal.js` and `app/components/ui/EditorialHero.js` when unused.
- Test: `scripts/kit/__tests__/foundation.test.mjs`

**Interfaces:**
- Produces:
  - `ToolShell({ header, children, wide = false })` — server-safe component: `<Navbar tone="night" />`, the night→dawn `.kit-sky` band holding `header`, then `.kit-ground` (background `--ground`) holding `children` in a container (`max-width: 720px`, or `1120px` when `wide`), 16px side gutters on phones.
  - `ToolHeader({ code, name, title, accent, tail = '', sub })` — kicker `` `${code} · ${name}` `` (mono, lime), `<h1 className="kit-h1">{title} <span className="kit-accent">{accent}</span>{tail}</h1>` (accent = lime→peach gradient text, as the homepage "made simple."), `<p>` sub, and a client `RouteMrz` line (`aria-hidden`) built by `heroMrz`.
  - `heroMrz(code, route) → string` — exactly 44 chars, `[A-Z0-9<]` only: `` `${letter}<MGV<<${from}<<${to}<<…` `` padded with `<`, where `letter` = first letter of `code` after the dash (`V-VISA` → `V`), `from`/`to` = ISO3 codes from the route or `XXX` when missing.
  - `Chip({ pressed, onClick, children, disabled })` — `<button type="button" aria-pressed={pressed} className="kit-chip">`.
  - `HERO_COPY` entries: `visa: { code: 'V-VISA', name: 'VISA INTELLIGENCE', title: 'The visa rules, in', accent: 'plain English.', sub: … }`, `relocate: { code: 'R-RELOCATE', name: 'RELOCATION GUIDE', title: 'Land on your feet,', accent: 'anywhere.' }`, `match: { code: 'M-MATCH', name: 'COUNTRY MATCH', title: 'Where can you', accent: 'actually go?' }`, `sources: { code: 'S-SOURCES', name: 'OFFICIAL SOURCES', title: 'The real government sites,', accent: 'verified.' }`, `lawyer: { code: 'L-COUNSEL', name: 'LAWYER GUIDE', title: 'Find the right help, without', accent: 'getting burned.' }`, `stories: { code: 'T-STORIES', name: 'TRAVELLERS', title: 'They did it.', accent: 'You can too.' }` (keep each page's existing `sub` text).

- **Plan decision:** the route pill stays in the night navbar (already on every page) and is not duplicated inside `ToolHeader`; the header carries the route as its MRZ line (spec §4.3 "and the route pill" is satisfied by the navbar pill).

- [ ] **Step 1: Write the failing tests** `scripts/kit/__tests__/foundation.test.mjs`
  - `heroMrz('V-VISA', { from: 'pk', to: 'ca' })` → length 44, starts with `V<MGV<<PAK<<CAN<<`, matches `/^[A-Z0-9<]{44}$/`.
  - `heroMrz('S-SOURCES', null)` → starts with `S<MGV<<XXX<<XXX<<`, length 44; `heroMrz('M-MATCH', { from: 'zz', to: undefined })` → `XXX` for both, length 44.
  - Contrast (using `contrastRatio` from `kit/stampInks.js`): `#1f2a24` on `#efe7d6` ≥ 4.5; `#3d443a` on `#fbf8f2` ≥ 4.5; `#15231a` on `#b8cf5d` ≥ 4.5; `#b8cf5d` on `#15231a` ≥ 4.5; `#f3efe4` on `#15231a` ≥ 4.5.
  - `globals.css` (comments stripped) has no `transition: all` / `transition-all` usage in `.tool-card-underline`, contains `scaleX` in `.tool-card-underline`, and has no `.italic-draw` rule; `app/layout.js` source contains `export const viewport`.
  - No page under `app/` imports `EditorialHero` or `useScrollReveal` (scan sources).
- [ ] **Step 2: Run** `node --test scripts/kit/__tests__/foundation.test.mjs` → FAIL.
- [ ] **Step 3: Implement** the files above. Inputs/selects across the six pages get `kit-input` / `kit-select` (16px). Lawyer and Stories only switch shell + header in this task (their bodies are restyled in the later round).
- [ ] **Step 4: Run** `npm test` → pass; `npm run build` → pass. Browser (CDP or built-in pane, 390×844 and 1440×900): each of the six pages shows the night band → dawn → `--ground`, the bold header with gradient word, no horizontal scroll, no console errors; tapping a select on 390×844 does not zoom (font-size ≥ 16px computed).
- [ ] **Step 5: Commit** `feat(kit): ToolShell + ToolHeader, 16px controls, viewport, transform-only utilities`

### Task 3: Kit result components

**Files:**
- Create: `app/components/kit/PassportCard.js`, `VerifiedLinkCard.js`, `ChecklistPage.js`, `checklistStore.js`, `ResultArrival.js`, `useInView.js`, `MrzDecode.js`, `createLatest.js` (+ styles in `kit.css`).
- Modify: `app/components/passport/pages/DataPage.js` to use `kit/MrzDecode.js` (its local `MrzDecode` moves out; behaviour unchanged, including the `data-sweep` check).
- Test: `scripts/kit/__tests__/checklistStore.test.mjs`, `scripts/kit/__tests__/createLatest.test.mjs`

**Interfaces:**
- Produces:
  - `PassportCard({ as = 'section', tone = 'page', className, children, ...rest })` — paper surface (`--page`, radius 14px, soft shadow); `tone: 'visa'` adds the guilloche tint + foil strip.
  - `VerifiedLinkCard({ href, title, domain, note, verifiedAt, verified = true })` — real `<a target="_blank" rel="noopener noreferrer">` with a green `VERIFIED` seal (`aria-hidden`) and visually-hidden "(verified official site, opens in a new tab)"; `verified=false` renders a dashed, non-link card.
  - `checklistKey(parts: string[]) → string` = `'migrova_check:' + parts.map(slug).join(':')` (slug: lowercase, `[^a-z0-9]+` → `-`, trimmed, max 40 chars each).
  - `readChecklist(storage, key) → number[]` (sorted unique indexes; `[]` on missing, junk JSON, non-array, or a throwing storage).
  - `writeChecklist(storage, key, checked: number[]) → boolean` (false when storage throws/missing; never throws).
  - `checklistProgress(total, checked) → { done, total, complete }` (`done` counts only indexes `< total`; `complete = total > 0 && done === total`).
  - `ChecklistPage({ storageKey, title, items: string[] })` — tickable list (`<input type="checkbox">` + `<label htmlFor>`), header "n / m packed", a green `PACKED` `Stamp` (`aria-hidden`) when complete plus a visually-hidden "All items packed" in an `aria-live="polite"` region.
  - `createLatest() → { next(): number, isCurrent(id): boolean }` — every `next()` invalidates earlier ids.
  - `useInView(ref, { once = true, rootMargin = '0px 0px -10% 0px' }) → boolean` (true immediately when IntersectionObserver is missing).
  - `ResultArrival({ id, label, children })` — wrapper `<section aria-labelledby={id}>`; on mount moves focus to the element with `id` (`tabIndex={-1}`, `preventScroll: false` so it scrolls into view) and announces `label` in an `aria-live="polite"` region.
  - `MrzDecode({ lines: [string, string], plain: [string, string], active, still })` — same behaviour as today's DataPage version.

- [ ] **Step 1: Write the failing tests**
  - `checklistStore.test.mjs`: key `checklistKey(['pk','ca','Study'])` === `'migrova_check:pk:ca:study'`; round-trip write/read `[2,0,2]` → `[0,2]`; read from storage returning `'{bad'` → `[]`; read/write with `{ getItem() { throw new Error() }, setItem() { throw new Error() } }` → `[]` / `false`, no throw; `readChecklist(null, k)` → `[]`; `checklistProgress(3, [0,1,2])` → `{ done: 3, total: 3, complete: true }`; `checklistProgress(3, [0,5])` → `{ done: 1, total: 3, complete: false }`; `checklistProgress(0, [])` → `complete: false`.
  - `createLatest.test.mjs`: `a = l.next(); b = l.next();` → `isCurrent(a) === false`, `isCurrent(b) === true`; a fresh guard's first id is current.
- [ ] **Step 2: Run** `node --test scripts/kit/__tests__/checklistStore.test.mjs scripts/kit/__tests__/createLatest.test.mjs` → FAIL.
- [ ] **Step 3: Implement** the modules and components (storage access only through the passed `storage`; components use `deviceStorage()` semantics — copy that helper into `kit/deviceStorage.js` if needed, do not import from `passport/`).
- [ ] **Step 4: Run** `npm test` → pass (incl. homepage DataPage tests); build passes; homepage MRZ still decodes (browser check).
- [ ] **Step 5: Commit** `feat(kit): paper cards, verified links, checklist page, result arrival, MrzDecode`

### Task 4: Fixes — sources payload, friendly errors, profile save, parallel visa calls

**Files:**
- Create: `app/lib/sourcesPayload.js`, `app/api/sources/[code]/route.js`, `app/lib/friendlyError.js`.
- Modify: `app/components/OfficialSourcesBlock.js` (client: takes `code`, `types`; fetches `/api/sources/<code>` instead of importing the table), `app/api/visa-intel/route.js`, `app/api/visa-probability/route.js`, `app/api/relocation/route.js`, `app/api/country-match/route.js` (catch blocks return `friendlyError(...)` text, log the real error with `console.error`), `app/components/Navbar.js:207` (POST body `{ profile }`), `app/api/user-profile/route.js:27` (accept `profile ?? profile_data`).
- Test: `scripts/site/__tests__/sourcesPayload.test.mjs`, `scripts/site/__tests__/friendlyError.test.mjs`

**Interfaces:**
- Produces:
  - `sourcesPayload(code) → { code, name, flag, links, domains, verifiedAt } | null` — `null` unless `code` matches `/^[a-z]{2}$/i` and has an entry; `links` keeps only `{ status, url, title }` per type.
  - `GET /api/sources/[code]` → 200 JSON payload with `Cache-Control: public, max-age=3600, s-maxage=86400`, or 404 `{ error: 'Unknown country' }`.
  - `friendlyError(kind: 'visa' | 'probability' | 'relocation' | 'match' | 'unknown') → string` — `visa`: "We couldn't build your visa report right now. Please try again in a minute."; `probability`: "Chance estimate unavailable right now."; `relocation`: "We couldn't build your relocation guide right now. Please try again in a minute."; `match`: "We couldn't find your matches right now. Please try again in a minute."; anything else: "Something went wrong. Please try again in a minute."
  - `OfficialSourcesBlock({ code, types })` — same visual output as before (restyled with `VerifiedLinkCard` in Task 5); renders nothing while loading or on 404.

- [ ] **Step 1: Write the failing tests**
  - `sourcesPayload('ca')` has `code: 'ca'`, `name: 'Canada'`, `verifiedAt` `'2026-09-27'`, and `JSON.stringify(payload).length < 4000`; `sourcesPayload('CA')` equals `sourcesPayload('ca')`; `sourcesPayload('zz')`, `sourcesPayload('../x')`, `sourcesPayload('')`, `sourcesPayload(undefined)` → `null`.
  - `friendlyError('visa')` equals the exact visa sentence; `friendlyError('nope')` equals the fallback; none of the strings contain `Error`, `JSON` or `token`.
- [ ] **Step 2: Run** `node --test scripts/site/__tests__/*.test.mjs` → FAIL.
- [ ] **Step 3: Implement.** In `app/visa/page.js` start `/api/visa-intel` and `/api/visa-probability` at the same time (two independent `fetch`es, each guarded by the same `createLatest` id); the report renders when intel arrives, the chance when probability arrives, a probability failure sets "Chance estimate unavailable right now." instead of hiding.
- [ ] **Step 4: Verify.** `npm test`, `npm run build`; then with `npx next start -p 3200`: `node scripts/perf/js-size.mjs http://localhost:3200/visa` and `/relocate` are each ≥ 18 KB gzip smaller than master (record both numbers); `curl http://localhost:3200/api/sources/ca` → 200 JSON, `/api/sources/zz` → 404; grep the `/visa` client chunks for `"SOURCES_VERIFIED_AT"` or a known authority URL from another country (e.g. `gov.uk`) → absent. Profile save: signed-in manual check is not possible headless — assert in the report that the request body shape now matches the API.
- [ ] **Step 5: Commit** `fix: per-country sources API, friendly AI errors, profile save, parallel visa calls`

### Task 5: Visa Intelligence redesign

**Files:**
- Create: `app/visa/visaReport.js` (pure), `app/visa/IssuedVisa.js`, `app/visa/visa.css`.
- Modify: `app/visa/page.js` (rebuild on ToolShell/ToolHeader/kit; keep prefill order `?from=&to=` → saved route → profile; keep the LegalAck gate; button text "Issue my visa report"), `app/components/VisaProbabilityMeter.js` (meter fill uses `transform: scaleX(p)`).
- Test: `scripts/site/__tests__/visaReport.test.mjs`

**Interfaces:**
- Consumes: `Stamp`, `STAMP_INKS`, `MrzDecode`, `PassportCard`, `ChecklistPage`, `checklistKey`, `ResultArrival`, `VerifiedLinkCard`, `Chip`, `createLatest`, `OfficialSourcesBlock`, `countryByCode` (iso3).
- Produces (`app/visa/visaReport.js`):
  - `VISA_STAMPS` = `{ 'visa-free': { lines: ['VISA FREE'], ink: 'green' }, 'e-visa': { lines: ['E-VISA', 'APPLY ONLINE'], ink: 'blue' }, 'visa-on-arrival': { lines: ['ON ARRIVAL'], ink: 'blue' }, 'visa-required': { lines: ['APPLY FIRST'], ink: 'gold' }, citizen: { lines: ['HOME'], ink: 'green' } }`.
  - `visaStamp(currentStatus) → { lines, ink }` — unknown/missing → `{ lines: ['CHECK'], ink: 'gold' }`.
  - `chanceLine(probability) → { text, caution }` — `'Low'` → `{ text: 'Chance: low', caution: true }`; `'Medium'|'High'|'Very High'` → `{ text: 'Chance: medium' | 'Chance: high' | 'Chance: very high', caution: false }`; anything else → `{ text: 'Chance estimate unavailable', caution: false }`.
  - `visaRawMrz({ fromIso3, toIso3, purpose }) → [string, string]` — two 44-char lines: `` `V<${toIso3}${purposeCode}<<${fromIso3}<<…` `` and a deterministic filler line (`purposeCode`: Work `WORK`, Study `STUDY`, Tourist `TOUR`, Permanent Residency `PR`, Digital Nomad `NOMAD`; missing ISO3 → `XXX`).
  - `visaPlainMrz({ currentStatus, probability }) → [string, string]` — line 1 = `'✓ ' + visaStamp(..).lines.join(' · ')`, line 2 = the next step (`visa-free` "NO VISA NEEDED FOR SHORT STAYS", `e-visa` "APPLY ONLINE BEFORE YOU GO", `visa-on-arrival` "GET IT WHEN YOU LAND", `visa-required` "APPLY BEFORE YOU GO", `citizen` "YOU CAN LIVE HERE", unknown "CHECK THE OFFICIAL SITE") + `' · ' + chanceLine(..).text.toUpperCase()`; both padded/truncated to 44.
  - `docsKey({ from, to, purpose }) → string` = `checklistKey(['visa', from, to, purpose])`.

- [ ] **Step 1: Write the failing test** `scripts/site/__tests__/visaReport.test.mjs`
  - `visaStamp('e-visa')` → `{ lines: ['E-VISA','APPLY ONLINE'], ink: 'blue' }`; `visaStamp('banned')`, `visaStamp(undefined)` → CHECK/gold.
  - No stamp line anywhere in `VISA_STAMPS` (or the fallback) matches `/DENIED|REFUSED|REJECTED/`; every line ≤ 18 chars.
  - `chanceLine('Low')` → caution true; `chanceLine(null)` → "Chance estimate unavailable".
  - `visaRawMrz({ fromIso3: 'PAK', toIso3: 'CAN', purpose: 'Study' })` → both lines length 44, line 1 starts `V<CANSTUDY<<PAK<<`, only `[A-Z0-9<]`; with `fromIso3: undefined` → contains `XXX`.
  - `visaPlainMrz({ currentStatus: 'visa-required', probability: 'Medium' })` → line 1 `'✓ APPLY FIRST'` padded to 44, line 2 starts `'APPLY BEFORE YOU GO · CHANCE: MEDIUM'`; with a 300-char status → still exactly 44 chars each.
  - `docsKey({ from: 'pk', to: 'ca', purpose: 'Study' })` === `'migrova_check:visa:pk:ca:study'`.
- [ ] **Step 2: Run** `node --test scripts/site/__tests__/visaReport.test.mjs` → FAIL.
- [ ] **Step 3: Implement.**
  - `IssuedVisa({ loading, report, probability, from, to, purpose })` — `PassportCard tone="visa"`: label `VISA · <DESTINATION NAME>`; while `loading`, raw MRZ scrambles (`MrzDecode active={false}` cycling, `aria-hidden`) with a visually-hidden "Preparing your report…" status; on `report`, visa type = `report.visaTypes?.[0]?.name` (fallback "Visa options below"), processing/fee from that entry when present, `chanceLine` text, `MrzDecode` decodes raw → `visaPlainMrz`, then the `Stamp` (lines/ink from `visaStamp`) lands once (`applied` flips after the decode; reduced motion: final state at once). A `caution` chance adds a terracotta "CAUTION" label next to the chance text (text, not a stamp).
  - Page order below the visa: disclaimer → `OfficialSourcesBlock` (VerifiedLinkCards) → visa types as expandable vignette cards (`Vignette as="div"` header + `<details>` body) → steps as a numbered itinerary → `ChecklistPage` (`docsKey`, items = `report.documents`/checklist field as today) → timeline + financial box → "How to strengthen your application" (renamed from "How to Guarantee Approval") + rejection reasons → language tests → interview tips → success factors → policy changes → important notes → disclaimer. Replace emoji icons with `kit/Glyphs` SVGs or none.
  - Wrap the report in `ResultArrival` (`label`: "Your visa report is ready").
- [ ] **Step 4: Run** `npm test`, `npm run build`. Browser (390×664 and 1440×900, real `/api/visa-intel` call Pakistan → Canada, Study): loading card shows; result: plain MRZ line + stamp with correct label; focus lands on the result heading; checklist ticks survive reload; reduced motion shows the final state without animation; no console errors; JS size of `/visa` ≤ 281 KB gzip.
- [ ] **Step 5: Commit** `feat(visa): the report arrives as an issued visa (MRZ decode + entry stamp)`

### Task 6: Official Sources redesign + not-found

**Files:**
- Create: `app/sources/uvPair.js` (pure), `app/sources/UvCheck.js` (client), `app/sources/sources.css`, `app/not-found.js`.
- Modify: `app/sources/page.js` (server; ToolShell + ToolHeader; hologram seal count-up via a tiny client `SealCount` using `countUp` + `useInView`; "How we verify" as paper cards), `app/sources/SourcesIndex.js` (region pills → tab-divider styled `Chip`s; rows → paper rows with `n / 6 VERIFIED` seal; `content-visibility: auto`), `app/sources/[code]/page.js` (ToolShell; `UvCheck`; `VerifiedLinkCard`s for the 6 links; CTAs `/visa?to=<code>` and `/relocate?dest=<name>`), `app/components/SourceLinkCard.js` (deleted if fully replaced by `VerifiedLinkCard`).
- Test: `scripts/site/__tests__/uvPair.test.mjs`

**Interfaces:**
- Consumes: `fakeDomain`, `VerifiedLinkCard`, `HologramSeal`, `countUp`, `useInView`, `Chip`, `getSources`, `countVerified`, `domainOf`, `formatVerified`.
- Produces: `uvPair(code) → { real: { url, domain, title } | null, fake: { domain } }` — `real` = the verified `authority` link (else the first verified link of `apply`, `embassies`, `work`, `study`, `citizenship`), `fake.domain = fakeDomain(countryName)`; unknown code → `null`.

- [ ] **Step 1: Write the failing test** `uvPair.test.mjs`: `uvPair('ca').real.domain` equals `domainOf(getSources('ca').links.authority.url)`; `uvPair('ca').fake.domain` ends with `.example` and differs from the real domain; for a country whose authority link is not verified (find one in the data; if none, construct via a stubbed entry passed to a `uvPairFrom(entry, name)` helper), `real` falls back to the next verified type; `uvPair('zz')` → `null`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `UvCheck({ real, fake, name })`: two cards — the real one is a link (`✓ REAL · OFFICIAL GOVERNMENT SITE`, domain), the fake is plain text with a `FAKE EXAMPLE` badge and `✗ NOT OFFICIAL · CHARGES EXTRA FEES`; a UV layer sweeps across each card once when `useInView` fires (`clip-path` is not allowed — sweep a translated overlay with `transform: translateX()` inside `overflow: hidden`); reduced motion: verdicts visible at once; verdict text always in the DOM for screen readers. When `real` is null the UvCheck shows only the fake example with "No verified official site yet". `not-found.js`: ToolShell + ToolHeader (`code: 'X-404'`, title "This page isn't in your", accent "passport.") with links to `/` and `/sources`. Both sources pages stay server components (only `SealCount`, `SourcesIndex`, `UvCheck` are client).
- [ ] **Step 4: Run** `npm test`, `npm run build` (195 static `/sources/[code]` pages still generated); browser at 390×664 and 1440×900: `/sources` seal counts up to the data total once in view, filter + pills work, `/sources/ca` UV sweep plays once, the fake card is not a link (no `<a>` around it), `/sources/zz` and `/nope` show the passport 404; `curl -s /sources/ca | grep -c "FAKE EXAMPLE"` ≥ 1 (server-rendered).
- [ ] **Step 5: Commit** `feat(sources): UV real-vs-fake check, verified seals, passport 404`

**Step 1 gate (controller):** final review of Tasks 1–6, then a private test link (`netlify deploy --build --alias site-test`) for the owner's iPhone; live only after his OK.

---

## STEP 2

### Task 7: Relocation Guide — boarding pass

**Files:**
- Create: `app/lib/relocate.js` (pure), `app/components/kit/Ticket.js`, `app/relocate/relocate.css`.
- Modify: `app/relocate/page.js` (rebuild on ToolShell/kit; origin prefill also from the saved route's `from` → country name; chips disabled while loading; `createLatest` guard), `app/api/relocation/route.js` (cache key `destination:origin:field`; remove `getCommunityConnections` and its Supabase query).
- Test: `scripts/site/__tests__/relocate.test.mjs`

**Interfaces:**
- Consumes: `Ticket`, `ChecklistPage`, `checklistKey`, `ResultArrival`, `Stamp`, `PassportCard`, `Chip`, `createLatest`, `OfficialSourcesBlock`, `countryByCode`, `findCountryInText`, `readRoute`.
- Produces:
  - `ticketCode(place) → string` — exactly 3 uppercase letters: the ISO3 of the country found in `place` via `findCountryInText`, else the first three letters of `place` (letters only, uppercased, padded with `X`).
  - `budgetTiers(monthlyBudget) → Array<{ label, amount }>` — `[{ label: 'Budget' }, { label: 'Comfortable' }, { label: 'Luxury' }]` with `amount` formatted `$1,234/mo`; non-numeric values are dropped; missing object → `[]`.
  - `RELOCATE_CHAPTERS` — ordered `[{ id: 'money', label: 'Money', keys: ['costs','monthlyBudget','comparedToUS','bankingSetup','taxInfo'] }, { id: 'living', label: 'Living', keys: ['neighborhoods','climate','healthcare'] }, { id: 'work', label: 'Work', keys: ['jobMarket','workCulture'] }, { id: 'safety', label: 'Safety', keys: ['safety','emergencyNumbers'] }, { id: 'settling', label: 'Settling in', keys: ['beforeYouMove','firstMonthTips','simCard','visaPath'] }, { id: 'culture', label: 'Culture', keys: ['culturalTips','expatCommunities','languageBarrier'] }]` — use the actual field names returned by `app/api/relocation/route.js` (read its prompt); every returned field appears in exactly one chapter.
  - `chaptersFor(result) → chapter[]` — only chapters with at least one present key.
  - `stubKey(destination) → string` = `checklistKey(['relocate-week1', destination])`.
  - `Ticket({ fromCode, toCode, city, tiers, stamp, stubTitle, stubItems, onTear, torn })` — boarding-pass card: `FROM ✈ TO` codes, city, fare box of tiers (stacks on phones), an `ADMITTED · <CITY>` `Stamp` (blue), and a tear-off stub listing `stubItems`; tearing (click/Enter/Space on the stub button) plays a 700ms transform/opacity tear, then calls `onTear`; reduced motion: a "Save my first-week plan" button does the same without animation. Saving is explicit only.

- **Plan decision:** a new presentational `kit/Ticket.js` instead of adding props to the homepage `BoardingPass` (which is bound to `PassportContext` and the route stub); the two share look, not code, so the homepage stays untouched (spec §4.4 "BoardingPass gets a route / content prop").

- [ ] **Step 1: Write the failing test** `relocate.test.mjs`: `ticketCode('Toronto, Canada')` → `'CAN'`; `ticketCode('Lahore')` → `'LAH'`; `ticketCode('Saint Vincent and the Grenadines')` → `'VCT'`; `ticketCode('')` → `'XXX'`; `ticketCode('Ōsaka!')` → 3 letters `[A-Z]{3}`; `budgetTiers({ budget: 1200, comfortable: 2400, luxury: 'n/a' })` → two tiers, first `{ label: 'Budget', amount: '$1,200/mo' }`; `budgetTiers(undefined)` → `[]`; `chaptersFor({ costs: {}, safety: {} })` → ids `['money','safety']`; every key in the relocation prompt's JSON shape appears in exactly one `RELOCATE_CHAPTERS` entry (parse the field names from `app/api/relocation/route.js` source or keep an explicit `RELOCATION_FIELDS` export there and compare).
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** Result layout: `ResultArrival` → `Ticket` (from `ticketCode(origin || route.from name)`, to `ticketCode(destination)`, `budgetTiers(result.monthlyBudget)`, stub items = `result.firstMonthTips`) → chapter tabs (`role="tablist"`, arrow-key navigation, horizontally scrollable on phones, the first present chapter selected) → panels on `PassportCard`s; "before you move" as `ChecklistPage` (`checklistKey(['relocate', destination])`); emergency numbers as a wallet card of `tel:` links; also render `languageBarrier.detail`, `bankingSetup.notes`, `expatCommunities[].url` (real links, `rel="noopener noreferrer"`). A response whose `createLatest` id is stale is dropped.
- [ ] **Step 4: Run** `npm test`, `npm run build`; browser with a real call (Toronto from Lahore): ticket shows `LAH ✈ CAN`, tiers, stamp lands once, stub tear saves (`localStorage` key from `stubKey`) and shows "Saved on this device"; tabs work with keyboard; quickly tapping two city chips shows only the second city's guide; reduced motion; no console errors; JS ≤ budget.
- [ ] **Step 5: Commit** `feat(relocate): the guide arrives as a boarding pass with a first-week stub`

### Task 8: Country Match — route of stamps

**Files:**
- Create: `app/lib/match.js` (pure), `app/match/MatchRoute.js`, `app/match/MatchForm.js`, `app/match/match.css`.
- Modify: `app/match/page.js` (rebuild: profile → run; no profile → `MatchForm` prefilled from the saved route; run only on submit / Refresh; show cached result when fresh), `app/components/CountryMatchCard.js` (vignette-styled; links carry the route), `app/api/country-match/route.js` (prompt uses names via `describeProfile`).
- Test: `scripts/site/__tests__/match.test.mjs`

**Interfaces:**
- Consumes: `Stamp`, `STAMP_INKS`, `Vignette`, `PassportCard`, `ResultArrival`, `createLatest`, `saveRoute`, `readRoute`, `announceRouteChange`, `deviceStorage`, `countryByCode`.
- Produces:
  - `MATCH_CACHE_KEY = 'migrova_match'`; `readMatchCache(storage, profileKey, now) → matches[] | null` (null when missing, junk, different `profileKey`, older than 24h, or storage throws); `writeMatchCache(storage, profileKey, matches, now) → boolean`.
  - `profileKey(profile) → string` — stable JSON of `{ nationality, currentCountry, experience, skills, preferredCountries }` (arrays sorted).
  - `describeProfile(profile) → { nationality, currentCountry, preferredRegions }` — ISO2 codes replaced by country names (`countryByCode(code)?.name ?? code`), used in the API prompt.
  - `matchLinks({ from, to, name }) → { visa: string, relocate: string }` — `/visa?from=<from>&to=<to>` (omit `from=` when unknown) and `/relocate?dest=<encodeURIComponent(name)>`.
  - `stampSlots(n) → Array<{ x, y, rotate }>` — n ≤ 5 positions in percent along the dashed route path used by `MatchRoute` (deterministic; rotations alternate between −10° and 9°).
  - `MatchRoute({ matches, onPick, picked })` — SVG dashed route (`stroke-dashoffset` draw) + one `<button>` per match rendering a `Stamp` (country name + score), landing one after another (180ms apart) once; each button's accessible name "Set <country> as my destination, match score <n>"; `onPick(match)` saves `{ from, to: match.country_code }` with `saveRoute` + `announceRouteChange()` (explicit tap only).

- [ ] **Step 1: Write the failing test** `match.test.mjs`: write then read within 24h → same matches; read at `now + 24h + 1` → `null`; read with another `profileKey` → `null`; junk JSON / throwing storage → `null` / `false`; `profileKey` equal for `{skills: ['b','a']}` and `{skills: ['a','b']}`; `describeProfile({ nationality: 'in', currentCountry: 'ge' })` → `{ nationality: 'India', currentCountry: 'Georgia', ... }`; `matchLinks({ from: 'pk', to: 'ca', name: 'Canada' })` → `{ visa: '/visa?from=pk&to=ca', relocate: '/relocate?dest=Canada' }`; `matchLinks({ to: 'nz', name: 'New Zealand' }).visa` → `'/visa?to=nz'`; `stampSlots(5)` → 5 distinct slots within 0–100; `stampSlots(0)` → `[]`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Implement.** `MatchForm` (passport data-page styling: nationality select prefilled from `readRoute().from`, current country, experience, skills, preferred regions; real `<form>`, 16px controls) runs the match without signing in. Result: `ResultArrival` → `MatchRoute` → five `CountryMatchCard`s (VISA / JOBS / COST / LANG strip, visa-path sentence, `matchLinks` links, "Set as destination" button calling the same `onPick`). Cache via `readMatchCache`/`writeMatchCache`; "Refresh matches" bypasses the cache. Picking a destination updates the navbar `RoutePill` (via the route event).
- [ ] **Step 4: Run** `npm test`, `npm run build`; browser: signed out with a saved route PAK→(none) → form prefilled with Pakistan; submit → stamps land in order along the route, focus to results; tap Canada → pill shows `PAK ✈ CAN`; reload → cached result shows without a new API call (check network); Refresh → new call; links carry the route; reduced motion; no console errors.
- [ ] **Step 5: Commit** `feat(match): matches land as stamps along your route; no signed-out dead end`

**Step 2 gate (controller):** final review of Tasks 7–8, test link for the owner's iPhone, live after his OK.

---

## Verification per step (controller, after the tasks)

- `npm test`, `npm run build`.
- `node scripts/perf/js-size.mjs` for `/`, `/visa`, `/relocate`, `/match`, `/sources`, `/sources/ca` on a local prod build (each ≤ 281 KB gzip; record kit CSS/JS deltas).
- Paired LCP A/B vs master (`lcp.mjs`, alternating, 4 pairs) on `/visa` and `/sources/ca`: median delta ≤ +150 ms.
- Real-GPU Chromium frame timing (the `anim-smooth.mjs` harness pattern) on emulated iPhone 13 (390×664, touch, CPU ×4) while each signature moment plays: p95 < 20 ms.
- Layout matrix 375×548, 390×664, 390×844, 768×1024, 1440×900: no horizontal scroll, no clipped text, no console errors; reduced-motion pass.
- Homepage smoke: book opens/closes, route tear → pill → `/visa` prefill.
