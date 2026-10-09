# Passport Homepage ("Journey Book") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace Migrova's text-only homepage with a scroll-driven "Journey Book" passport that opens, carries Migrova's real content on its pages, and closes into a boarding-pass finale — plus a site-wide navbar/footer in the new night + warm-paper style.

**Architecture:** A server `app/page.js` renders a client `PassportStage`: a tall section with a sticky stage. A pure `pose.js` maps scroll progress (0..1, via `timeline.js`) to every visual parameter; a vanilla rAF hook writes those as `transform`/`opacity` on DOM refs (no re-render per frame). Page components are real HTML on the passport pages and react to an `active` prop for arrival effects. Layout modes: desktop spread, phone notepad, lite, reduced-motion stack.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind 4, plain JS (no TS), CSS 3D transforms, SVG; `node:test` for unit tests. No new npm dependencies.

**Spec:** `docs/superpowers/specs/2026-10-09-passport-homepage-design.md`
**Visual reference (approved prototypes):** `docs/superpowers/prototypes/passport-scroll.html`, `docs/superpowers/prototypes/idea-sampler.html` (copied in Task 1). Match their look; this plan and the spec win on content and behavior.

## Global Constraints

- No new npm dependencies (no motion, lenis, d3).
- Homepage First Load JS ≤ **+30KB gzipped** vs. the baseline recorded in Task 1.
- LCP (hero H1) ≤ **2.5s** on the throttled phone profile (4× CPU, ~1.6Mbps down / 150ms latency, 375×812).
- Animate only `transform` and `opacity`. No `backdrop-filter`, no SVG filters in phone/lite modes.
- Phone breakpoint: **< 768px** → notepad layout. Lite mode: Save-Data on, or `navigator.deviceMemory ≤ 2`, or (coarse pointer and `hardwareConcurrency ≤ 4`). `prefers-reduced-motion: reduce` → stack layout. QA override: `?motion=full|lite|reduced`.
- Copy: "195 countries" everywhere; the verified-link count is **computed** from `OFFICIAL_SOURCES` (currently 418), never hard-coded.
- Trust rules: cover microprint **"JOURNEY BOOK · SPECIMEN · NOT A TRAVEL DOCUMENT"**, issuer code **MGV**, no national emblem or real passport colour; the fake site is `<countryname-lowercased-hyphenated>-visa-fastpass.example`, labelled **FAKE EXAMPLE**, never a link.
- localStorage: every access in try/catch; the route is saved **only** by tearing the boarding-pass stub (or the reduced-motion "Remember this route" button).
- Accessibility: page content is real HTML in DOM order p0→p8, each page has an `h2`; decorative SVG `aria-hidden="true"`; text on paper ≥ 4.5:1; phone body text ≥ 16px.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Dev-only test hook `window.__passportRender(p)` (guarded by `process.env.NODE_ENV !== 'production'`). The automated browser pane is a hidden tab: rAF and CSS transitions pause there — verify beats via the hook and add `transition:none` when snapshotting.

## Review Focus

1. **Empty route** (no saved route/profile, From and To unset) → hero, data page, MRZ and boarding pass show defaults ("Your family", `ANY`), never `undefined`/`null`. Test: Task 2 `mrz.test` + `route.test` defaults; Task 7 browser step with cleared storage.
2. **localStorage throws** (Safari private mode, blocked storage) → no crash; pill hidden; tear still animates. Test: Task 2 `route.test` throwing-storage cases.
3. **Deep links and keyboard** — `/#sources`, back/forward with restored scroll, Tab into a page that isn't visible → book shows that page. Test: Task 2 `timeline.test` `progressForPage`; Task 7 browser steps.
4. **Resize across 768px mid-scroll** (rotate phone, drag window) → mode switches cleanly, book re-measures, no stale transforms. Test: Task 4 `pose.test` notepad/spread parity at same `p`; Task 7 browser resize step.
5. **Long names and long stories** ("Saint Vincent and the Grenadines", 5000-char stories) → MRZ stays exactly 44 chars, boarding pass uses ISO3, story text clamped to 220 chars on the page. Test: Task 2 `mrz.test` length with any input; Task 6 clamp assertion.

---

## File map

