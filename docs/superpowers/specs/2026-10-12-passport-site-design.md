# Passport site — design spec

**Date:** 2026-10-12 · **Owner:** Aahil · **Status:** approved in conversation, awaiting written review
**Builds on:** `docs/superpowers/specs/2026-10-09-passport-homepage-design.md` (the Journey Book homepage, live at master `ce38f99`).

## 1. Goal

Make the whole Migrova site feel like one passport journey — the homepage's night-sky + warm-paper "Journey Book" vibe on every page — while every tool stays fast, readable and smooth on the owner's iPhone 13 (Safari).

**Owner decisions (binding):**
1. **Approach C — hybrid.** A shared passport look on every page, plus **one signature moment per tool**. The 3D scroll book stays on the homepage only.
2. **Ground:** a night-sky header band that fades to dawn, then **warm passport paper** below (option A).
3. **Headline voice:** the homepage's **Inter 800 with one lime→peach gradient word** (option A). Instrument Serif italic is retired from tool pages.
4. **Signature moments (all four approved):** Visa = issued visa with MRZ decode + stamp; Relocate = boarding pass with a tear-off first-week stub; Match = score stamps along a dashed route; Sources = UV-lamp real-vs-fake check.
5. **Order:** step 1 = foundation (every page) + Visa + Official Sources; step 2 = Relocate + Country Match; a later round (own spec) for Lawyer, Stories, Profile, Contact, Legal and the pop-ups.
6. **Ship via a test link first:** each step deploys to a private Netlify draft the owner checks on his iPhone, and goes live only after his OK.

## 2. Scope

**In scope (this spec):**
- Shared foundation applied site-wide (shell, header, kit, form controls, navbar tone).
- Full redesign of `/visa`, `/sources`, `/sources/[code]`, `/relocate`, `/match`, plus a passport-style `app/not-found.js`.
- The bug fixes in §7.

**Out of scope (later spec):** deep redesigns of `/lawyer`, `/stories`, `/profile` + ProfileModal, `/contact` (needs a real send channel), `/legal`, AuthModal, LegalAckModal. They inherit the shared shell/header/controls in step 1 wherever they already use the shared components, and are otherwise left working as today. No change to the homepage book.

## 3. Global constraints

