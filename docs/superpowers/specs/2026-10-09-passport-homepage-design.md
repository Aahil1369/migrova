# Passport Homepage ("Journey Book") — Design

**Date:** 2026-10-09
**Status:** Approved in brainstorming (parts 1–3), pending spec review
**Project:** Migrova — visual redesign, round 1 (homepage + shared pieces)

## Context

Aahil asked to make Migrova look modern, with real graphics. The current site is text-only cream "paper": no images, no motion, an empty right half in the hero, and copy that still says "100 countries" (Official Sources now covers 195).

Brainstorming path (visual companion):
- Direction: a blend of **B "Night journey"** (deep-green night sky, glowing line globe, lime→peach accents) and **C "Bright & friendly"** (warm off-white, rounded cards, From→To search, bold friendly sans).
- Aahil's core idea: **the page background is a big passport that opens as you scroll and closes at the end.** A working prototype was approved (`.superpowers/brainstorm/…/passport-scroll.html`).
- A six-angle creative workflow (18 ideas, judged) produced add-ons; Aahil kept all six: **UV lamp check, boarding pass + route pill, night→dawn sky, "سفر · SAFARI · JOURNEY" cover word, founder route on the Observations page, MRZ that decodes into plain English.** Tools use **visa vignettes**; how-it-works uses **entry stamps**.
- Build approach chosen: **A — content lives on the passport pages** (real HTML on the pages, with accessibility/phone/reduced-motion guardrails).
- Scope: **homepage first**, plus site-wide navbar/footer and shared building blocks; the tool pages are restyled in a later round with their own spec.

## Goals

- A memorable, scroll-driven homepage where the Journey Book opens, its pages carry Migrova's real content, and it closes at the end.
- Fast and usable on mid-range phones; nobody gets trapped by the animation; all content is real, readable, searchable HTML.
- Never looks like a fake government document.
- Site-wide navbar and footer in the new style so every page feels connected.

## Non-goals (this round)

- Restyling Visa, Relocate, Match, Lawyer, Sources, Stories, Profile, Contact, Legal page bodies (next round).
- New animation libraries (motion/lenis) — not added.
- Crest-to-globe morph, family mode, d3 world maps, timezone-based country guessing (judged but not chosen / deferred).

## 1. Visual system

Tokens added to `app/globals.css` (existing paper/term tokens stay for untouched pages):

| Token | Value | Use |
|---|---|---|
| `--night-0` / `--night-1` / `--night-2` | `#0b130f` / `#15231a` / `#2f5139` | night sky gradient stops |
| `--dawn-1` / `--dawn-2` / `--dawn-3` | `#3a2f63` / `#f0a46e` / `#fbe9cf` | pre-dawn → sunrise |
| `--page` | `#fbf8f2` | passport paper (C) |
| `--page-ink` | `#1f2a24` | text on paper |
| `--lime` / `--peach` | `#b8cf5d` / `#f0a46e` | gradient accents, CTA glow |
| `--foil-1` … `--foil-3` | `#b89a4a` / `#f3e3a0` / `#a88a3c` | gold foil |
| `--uv` | `#9b7bff` | UV lamp |

Typography: Inter gains weight **800** (headlines, `letter-spacing: -0.035em`); JetBrains Mono for passport microcopy/MRZ; Instrument Serif kept only for legacy pages. Shapes: rounded cards (16–24px radius), soft shadows; pill buttons with lime glow for primary actions.

Logo: lowercase **"migrova"** wordmark (Inter 800) with a small lime→peach rounded-square mark, used in the new navbar/footer.

## 2. The scroll story (homepage)

Desktop shows the Journey Book as a two-page spread. Pages, in reading/DOM order:

| # | Page | Leaf / face |
|---|---|---|
| p0 | **Cover** (outside) | leaf0 front |
| p1 | **Notice** (inside cover) — what Migrova is | leaf0 back |
| p2 | **Data page** — holder, From→To, MRZ | leaf1 front |
| p3 | **Visas I** — intro + Country Match + Visa Intelligence vignettes | leaf1 back |
| p4 | **Visas II** — Relocation, Lawyer Guide, Official Sources vignettes | leaf2 front |
| p5 | **Entries** — 4 how-it-works entry stamps + dashed route | leaf2 back |
| p6 | **Official Sources under UV** — fold-out flap, UV lamp check, 418 seal | leaf3 front (+ flap) |
| p7 | **Fellow travellers** — stories as exit/entry stamp pairs | leaf3 back |
| p8 | **Observations** — founder note, founder route, endorsement | base (static) |

Spreads: (p1|p2) → (p3|p4) → (p5|p6) → (p7|p8).

Beats, top to bottom (timings live in `timeline.js` as relative weights, not hard-coded percentages):

0. **Arrival** — night sky with sparse twinkling stars and a faint slowly-rotating line globe. Left: server-rendered H1 "Your family's next country, **made simple.**" (lime→peach gradient on the last two words), sub, **JourneySearch** (From / To / "Explore →"), trust line "Free · 195 countries · 418 verified official links · information, not legal advice", "↓ scroll to open". Right: the closed Journey Book at a slight 3D angle. Cover: midnight-green leather texture, gold-foil globe crest with a lime flight arc (foil shimmer follows the pointer; slow automatic sheen on touch), cover word **"سفر · SAFARI · JOURNEY"** (hover/tap reveals: "The word for journey crossed borders too: Arabic safar → Urdu safar → Swahili safari → English."), e-passport chip icon, spine microprint **"JOURNEY BOOK · SPECIMEN · NOT A TRAVEL DOCUMENT"**, issuer code **MGV**. No national emblem, no real-passport colour.
1. **Ajar** — the cover lifts ~35°; a warm lime→peach wedge of light spills from the gap (opacity follows the angle). Hero copy fades/rises away.
2. **Open** — the cover swings to 180° and the book glides to centre and squares up. Spread (p1|p2). **Data page:** "HOLDER: Your family · FROM: <From> · TO: <To or 'Your 5 best matches'> · VALID FOR: 195 countries", a line-art family photo box (two adults and a child, no faces), "Find my countries →" button. Two MRZ lines built from the search (e.g. `P<MGV<<YOUR<FAMILY<<PAK<<<<…`) **scramble-decode** into "PLAIN ENGLISH. OFFICIAL SOURCES. / NO SCAMS. NO GUESSWORK." when the page arrives (once per arrival; tap to replay).
3. **Visa pages** — leaf1 turns; spread (p3|p4). The five tools are **visa vignettes** (rectangular stick-on visas: guilloche rosette, hologram stripe, `VISA TYPE M-MATCH / V-VISA / R-RELOCATE / L-COUNSEL / S-SOURCES`, tool name, one-line description, MRZ-style footer). Each is applied as its page arrives: lifted 4° with a deep shadow → settles flat. The whole vignette is the link (≥48px tap target); hologram stripe shimmers on hover/focus.
4. **Entries** — leaf2 turns; spread (p5|p6 begins). p5: four **entry stamps** (circle, rectangle, triangle, hexagon), each "ENTRY 0n · <STEP> · <today's date>": Tell us about you · See your options · Understand the path · Get real help; a dashed route draws between them; each stamp thunks in with a short ink-bleed.
5. **Peak — UV lamp** (p6) — a fold-out flap swings out from p6's outer edge (spread at its widest). The sky dims (a fixed night layer crossfades in by opacity). Desktop: the cursor becomes a soft violet UV lamp over the flap; phones: a horizontal scanner band sweeps automatically. Content: count-up "418 verified government links · 195 countries · 0 look-alikes"; two identical-looking site cards: the **real** official authority link for the visitor's To country from `OFFICIAL_SOURCES` (fallback Canada) and an invented look-alike `<country>-visa-fastpass.example` labelled **FAKE EXAMPLE**, never linked. Under the lamp the real card fluoresces "✓ VERIFIED"; the fake shows "✗ NOT OFFICIAL — charges extra fees". Each card also auto-reveals when centred, and a "Show everything" toggle reveals both. Line: "Border officers check documents under UV. Migrova checks visa websites." Rainbow hologram **418 VERIFIED** seal.
6. **Fellow travellers** — the lamp clicks off with a warm flicker; the flap folds back; leaf3 turns; spread (p7|p8). p7: up to two approved stories from `/api/stories` as paired stamps "EXIT · <from_country>" over "ENTRY · <current_country>" with the quote set like a margin note. If there are no approved stories: an invite page "Your story could be the next stamp" → `/stories`.
7. **Observations** (p8) — founder note (Aahil's words, ≤ 2 sentences), his route drawing leg by leg in foil: **Gilgit-Baltistan → Kampala → USA → dot "here, building this"**, and an official-looking endorsement box: "INFORMATION, NOT LEGAL ADVICE. ALWAYS CONFIRM ON THE OFFICIAL SITE."
8. **Closing** — leaves flip back in a fast staggered fan (~40ms stagger), the cover swings shut with a small overshoot, **BON VOYAGE** stamp lands on the cover, and the cover word cross-fades to **"سفر بخیر · SAFARI NJEMA · SAFE TRAVELS"**. The book returns to the right.
9. **Dawn finale** — the sky has reached sunrise → warm daylight `--page`. Left: "60 seconds from here to **somewhere new.**" A **boarding pass** slides out from the book: big 3-letter codes `<FROM> ✈ <TO>` (or `ANY`), "GATE /match · SEAT 1A · BOARDING: when you're ready", primary button "Find my countries →" (`/match`), secondary "Check a visa" (`/visa?from&to`). The perforated **stub** reads "Tear to remember this route on this device ✂"; tearing it is the explicit opt-in: the stub flies up into the navbar as a **route pill**. Then the site footer.

**Sky** — one fixed gradient stack under everything: night → pre-dawn (indigo) → sunrise (peach) → daylight, crossfading by opacity from overall page progress.

## 3. Architecture

### Files

```
app/page.js                          server component: metadata, SSR hero copy + JourneySearch, <PassportStage/>
app/components/passport/
  PassportStage.js                   client: sticky stage, scroll→progress engine, layout modes, focus/anchor handling
  timeline.js                        pure: beat list (name, weight, page refs) → ranges; progressAt(); beatAt()
  useScrollProgress.js               client hook: section progress 0..1, eased smoothing, hidden-tab render
  useMotionMode.js                   client hook: 'full' | 'lite' | 'reduced' (+ ?motion= override for QA)
  Leaf.js                            hinged leaf with front/back faces (desktop) / single page (notepad mode)
  NightSky.js                        stars, faint globe, night→dawn layers
  JourneySearch.js                   From/To selects + Explore (hero + finale)
  pages/Cover.js  Notice.js  DataPage.js  VisasOne.js  VisasTwo.js  Entries.js  UvSources.js  Travellers.js  Observations.js
  BoardingPass.js                    pass, tear interaction, opt-in save
  Vignette.js  Stamp.js  HologramSeal.js  Guilloche.js  FounderRoute.js
  mrz.js                             pure: build MRZ lines from route; decode-frame generator
  route.js                           pure: read/save/forget route via an injected storage (localStorage in app)
app/components/Navbar.js             restyled; `tone` prop ('night' | 'paper'); shows RoutePill when a route is saved
app/components/RoutePill.js          "PAK ✈ CAN" pill → /visa?from&to, ✕ forget
app/components/SiteFooter.js         replaces homepage footer + LegalFooter (site-wide)
app/data/countries195.js             gains iso3 codes (for MRZ / boarding pass)
app/visa/page.js, app/relocate/page.js  read ?from= (visa) and the saved route as a prefill fallback
```

### Scroll engine

- `PassportStage` renders a tall section (total height = sum of beat weights × viewport height, ≈ 7–8 viewports desktop) containing a `position: sticky; top: 0; height: 100svh` stage. `useScrollProgress` maps the section's scroll to 0..1 and eases it (`cur += (target − cur) × 0.09` per rAF), and renders immediately on scroll when the tab is hidden.
- `timeline.js` converts weights to ranges. Each leaf's angle, the book's x/scale/tilt, the flap, the UV dim, sky layers, copy opacity and stamp/vignette "applied" states are pure functions of progress — the same approach as the approved prototype.
- Only `transform` and `opacity` animate. Leaves use `transform-style: preserve-3d`, `backface-visibility: hidden`, `transform-origin: left center`; stacking via small `translateZ` offsets (not z-index). Faces get a gradient "dim" whose opacity is `|sin(angle)| × 0.35`.
- Guilloche backgrounds and rosettes are generated once on mount into SVG data URIs. No images, no canvas, no SVG filters on phones.

### Layout modes (`useMotionMode` + width)

- **Desktop full (≥ 768px):** two-page spread, 3D flips, pointer foil/UV lamp.
- **Phone notepad (< 768px):** one page at a time, centred, 16px gutters; pages flip upward (rotateX, top hinge) in p0→p8 order; UV uses the auto scanner band.
- **Lite** (Save-Data on, or `navigator.deviceMemory ≤ 2`, or touch device with `hardwareConcurrency ≤ 4`): no 3D — pages crossfade/slide; stamps/vignettes appear without the lift animation; sky ramp kept.
- **Reduced motion** (`prefers-reduced-motion: reduce`): no sticky stage; pages render as a vertical stack of paper cards (spreads side-by-side on desktop) on a static night→dawn gradient; UV cards shown already revealed; MRZ shows raw and decoded text; boarding pass static (stub becomes a "Remember this route" button).
- `?motion=full|lite|reduced` overrides detection (QA only).

### Accessibility & SEO

- All page content is real HTML in the DOM, in page order p0→p8; each page has an `h2`; decorative SVGs are `aria-hidden`.
- "Skip to tools" link at the top of the page → `#tools` (Visas I).
- Anchors `#tools`, `#how-it-works`, `#sources`, `#stories` scroll to that page's beat on load and on hash change.
- `focusin` inside a page that isn't currently visible scrolls to that page's beat, so keyboard users always see what they're on.
- Text on paper ≥ 4.5:1 contrast; body text ≥ 16px on phones; status never by colour alone.
- `app/page.js` is a server component; hero H1 is the LCP element; the passport's content SSR-renders inside the client island, so crawlers see all text.

### Search & route

- `JourneySearch`: From = 195 countries (flags), To = "Anywhere" + 195 countries; initial From/To from the saved route, else the saved profile nationality, else empty. "Explore →": To = Anywhere → `/match`; otherwise `/visa?from=<code>&to=<code>` (if From is empty, `/visa?to=<code>` and the Visa page asks for nationality as it does today).
- The data page, MRZ, UV real-site card and boarding pass all read the current search state (shared via a small context inside `PassportStage`).
- `route.js`: `migrova_route = {from, to, savedAt}` in localStorage, all access wrapped in try/catch; saved **only** by tearing the stub (or the reduced-motion "Remember this route" button); `RoutePill` ✕ forgets it.
- Visa page reads `?from=` (valid code → nationality) and falls back to the saved route for both fields; Relocate falls back to the saved route's destination name.

### Data

- Stories: fetched server-side in `app/page.js` (anon client, approved only, limit 2) and passed to the stage; none → invite page.
- Official link for the UV card: `OFFICIAL_SOURCES[to].links.authority` if verified, else Canada's.
- `countries195.js`: add `iso3` for all 195 entries (unit-tested: 195 unique 3-letter codes).

### Navbar & footer (site-wide)

- Navbar: new wordmark + mark, links (Tools menu, Sources, Stories), Sign in / avatar, RoutePill. `tone="night"` (homepage: transparent over the sky, light text) or `"paper"` (default elsewhere: current cream background, dark text).
- `SiteFooter`: night-green band with wordmark, links (Tools, Sources, Stories, Contact, Legal), "A sibling of OpportuMap", and the legal one-liner (replaces `LegalFooter` + the homepage-only footer).

### Copy

- "100 countries" → **195** everywhere (pageCopy, meta).
- Founder note on p8: Aahil supplies (draft offered: "My family carried our whole life in one folder of papers, across three countries. Migrova is the guide I wish we'd had.").
- Urdu "سفر / سفر بخیر" and Swahili "Safari njema" to be checked by native speakers before launch; Urdu rendered with Noto Naskh Arabic (loaded only on the homepage, subset to the needed glyphs via `text=`).

## 4. Performance budget

- No new npm dependencies.
- Homepage First Load JS: **≤ +30KB gzipped** vs. current (from `next build` output).
- LCP (hero H1) **≤ 2.5s** on a throttled phone profile (headless Chrome via DevTools protocol: 4× CPU slowdown, ~1.6Mbps / 150ms network, 375×812).
- No horizontal scroll at 375px; smooth flips verified on desktop and in notepad/lite modes.

## 5. Testing

- **Unit (`node:test`):** `timeline.js` (ranges sum to 1, beatAt/progressAt boundaries, page→beat map), `mrz.js` (line format/length 44, deterministic decode frames ending at the plain-English text), `route.js` (save/read/forget, storage throwing → no crash), `countries195` iso3 (195 unique).
- **Build:** `next build` passes; homepage size recorded before/after.
- **Browser (built-in pane):** every beat at 1440×900 via a dev-only `window.__passportRender(p)` hook (hidden-tab rAF/transition caveat); notepad at 375×812; `?motion=reduced` and `?motion=lite`; skip link, anchors, Tab focus jump; search → `/visa?from&to` prefilled; stub tear → pill → ✕ forget.
- **Perf:** headless-Chrome throttled LCP script; JS size from build.
- **Live:** after deploy, spot-check homepage beats, a tool page's new navbar/footer, and the visa prefill.

## 6. Delivery

- **Step 1 (deploy and let Aahil try):** tokens/fonts, Navbar + SiteFooter, server `page.js`, PassportStage engine + timeline, NightSky (night→dawn), Cover (incl. cover word + hover etymology), Notice, DataPage (static MRZ), Visas I/II (vignettes), Entries (stamps), p6 Official Sources page **without** the UV effect (seal + count-up + real-site card), Travellers, Observations (static note), closing (no blessing swap), finale with JourneySearch (no boarding pass yet), notepad/lite/reduced modes, accessibility, search wiring, iso3, "195" copy.
- **Step 2:** UV lamp fold-out + scanner band, MRZ scramble-decode, BON VOYAGE + blessing cover-word swap, boarding pass + stub tear + RoutePill + route prefill on Visa/Relocate, founder route animation.
- Each step: tests + build + browser checks + throttled perf check → deploy (Netlify CLI) → commit/push.

## 7. Risks & mitigations

- **Looks like a real/fake government document** → "Journey Book", issuer MGV, SPECIMEN microprint, no national emblem or real passport colours, the fake site is an invented `.example` pattern, never linked.
- **Overlap with OpportuMap's passport hero** → different vocabulary: coded vector (no photo), midnight-green leather + lime→peach foil, vignettes + UV + MRZ (OpportuMap keeps its photo passport and rubber-stamp thunk).
- **Scroll trap / disorientation** → real content, skip link, anchors, focus jump, no dead scroll beyond the book's beats, reduced-motion stack.
- **Phone jank** → notepad mode, lite mode, transform/opacity only, no backdrop-filter/SVG filters on phones.
- **Hidden-tab verification limits** (rAF/transitions pause in the automated pane) → dev-only render hook + final check on the live site.
- **Wrong wording in a family's language** → native-speaker check before launch.