| File | Responsibility |
|---|---|
| `docs/superpowers/prototypes/*.html` | Approved visual references (copied, committed) |
| `app/data/countries195.js` (mod) | add `iso3` |
| `app/components/passport/timeline.js` | beats → ranges; page ↔ progress |
| `app/components/passport/pose.js` | progress → desktop / notepad pose (pure) |
| `app/components/passport/mrz.js` | MRZ lines + decode frames (pure) |
| `app/components/passport/route.js` | saved route read/save/forget/label (pure, injected storage) |
| `app/components/passport/useScrollProgress.js` | rAF smoothed section progress → callback |
| `app/components/passport/useLayoutMode.js` | `{motion:'full'|'lite'|'reduced', phone:boolean}` |
| `app/components/passport/PassportContext.js` | route state + active pages |
| `app/components/passport/Book.js` | renders leaves/base for spread / notepad / lite / stack; exposes DOM refs |
| `app/components/passport/NightSky.js` | stars, faint globe, night→dawn layers (refs) |
| `app/components/passport/JourneySearch.js` | From/To/Explore |
| `app/components/passport/PassportStage.js` | composes everything; applies pose each frame |
| `app/components/passport/parts/` | `Vignette.js`, `Stamp.js`, `HologramSeal.js`, `Guilloche.js`, `FounderRoute.js` |
| `app/components/passport/pages/` | `Cover.js`, `Notice.js`, `DataPage.js`, `VisasOne.js`, `VisasTwo.js`, `Entries.js`, `UvSources.js`, `Travellers.js`, `Observations.js` |
| `app/components/passport/BoardingPass.js` | Step 2: pass + stub tear |
| `app/components/RoutePill.js` | Step 2: navbar pill |
| `app/components/Navbar.js` (mod) | restyle, `tone` prop, RoutePill slot |
| `app/components/SiteFooter.js` | site-wide footer (replaces `LegalFooter` + homepage footer) |
| `app/page.js` (rewrite) | server page |
| `app/globals.css`, `app/layout.js` (mod) | tokens, Inter 800, Naskh font, footer swap |
| `app/visa/page.js`, `app/relocate/page.js` (mod) | `?from=`; saved-route fallback (Step 2) |
| `scripts/perf/lcp.mjs` | throttled LCP measurement |
| `scripts/passport/__tests__/*.test.mjs` | unit tests (run by `npm test`) |

`npm test` currently runs `scripts/sources/__tests__/*.test.mjs`; Task 2 widens it to `"node --test \"scripts/**/__tests__/*.test.mjs\""`.

---

# STEP 1

### Task 1: Baseline, references, ISO3 and "195" copy

**Files:**
- Create: `docs/superpowers/prototypes/passport-scroll.html`, `docs/superpowers/prototypes/idea-sampler.html` (copy from `.superpowers/brainstorm/1218-1791524077/content/`)
- Modify: `app/data/countries195.js` (table gains a 5th column `iso3`; objects gain `iso3`)
- Modify: `app/lib/pageCopy.js` (`HERO_COPY.home.sub` "100 countries" → "195 countries"), `app/page.js` meta strings mentioning 100 (search `100`)
- Test: `scripts/sources/__tests__/countries.test.mjs` (extend)

**Interfaces:**
- Produces: every `COUNTRIES_195` entry has `iso3: string` (ISO 3166-1 alpha-3, e.g. `pk→PAK`, `ca→CAN`, `ps→PSE`, `va→VAT`, `kp→PRK`, `kr→KOR`, `cd→COD`, `cg→COG`, `tl→TLS`, `sz→SWZ`).

- [ ] **Step 1:** Record baseline: `npm run build` and note the `/` route "First Load JS" in the commit message body.
- [ ] **Step 2: Failing test** in `countries.test.mjs`:
  ```js
  test('every country has a unique ISO3 code', () => {
    const codes = COUNTRIES_195.map((c) => c.iso3);
    assert.equal(new Set(codes).size, 195);
    for (const c of COUNTRIES_195) assert.match(c.iso3, /^[A-Z]{3}$/, c.code);
    assert.equal(countryByCode('pk').iso3, 'PAK');
    assert.equal(countryByCode('gb').iso3, 'GBR');
    assert.equal(countryByCode('ps').iso3, 'PSE');
  });
  ```
- [ ] **Step 3:** Run `npm test` → FAIL.
- [ ] **Step 4:** Add `iso3` to all 195 rows; copy the two prototype files; fix "100 countries" copy.
- [ ] **Step 5:** `npm test` → PASS; `grep -rn "100 countries\|100 COUNTRIES" app` → no matches.
- [ ] **Step 6:** Commit `feat(data): ISO3 codes; 195-country copy; passport prototypes as reference`.

### Task 2: Pure modules — timeline, MRZ, route

**Files:**
- Create: `app/components/passport/timeline.js`, `mrz.js`, `route.js`
- Test: `scripts/passport/__tests__/timeline.test.mjs`, `mrz.test.mjs`, `route.test.mjs`
- Modify: `package.json` `test` script (see above)