- Next.js 16 App Router, React 19, plain JS (no TypeScript), Tailwind 4 tokens in `app/globals.css`. **No new runtime dependencies, no animation libraries.**
- Animate **only `transform` and `opacity`** (plus `stroke-dashoffset` for route lines). No animating width/height/top/left/background-size/filter.
- **No CSS trig** (`tan()`, `atan2()` …) anywhere — WebKit resolves it wrongly (it flipped the homepage book). The existing guard test (`scripts/passport/__tests__/layoutMode.test.mjs`) extends to every new CSS file.
- **No motion gating on `navigator.hardwareConcurrency`** (Safari reports 4 on every iPhone). Motion is on for everyone; `prefers-reduced-motion: reduce` shows the **final state** instantly (opacity fades allowed).
- Signature moments play **once**, when the result arrives (or when scrolled into view for static pages) — never on a loop, except subtle ambient effects (foil shimmer, star twinkle) that pause when off screen.
- **Text:** body ≥ 16px on phones; form inputs 16px (prevents iOS zoom); every text/background pair ≥ 4.5:1 (stamp inks from `STAMP_INKS` on `--page` #fbf8f2; any new pair gets a contrast test).
- **Accessibility:** stamps, MRZ lines, seals and decorative SVG are `aria-hidden`, with the real information in plain text next to them; AI text is never placed inside a rotated stamp; results are announced (`aria-live`) and focus moves to the result heading; labels are bound (`htmlFor`); every form is a real `<form>` (Enter submits); chips are buttons with `aria-pressed`.
- **Trust rules:** never stamp DENIED / REFUSED / REJECTED — use LIKELY, CHECK, CAUTION, PENDING, NOTICE. Fake-site examples use `fakeDomain()` (reserved `.example` TLD) and are **never links**. Keep the "general information, not legal advice" disclaimer on every AI result.
- **Budgets:** no tool page ships more JS than the homepage (≤ 281 KB gzip via `scripts/perf/js-size.mjs`); the shared kit adds ≤ 5 KB JS + ≤ 6 KB CSS gzip; LCP (`scripts/perf/lcp.mjs`) on `/visa` and `/sources/ca` not worse than today's by more than 150 ms (paired median).
- Never send the owner's email anywhere. Git via PowerShell in the worktree; commits end with the `Co-Authored-By` line.

## 4. Foundation (step 1, site-wide)

### 4.1 Tokens and type
- Surfaces: `--page` #fbf8f2 (cards), a warm ground `--ground` #efe7d6 (page background below the header band), night/dawn tokens already in `globals.css` (`--night-0..2`, `--dawn-1..3`).
- `--paper-bg` #e6dfc9 stops being used as a surface on redesigned pages (stamp inks fail contrast on it).
- Hard-coded tool-page colours (#b5912f, #5a7d3f, #c75d2c …) are replaced by `STAMP_INKS` / named tokens.
- Headings: Inter 800, tight tracking; the one-word accent uses the lime→peach gradient (`--lime` → `--peach`) like the homepage "made simple.". Labels / kickers / MRZ: JetBrains Mono, uppercase, tracked.
- `app/layout.js` gains `export const viewport` (`width=device-width, initial-scale=1`), fixing the iOS zoom-on-tap together with 16px inputs.

### 4.2 Page shell — `ToolShell`
- A night-sky header band (static star field + soft glow; no scroll engine) that blends into dawn, then the warm `--ground` paper area holding the page content.
- Navbar uses the existing `tone="night"` on every page (the RoutePill keeps working).
- Content width ~720px for forms/reports, wider grids where a page needs them; 16px side gutters on phones.

### 4.3 Tool header — `ToolHeader` (replaces `app/components/ui/EditorialHero.js`)
- Kicker in mono with a visa-type code: `V-VISA · VISA INTELLIGENCE`, `R-RELOCATE · RELOCATION GUIDE`, `M-MATCH · COUNTRY MATCH`, `S-SOURCES · OFFICIAL SOURCES`, `L-COUNSEL · LAWYER GUIDE`, `T-STORIES · TRAVELLERS`.
- Headline (Inter 800 + one gradient word), one-line sub, an MRZ-style line built from the saved route when present (`V<MGV<<PAK<<CAN<<…`, `aria-hidden`), and the route pill.
- EditorialHero's current users (`/visa`, `/relocate`, `/match`, `/lawyer`, `/stories`, `/sources`) switch to it in step 1, so all six get the new header at once.

### 4.4 Passport kit — `app/components/kit/`
Extracted from `app/components/passport/` so tool pages never import the homepage scroll engine (`PassportStage`, `pose`, `timeline`, `useScrollProgress`, `quality`):
- **Reused as-is (moved or re-exported):** `Stamp`, `stampInks`, `Guilloche` + `guillochePattern`, `HologramSeal`, `mrz` (`buildMrz`, `decodeFrame`), `fakeDomain`, glyph icons.
- **Small API changes:** `Vignette` gets an `as` prop (a card that is not a link); the MRZ decode becomes a standalone `MrzDecode` (`lines`, `plain`, `active`); `BoardingPass` gets a `route` / content prop; the star field helper moves out of `stageStyle.js`.
- **New:**
  - `PassportCard` — the paper card surface.
  - `VerifiedLinkCard` — an official link with a verified seal and an optional verified date.
  - `ChecklistPage` — a tickable checklist saved on the device per key (e.g. per route), showing "n / m packed" and stamping **PACKED** when complete.
  - `ResultArrival` — wraps an AI result: aria-live announcement, focus move to the result heading, then plays the moment (decode + stamp) once.
  - `useInView` — starts a moment when scrolled into view and pauses ambient loops off screen.
  - `Chip` (button with `aria-pressed`), restyled `Btn`, inputs and selects (16px, paper styling).
- `kit.css` holds the shared styles (sky band, paper, stamp/vignette/seal visuals, motion + reduced-motion rules). The homepage keeps importing what it needs; nothing in the kit depends on the homepage stage.
- Homepage behaviour must not change (its tests keep passing; a quick homepage smoke check is part of every step).

### 4.5 Global motion clean-up
Replace utilities that animate layout properties: `.tool-card-underline` (width), `.italic-draw` (background-size), the navbar progress bar (use `scaleX`), `Btn`'s `transition-all`, `.reveal`'s permanent `will-change`. Remove `useScrollReveal()` calls that do nothing.

## 5. Step 1 pages

### 5.1 Visa Intelligence — `/visa`
- **Form = the visa application:** nationality, destination, purpose chips (Work, Study, Tourist, Permanent Residency, Digital Nomad). Prefill order stays: `?from=&to=` → saved route → profile. Button: **"Issue my visa report"**. The LegalAck gate stays as today.
- **Loading:** a blank visa card appears with its MRZ line scrambling (`aria-hidden`; a visually hidden "Preparing your report…" status for screen readers).
- **Arrival (`ResultArrival`):** the visa card fills in:
  - Header: `VISA · <DESTINATION>`, the likely visa type name (first `visaTypes` entry), processing time and fee when present, and the chance from `/api/visa-probability` (Low / Medium / High / Very High) as plain text.
  - MRZ decodes into a plain-English line, e.g. `✓ VISA REQUIRED · APPLY BEFORE YOU GO · CHANCE MEDIUM`.
  - One entry stamp lands, chosen from `currentStatus`:

    | `currentStatus` | Stamp | Ink |
    |---|---|---|
    | `visa-free` | VISA FREE | green |
    | `e-visa` | E-VISA · APPLY ONLINE | blue |
    | `visa-on-arrival` | ON ARRIVAL | blue |
    | `visa-required` | APPLY FIRST | gold |
    | `citizen` | HOME | green |
    | anything else | CHECK | gold |

    A Low chance never changes the stamp to a negative word; it shows as text plus a terracotta **CAUTION** note in the chance line.
- **Below the visa, on paper (same data as today, regrouped):**
  - Official links (OfficialSourcesBlock restyled with `VerifiedLinkCard`s) near the top.
  - Visa types as tinted vignette cards that expand for details.
  - Steps as a numbered itinerary.
  - **Documents as a `ChecklistPage`** keyed by `from-to-purpose`, saved on the device.
  - Timeline + financial requirements in a fare-style box.
  - "How to strengthen your application" (renamed from "How to Guarantee Approval") and common rejection reasons; language tests; interview tips; success factors; policy changes; important notes — as paper cards with SVG glyphs instead of emoji.
  - The disclaimer.
- **Errors:** friendly messages ("We couldn't build your report right now — try again in a minute.") instead of raw `err.message`; a failed probability call shows "Chance estimate unavailable" instead of silently disappearing.
- **Speed:** `/api/visa-intel` and `/api/visa-probability` start together (today they run one after the other).

### 5.2 Official Sources — `/sources` and `/sources/[code]`
- Both stay server-rendered/static (SEO); only small interactive parts are client components.
- **Index:** a hologram seal counts up to the verified-link total (from data, not hard-coded) when in view; search box; the 7 region pills become passport tab dividers; country rows become compact paper rows with an `n / 6 VERIFIED` seal; `content-visibility: auto` on the list.
- **Country page:**
  - Header: flag + country name, verified count.
  - **UV check (signature moment):** two cards — the country's real government domain (a real link, `✓ REAL · OFFICIAL GOVERNMENT SITE`) and a fake example from `fakeDomain()` (plain text, never a link, `FAKE EXAMPLE` badge, `✗ NOT OFFICIAL · CHARGES EXTRA FEES`). The UV light sweeps across once when in view; reduced motion shows both verdicts immediately. The verdicts are always readable by screen readers.
  - The 6 links as `VerifiedLinkCard`s (unverified ones stay dashed and not clickable, as today).
  - CTAs to `/visa?to=<code>` and `/relocate?dest=<name>`.
- **`app/not-found.js`:** a passport-style 404 ("This page isn't in your passport") with links home and to `/sources`.

## 6. Step 2 pages

### 6.1 Relocation Guide — `/relocate`
- **Form:** destination, origin (prefilled from the saved route's From as well as the profile), field; the 12 popular-city chips stay (disabled while a search runs).
- **Arrival — boarding pass:** origin → destination (country ISO3 codes where known, otherwise the first three letters, uppercased), city name, and the **monthly budget tiers** from `monthlyBudget` (Budget / Comfortable / Luxury, USD per month) on the fare box; an `ADMITTED · <CITY>` stamp. The **tear-off stub** holds the first-week plan (`firstMonthTips`); tearing saves it on the device (like the homepage route stub; explicit action only) and a reduced-motion button does the same.
- **Below:** the ~16 result sections grouped into **6 chapter tabs** — Money (costs, budget, banking, tax), Living (neighbourhoods, climate + packing, healthcare), Work (job market, work culture), Safety (safety, emergency numbers), Settling in (before-you-move checklist as a `ChecklistPage` keyed by destination, first-month tips, SIM, visa path → `/visa`), Culture (do's and don'ts, expat communities). Tabs on desktop; a horizontally scrollable tab strip on phones; proper `tablist` semantics.
- **Emergency numbers** become a wallet card of `tel:` links.
- **Fixes:** a newer search always wins (ignore stale responses); the API cache key includes `field`; show `languageBarrier.detail`, `bankingSetup.notes`, `expatCommunities.url` (already returned, never shown); drop the unused community-posts query.

### 6.2 Country Match — `/match`
- **No dead end:** without a profile, show a short form styled as a passport data page — nationality (prefilled from the saved route's From), current country, experience, skills, preferred regions — that runs the match without signing in. Signed-in users with a profile run as today.
- **Arrival — route of stamps:** five match-score stamps land one by one along a dashed route line (each stamp: country name + score, `STAMP_INKS` colours), then five detail cards (vignette-styled) with the VISA / JOBS / COST / LANG strip and the visa-path sentence.
- **Tap a stamp** (or its "Set as destination" button) to save that country as the route's To via `saveRoute` (explicit action only); the navbar RoutePill updates.
- **Links carry the route:** `/visa?from=<nat>&to=<code>`, `/relocate?dest=<name>`.
- **Quota-friendly:** the last result is cached on the device for 24 hours; the AI runs on submit / Refresh, not on every visit. The prompt sends country **names**, not ambiguous ISO2 codes.

## 7. Bug fixes bundled into step 1

1. iOS zoom-on-tap: `viewport` export + 16px inputs.
2. `/visa` and `/relocate` stop shipping the whole official-sources table (~21 KB gzip): look up the per-country rows on the server or load one small per-country file.
3. Visa's two AI calls run in parallel.
4. Profile save: Navbar sends `{ profile_data }` but `/api/user-profile` reads `{ profile }` — align them (the server profile is currently saved empty).
5. The layout-property animations in §4.5.

## 8. Testing and verification (every step)

- **Unit (node:test):** stamp choice from `currentStatus`; MRZ plain line for visa results; `ChecklistPage` store (save/load/progress, blocked storage); relocate stale-response guard and ISO3/fallback codes; match → route save; `fakeDomain` usage; contrast for every new ink/surface pair; no CSS trig in any kit/page CSS.
- **Build + budgets:** `npm test`, `npm run build`, `js-size.mjs` per page, paired LCP A/B vs master on `/visa` and `/sources/ca`.
- **Browser:** layout at 375×548, 390×664, 390×844, 768×1024, 1440×900; reduced motion; no console errors; Visa and Relocate submitted with real AI responses; frame-time check of each signature moment on emulated iPhone 13 (real-GPU Chromium, CPU ×4: p95 < 20 ms).
- **Homepage regression smoke:** passport opens/closes, route tear → pill → `/visa` prefill.
- **Review:** per-task review, a final whole-branch review, then a test link the owner opens on his iPhone 13; live only after his OK.

## 9. Open items for the later round
- Contact: choose a real channel (Netlify Forms, a Supabase table, or mailto) and Migrova's own email/handles.
- Profile setup: drop the resume step and OpportuMap job questions in favour of purpose, family and destinations.
- Lawyer, Stories, Legal, AuthModal, LegalAckModal deep designs (ideas already noted: customs tariff sheet, EXIT/ENTRY story stamps, "Conditions of issue" page, check-in boarding pass, customs declaration).