**Interfaces (produces):**
```js
// timeline.js
export const PAGES = ['cover','notice','data','visas1','visas2','entries','sources','travellers','observations'];
export const ANCHORS = { tools: 'visas1', 'how-it-works': 'entries', sources: 'sources', stories: 'travellers' };
export const BEATS = [ // weights in viewport heights; sum = 7.95
  ['arrival',.4],['ajar',.4],['open',.5],['spread1',.8],['flip1',.35],['spread2',.9],['flip2',.35],
  ['spread3',.7],['uv',1.0],['flip3',.35],['spread4',.8],['closing',.8],['finale',.6]];
export const SPREAD_OF = { notice:'spread1', data:'spread1', visas1:'spread2', visas2:'spread2', entries:'spread3', sources:'spread3', travellers:'spread4', observations:'spread4' };
export function buildTimeline(beats = BEATS)        // → { ranges: { [id]: [start, end] }, viewports: number }
export function localT(timeline, beatId, p)         // → 0..1, clamped
export function beatAt(timeline, p)                 // → beat id containing p (p=1 → 'finale')
export function progressForPage(timeline, pageId)   // → p at the middle of that page's spread beat; 'cover' → 0
// mrz.js
export const MRZ_LEN = 44;
export const MRZ_PLAIN = ['PLAIN ENGLISH. OFFICIAL SOURCES.', 'NO SCAMS. NO GUESSWORK.'];
export const DECODE_FRAMES = 59;
export function buildMrz({ fromIso3, toIso3 })     // → [line1, line2], each MRZ_LEN chars of [A-Z0-9<]
export function decodeFrame(raw, plain, frame)      // → string, length MRZ_LEN
// route.js
export const ROUTE_KEY = 'migrova_route';
export function readRoute(storage)                  // → { from: code|null, to: code|'any'|null } | null
export function saveRoute(storage, { from, to }, now = Date.now())  // → boolean
export function forgetRoute(storage)                // → void
export function routeLabel({ from, to })            // → 'PAK ✈ CAN' | 'PAK ✈ ANY' | 'ANY ✈ ANY'
```
`buildMrz`: line1 = `P<MGV` + `YOUR<FAMILY<<` + (fromIso3 ?? '') then `<` padding; line2 = `1950418MGV<<` + (toIso3 ?? 'ANY') + `<<NEXT<STOP` then `<` padding; both truncated/padded to 44. `decodeFrame`: frames 0–6 return `raw`; afterwards character `i` is `plain.padEnd(44)[i]` once `frame >= 18 + Math.floor(i * 0.9)`, otherwise the scramble char `CHARSET[(i * 7 + frame * 3) % CHARSET.length]` with `CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<'`; frame ≥ `DECODE_FRAMES` returns the padded plain text.

- [ ] **Step 1: Failing tests:**
  - `timeline.test`: ranges cover [0,1] contiguously and in BEATS order; `viewports` ≈ 7.95 (±1e-9); `beatAt(t,0)==='arrival'`, `beatAt(t,1)==='finale'`; `localT` clamps (−0.5→0, 2→1); `progressForPage(t,'cover')===0`; `progressForPage(t,'sources')` lies strictly inside `ranges.spread3`; every value in `ANCHORS` is a page in `PAGES`.
  - `mrz.test`: `buildMrz({})` → both lines length 44, match `/^[A-Z0-9<]{44}$/`, line1 contains `YOUR<FAMILY`, line2 contains `ANY`; `buildMrz({fromIso3:'PAK',toIso3:'CAN'})[1]` contains `CAN`; overly long inputs (`'X'.repeat(80)`) still 44; `decodeFrame(raw, plain, 0) === raw`; `decodeFrame(raw, plain, DECODE_FRAMES) === plain.padEnd(44)`; same args → same output.
  - `route.test` (fake storage object): save→read roundtrip `{from:'pk',to:'ca'}`; `to:'any'` allowed; invalid code `{from:'zz'}` → `saveRoute` false; malformed JSON → `readRoute` null; storage whose `getItem`/`setItem`/`removeItem` throw → `readRoute` null, `saveRoute` false, `forgetRoute` no throw; `routeLabel({from:'pk',to:'ca'})==='PAK ✈ CAN'`, `routeLabel({from:null,to:null})==='ANY ✈ ANY'`.
- [ ] **Step 2:** `npm test` → FAIL (modules missing).
- [ ] **Step 3:** Implement the three modules (ESM, no React; `route.js` imports `countryByCode` from `app/data/countries195.js`).
- [ ] **Step 4:** `npm test` → PASS (existing source tests still pass).
- [ ] **Step 5:** Commit `feat(passport): timeline, MRZ and route modules with tests`.

### Task 3: Site shell — tokens, fonts, Navbar restyle, SiteFooter

**Files:**
- Modify: `app/globals.css` (add tokens from spec §1 to `:root` and `@theme inline` as `--color-night-0..2`, `--color-dawn-1..3`, `--color-page`, `--color-page-ink`, `--color-lime`, `--color-peach`, `--color-uv`; keep all existing tokens)
- Modify: `app/layout.js` (Inter weights add `'800'`; replace `<LegalFooter />` with `<SiteFooter />`)
- Modify: `app/components/Navbar.js` (keep all auth/profile/menu logic; restyle markup)
- Create: `app/components/SiteFooter.js`; Delete: `app/components/LegalFooter.js` (no other importers — verify with grep)

**Interfaces:**
- Produces: `export default function Navbar({ tone = 'paper' })` — `tone: 'paper' | 'night'`. Renders `{routeSlot}` placeholder position where Step 2's `<RoutePill/>` goes (leave a comment-free empty fragment slot; Step 2 inserts the component there). Wordmark: lowercase **migrova** (Inter 800, `-0.02em`) preceded by an 18px rounded square with `linear-gradient(135deg, var(--lime), #e8734a)`. `night`: background `rgba(11,19,15,.72)` solid (no blur), text `#ece6d2`, border `rgba(236,230,210,.08)`; `paper`: current cream background and ink. Mobile drawer and dropdowns restyled to match tone; behavior unchanged.
- Produces: `export default function SiteFooter()` — night-green band (`--night-1`), wordmark, links (Tools menu items, Sources, Stories, Contact, Legal), "A sibling of OpportuMap" link, and the legal one-liner text from the old `LegalFooter` (with the `/legal` link).

- [ ] **Step 1:** Implement the CSS tokens and font weight.
- [ ] **Step 2:** Restyle Navbar with the `tone` prop; create SiteFooter; swap it into layout; remove the homepage's inline `<footer>` block in `app/page.js` (page is rewritten in Task 7 anyway).
- [ ] **Step 3:** `npm run build` → passes. Browser (built-in pane, `npm run dev` via `preview_start {name:'migrova'}`): `/visa`, `/sources/us`, `/stories` at 1440×900 and 375×812 show the new navbar (paper tone) and footer; mobile drawer opens/closes; Tools dropdown works; Sign in opens the modal; no console errors.
- [ ] **Step 4:** Commit `feat(shell): new navbar + site footer, night/dawn tokens, Inter 800`.

### Task 4: Pose engine

**Files:**
- Create: `app/components/passport/pose.js`, `useScrollProgress.js`, `useLayoutMode.js`
- Test: `scripts/passport/__tests__/pose.test.mjs`

**Interfaces:**
- Consumes: `buildTimeline`, `localT`, `beatAt`, `PAGES` (Task 2).
- Produces:
```js
// pose.js (pure)
export function desktopPose(timeline, p)
// → { shift: 0..1 (1 = closed book right of centre, 0 = spine centred),
//     scale, tiltX, tiltY,                       // degrees
//     leaves: [a0,a1,a2,a3],                     // degrees, 0 (closed/right) .. -180 (open/left)
//     coverLight: 0..1, flap: 0..1, uvDim: 0..1,
//     sky: 0..1 (0 night → 1 daylight), heroOpacity: 0..1, finaleOpacity: 0..1,
//     bonVoyage: boolean, blessing: boolean }
export function notepadPose(timeline, p)
// → { page: 0..8 (index into PAGES), flip: 0..1 (current page lifting away),
//     sky, heroOpacity, finaleOpacity, flap, uvDim }
// useScrollProgress.js (client)
export function useScrollProgress(sectionRef, onFrame, { ease = 0.09 } = {}) // calls onFrame(p) each rAF; renders immediately on scroll when document.hidden
// useLayoutMode.js (client)
export function useLayoutMode() // → { motion: 'full'|'lite'|'reduced', phone: boolean } (SSR default {motion:'full', phone:false})
```
Schedule (values the tests pin):
- leaf0: `ajar` 0 → −35, `open` −35 → −180. leaf1: `flip1` 0 → −180. leaf2: `flip2`. leaf3: `flip3`. All eased (`easeInOutCubic`).
- `closing`: leaves return to 0 in order 3,2,1,0 over sub-windows [0,.55], [.15,.70], [.30,.85], [.45,1.0] of `closing`.
- `shift`: 1 during `arrival`, → 0 across `ajar`+`open`, 0 until `closing` midpoint, → 1 by `closing` end, 1 in `finale`.
- `coverLight`: rises 0→1 in `ajar`, falls to 0 in `open`.
- `flap`/`uvDim`: in `uv`, rise 0→1 over its first 20%, hold, fall over its last 15%; 0 elsewhere.
- `sky`: 0 before `spread3`; linear to 1 from `spread3` start to `closing` end; 1 in `finale`.
- `heroOpacity`: 1 → 0 across the first 70% of `ajar`. `finaleOpacity`: 0 → 1 across the first 60% of `finale`.
- `bonVoyage`: `localT(closing) ≥ 0.9` or in `finale`. `blessing`: `localT(closing) ≥ 0.95` or in `finale`.
- Notepad: page index advances one page per flip; spreads show their left page during the first half of the spread beat and their right page in the second half (a flip happens across the middle 20% of the spread beat); `flip` is 0..1 during each flip window.

- [ ] **Step 1: Failing tests** (`pose.test.mjs`): at `p=0` leaves `[0,0,0,0]`, `shift===1`, `heroOpacity===1`; at the middle of `spread2` leaves `[-180,-180,0,0]`; middle of `spread4` all `-180`; end of `closing` all `0` and `shift===1`; `p=1` → `finaleOpacity===1`, `sky===1`, `bonVoyage && blessing`; leaf0 is non-increasing across `ajar`+`open` (sample 50 points); middle of `uv` → `flap===1 && uvDim===1`; `notepadPose` page at the middle of `spread1`'s first half is `PAGES.indexOf('notice')` and of its second half `PAGES.indexOf('data')`; for 200 sampled `p`, desktop `sky`/`heroOpacity`/`finaleOpacity` equal the notepad values (mode switch must not jump the sky or copy).
- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `pose.js`, then the two hooks (`useLayoutMode` listens to `matchMedia('(max-width: 767px)')`, `matchMedia('(prefers-reduced-motion: reduce)')`, reads `?motion=` once, and re-evaluates on change; `useScrollProgress` computes `target = clamp((scrollY − sectionTop) / (sectionHeight − innerHeight))`, re-measures on resize).
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** Commit `feat(passport): pose engine + scroll/layout hooks`.

### Task 5: Book, sky and passport parts

**Files:**
- Create: `app/components/passport/Book.js`, `NightSky.js`, `PassportContext.js`, `parts/Vignette.js`, `parts/Stamp.js`, `parts/HologramSeal.js`, `parts/Guilloche.js`

**Interfaces:**
- Produces:
```js
export function PassportProvider({ initialRoute, children })   // context: { route:{from,to}, setRoute, active:Set<pageId>, setActive }
export function usePassport()
export default function Book({ leaves, base, layout, refs })
// leaves: [{ id, front: ReactNode, back: ReactNode }] (4 items: cover/notice, data/visas1, visas2/entries, sources/travellers)
// base: ReactNode (observations); layout: 'spread'|'notepad'|'lite'|'stack'
// refs: { book: Ref, leaves: Ref[] (4), flap: Ref, light: Ref (cover light-leak wedge), pages: Ref[] (9, notepad/lite) } — PassportStage writes styles to these
export default function NightSky({ refs })   // refs: { night, predawn, sunrise, day, dim } layer elements
export function Vignette({ type, title, desc, href, mrz, applied })  // type: 'M-MATCH'|'V-VISA'|'R-RELOCATE'|'L-COUNSEL'|'S-SOURCES'
export function Stamp({ shape, color, lines, applied })              // shape: 'circle'|'rect'|'triangle'|'hexagon'
export function HologramSeal({ count, label })
export function guillocheDataUri(seed)                              // memoised SVG data URI for page backgrounds
```
- Page faces: page unit `--u = pageWidth/100` set on the book; faces `backface-visibility:hidden`, back face `rotateY(180deg)`; stacking via `translateZ` (cover highest when on the right, lowest when on the left; a flipping leaf +6px). Page aspect 1 : 1.42; spread width ≤ `min(72vw, (80vh/1.42)*2, 940px)`.
- `stack` layout renders the 9 pages as paper cards in order (spreads side-by-side ≥ 768px), no 3D, no sticky.
- Vignette `applied`: from `translate(8px,-14px) rotate(4deg)` + deep shadow → flat (CSS transition 450ms); hologram stripe shimmers on hover and `:focus-visible`. Stamp `applied`: scale 2.2 → 1 thunk (320ms, overshoot). Both render final state immediately in `reduced`.

- [ ] **Step 1:** Build the components to match the prototype's look (cover leather, guilloche, page header/footer microcopy, page numbers).
- [ ] **Step 2:** `npm run build` passes; `npm test` still passes.
- [ ] **Step 3:** Commit `feat(passport): Book, NightSky, context and stamp/vignette/seal parts`.

### Task 6: The nine pages (Step-1 versions)

**Files:** Create `app/components/passport/pages/{Cover,Notice,DataPage,VisasOne,VisasTwo,Entries,UvSources,Travellers,Observations}.js`

**Interfaces:**
- Consumes: parts and `usePassport()` (Task 5); `buildMrz` (Task 2); `COUNTRIES_195`/`countryByCode` (iso3); `OFFICIAL_SOURCES`, `getSources`, `domainOf` from `app/lib/officialSources.js`.
- Produces: each page `export default function X({ active })` rendering `<section id={pageId} aria-labelledby={pageId+'-h'}>` with an `h2#{pageId}-h` (visually styled per page). Extra props: `UvSources({ active, verifiedCount })`, `Travellers({ active, stories })`, `Observations({ active, note })`.
- Cover font: `Noto_Naskh_Arabic({ subsets: ['arabic'], weight: '600', preload: false })` from `next/font/google`, declared in `Cover.js` only, applied to the Arabic/Urdu spans. Foil shimmer: in full desktop mode a `pointermove` listener writes `--mx` on the cover; otherwise a slow 8s CSS sheen.
- Content (exact copy from spec §2): Cover (crest, cover word "سفر · SAFARI · JOURNEY" in a `<span lang="ar" dir="rtl">` + Latin, hover/tap etymology tooltip text from spec beat 0, chip icon, spine microprint, issuer MGV); Notice ("This passport opens every border's rules." + what Migrova is); DataPage (fields from route with defaults "Your family" / "Your 5 best matches", family line-art photo box, "Find my countries →" `/match`, static MRZ lines from `buildMrz`); VisasOne (heading "Five free tools for the whole move." + M-MATCH `/match` + V-VISA `/visa` vignettes); VisasTwo (R-RELOCATE `/relocate`, L-COUNSEL `/lawyer`, S-SOURCES `/sources`); Entries (four stamps "ENTRY 0n · <STEP> · <today DD MMM YYYY>", circle/rect/triangle/hexagon, dashed route SVG); UvSources (Step 1: count-up to `verifiedCount` when `active` in the line "{verifiedCount} verified government links · 195 countries · 0 look-alikes", HologramSeal, the real-site card for `route.to` → `getSources(to).links.authority` if verified else Canada's, line "Border officers check documents under UV. Migrova checks visa websites."); Travellers (≤2 stories as EXIT/ENTRY stamp pairs with quote clamped to 220 chars + "…"; zero stories → invite "Your story could be the next stamp" → `/stories`); Observations (`note` text, endorsement box "INFORMATION, NOT LEGAL ADVICE. ALWAYS CONFIRM ON THE OFFICIAL SITE.", static founder route SVG Gilgit-Baltistan → Kampala → USA "here, building this").
- Founder note default (until Aahil supplies his): `"My family carried our whole life in one folder of papers, across three countries. Migrova is the guide I wish we'd had."` — exported as `FOUNDER_NOTE` from `app/lib/pageCopy.js`.

- [ ] **Step 1: Failing test** (`scripts/passport/__tests__/pages-copy.test.mjs`): `import { clampStory } from '../../../app/components/passport/pages/storyText.js'` — `clampStory('a'.repeat(5000)).length === 221` and ends with `…`; `clampStory('short') === 'short'`. (Put `clampStory` in `pages/storyText.js`, pure.)
- [ ] **Step 2:** `npm test` → FAIL; implement `storyText.js`; → PASS.
- [ ] **Step 3:** Build the nine pages.
- [ ] **Step 4:** `npm run build` passes.
- [ ] **Step 5:** Commit `feat(passport): nine Journey Book pages`.

### Task 7: Homepage integration, search, accessibility, modes

**Files:**
- Create: `app/components/passport/PassportStage.js`, `JourneySearch.js`
- Rewrite: `app/page.js` (server component)
- Modify: `app/visa/page.js` (read `?from=`)
- Create: `scripts/perf/lcp.mjs`

**Interfaces:**
- Consumes: everything above.
- Produces:
```js
// app/page.js (server)
export const revalidate = 600;
export const metadata = { title: 'Migrova — your family\'s next country, made simple', description: <spec trust line> };
// fetches ≤2 approved stories (lib/supabase.js anon client; on error → []), computes verifiedCount from OFFICIAL_SOURCES,
// renders <Navbar tone="night"/> + <PassportStage stories={...} verifiedCount={...} />
export default function PassportStage({ stories, verifiedCount })
export default function JourneySearch({ variant })   // 'hero' | 'finale'; reads/writes route via usePassport()
```
- PassportStage: renders skip link ("Skip to tools" → `#tools`, first focusable), hero copy (H1 "Your family's next country, **made simple.**" with lime→peach gradient on "made simple."; sub; `JourneySearch variant="hero"`; trust line "Free · 195 countries · {verifiedCount} verified official links · information, not legal advice"; "↓ scroll to open"), the section (height `timeline.viewports × 100svh`, sticky 100svh stage) with `NightSky` + `Book`, and finale copy ("60 seconds from here to **somewhere new.**" + `JourneySearch variant="finale"`). Layout mapping: `reduced` → Book `stack` (no stage/pose); `lite` → `lite` + `notepadPose`; `phone` → `notepad` + `notepadPose`; otherwise `spread` + `desktopPose`. Each frame: write styles to refs; compute the active spread/page set and `setActive` only when it changes.
- Anchors: on mount and `hashchange`, if `location.hash` names a key in `ANCHORS` → `window.scrollTo({ top: sectionTop + progressForPage(t, page) * (sectionHeight − innerHeight) })`. `focusin` inside a page not in `active` → same scroll to that page.
- JourneySearch: From select (195, flag + name), To select ("Anywhere" + 195); initial from `readRoute(localStorage)`, else `opportumap_profile.nationality`, else empty. Explore → To=any → `/match`; else `/visa?from=&to=` (omit empty `from`).
- Visa page: `?from=<code>` (valid via `countryByCode`) sets nationality before the profile prefill runs (profile must not overwrite an explicit `from`).
- `scripts/perf/lcp.mjs <url>`: headless Chrome over CDP (pattern from `scripts/sources/lib/fetchPage.mjs`), `Emulation.setDeviceMetricsOverride` 375×812 mobile, `Emulation.setCPUThrottlingRate {rate:4}`, `Network.emulateNetworkConditions {latency:150, downloadThroughput:200000, uploadThroughput:93750}`; read the largest `largest-contentful-paint` entry via `Runtime.evaluate`; print `LCP <ms>` and exit 1 if > 2500.

- [ ] **Step 1:** Implement PassportStage, JourneySearch, server `page.js`, visa `?from`.
- [ ] **Step 2:** `npm test` and `npm run build` pass; record `/` First Load JS → ≤ baseline + 30KB.
- [ ] **Step 3: Browser checks** (`preview_start {name:'migrova'}`, 1440×900): `__passportRender` at each beat midpoint (13 screenshots) match the storyboard; 375×812 notepad walk-through; `?motion=lite`; `?motion=reduced` shows the stack with all content; `/#sources` lands on the sources spread; Tab from the skip link reaches tool vignettes and the book shows their page; resize 1440→600→1440 at p=0.5 keeps the correct page; cleared localStorage → data page shows "Your family" and MRZ has `ANY`; Explore with From=Pakistan To=Canada → `/visa?from=pk&to=ca` with both prefilled; no console errors; no horizontal scroll at 375.
- [ ] **Step 4: Perf:** `npm run build && npx next start -p 3200` then `node scripts/perf/lcp.mjs http://localhost:3200/` → `LCP` ≤ 2500.
- [ ] **Step 5:** Commit `feat(home): Journey Book passport homepage (step 1)`.

### Task 8: Ship Step 1

- [ ] **Step 1:** `npx netlify-cli deploy --build --prod`; live check: homepage beats (scroll in the pane with `__passportRender` absent in prod → use real scrolling + screenshots), a tool page's navbar/footer, visa prefill.
- [ ] **Step 2:** `node scripts/perf/lcp.mjs https://migrova.netlify.app/` → ≤ 2500.
- [ ] **Step 3:** `git push origin master`. Pause for Aahil's feedback before Step 2.

# STEP 2

### Task 9: UV lamp fold-out

**Files:** Modify `pages/UvSources.js`, `PassportStage.js`, `NightSky.js`

**Interfaces:** `UvSources` adds the fold-out flap (driven by `pose.flap` via `refs.flap`), two site cards (real: domain from the verified authority link, clickable; fake: `<countryname-lowercased-hyphenated>-visa-fastpass.example`, **FAKE EXAMPLE** badge, plain text, not a link), UV layer revealed by a `mask-image: radial-gradient(circle 95px at var(--lx) var(--ly), #000 55%, transparent 100%)` whose vars are written in a rAF-throttled `pointermove` (desktop full mode); phones/lite: a horizontal scanner band sweeping automatically; each card auto-reveals when centred; a "Show everything" toggle (also default in `reduced`). Sky dim from `pose.uvDim` writes the `dim` layer opacity; when `uvDim` falls past 0.5 on the way out, the dim layer flickers (two 60ms opacity pulses) before fading.

- [ ] **Step 1: Failing test** `uv.test.mjs`: `fakeDomain('United Kingdom') === 'united-kingdom-visa-fastpass.example'`, `fakeDomain("Côte d'Ivoire") === 'cote-d-ivoire-visa-fastpass.example'` (pure helper `fakeDomain(name)` in `pages/uv.js`, NFKD-strip accents, non-alphanumerics → `-`, collapse/trim dashes).
- [ ] **Step 2:** FAIL → implement → PASS.
- [ ] **Step 3:** Implement the flap, lamp, scanner and toggle; browser-check at the `uv` beat (desktop lamp by dispatching `pointermove`; phone scanner; reduced shows both revealed).
- [ ] **Step 4:** Commit `feat(passport): UV lamp real-vs-fake check`.

### Task 10: MRZ decode, BON VOYAGE, blessing

**Files:** Modify `pages/DataPage.js`, `pages/Cover.js`, `PassportStage.js`

**Interfaces:** DataPage runs `decodeFrame` at 45ms per frame up to `DECODE_FRAMES` when `active` becomes true (once per arrival; tap/click/Enter replays; `reduced` shows raw and plain lines together). Cover shows the **BON VOYAGE** stamp when `pose.bonVoyage`, and cross-fades the cover word to `<span lang="ur" dir="rtl">سفر بخیر</span> · SAFARI NJEMA · SAFE TRAVELS` when `pose.blessing`.

- [ ] **Step 1:** Implement; browser-check data page decode (snap with `transition:none`), closing beat stamp + blessing.
- [ ] **Step 2:** Commit `feat(passport): MRZ decode, bon voyage stamp and blessing`.

### Task 11: Boarding pass, route pill, prefill

**Files:** Create `BoardingPass.js`, `app/components/RoutePill.js`; Modify `PassportStage.js` (finale), `Navbar.js` (slot), `app/visa/page.js`, `app/relocate/page.js`

**Interfaces:**
- `BoardingPass()` (reads `usePassport().route`): slides out of the book in `finale` (opacity/translate from `finaleOpacity`); big ISO3 codes `{FROM} ✈ {TO}` (`ANY` when unset); "GATE /match · SEAT 1A · BOARDING: when you're ready"; primary "Find my countries →" `/match`; secondary "Check a visa" `/visa?from&to`; stub button "Tear to remember this route on this device ✂" → animate tear (translate/rotate/fade 700ms), `saveRoute(localStorage, route)`, dispatch `window.dispatchEvent(new Event('migrova:route'))`. Reduced motion: stub is a "Remember this route" button with an `aria-live="polite"` "Route saved" message.
- `RoutePill()`: reads `readRoute(localStorage)` on mount and on `migrova:route` / `storage` events; renders nothing if null; else a pill `routeLabel(route)` linking to `/visa?from&to` plus a ✕ button (`aria-label="Forget my route"`) calling `forgetRoute` and dispatching `migrova:route`.
- Visa: if no `?from`/`?to`, fall back to `readRoute` (from → nationality, to → destination unless 'any'). Relocate: if no `?dest`, fall back to the route's `to` country name.

- [ ] **Step 1:** Implement; browser-check: tear → pill appears in navbar on the homepage and on `/visa` (persisted), ✕ removes it everywhere; `/visa` with only a saved route is prefilled; Safari-private simulation (`Object.defineProperty(window,'localStorage',{get(){throw new Error('denied')}})` before load) → no errors, no pill.
- [ ] **Step 2:** Commit `feat(passport): boarding pass, route pill and tool prefill`.

### Task 12: Founder route animation

**Files:** Modify `parts/FounderRoute.js`, `pages/Observations.js`

**Interfaces:** Three legs drawn via `stroke-dashoffset` (lime → gold `#d6b866` → peach) sequentially over 2.4s when Observations becomes `active`; final dot pulses with label "here, building this"; `reduced` renders fully drawn.

- [ ] **Step 1:** Implement; browser-check at `spread4`.
- [ ] **Step 2:** Commit `feat(passport): founder route animation`.

### Task 13: Ship Step 2

- [ ] **Step 1:** `npm test`, `npm run build` (JS budget), perf script on `next start` → pass.
- [ ] **Step 2:** Deploy, live checks (UV beat, finale tear → pill, `/visa` prefill), `git push origin master`.
- [ ] **Step 3:** Update `project_migrova.md` memory (shipped state, open items: founder note, Urdu/Swahili native check).
