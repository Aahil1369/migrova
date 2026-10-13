// Country Match (/match) as pure logic: the last result kept on this device for 24 hours (per
// profile), the profile's cache key, the country names the prompt uses (never bare ISO2 codes),
// the links that carry the route, the dashed route and where its five stamps sit, what a stamp
// may say, the AI's answer cleaned into known countries, the form's prefill, the stale-response
// guard, and the one place a tap saves the destination. Framework-free; storage is injected, so
// a blocked localStorage (Safari private mode) never throws (scripts/site/__tests__/match.test.mjs).
import { saveRoute } from '../components/passport/routeStore.js';
import { countryByCode, findCountryInText } from '../data/countries195.js';
import { friendlyError } from './friendlyError.js';

export const MATCH_CACHE_KEY = 'migrova_match';
const CACHE_MS = 24 * 60 * 60 * 1000;

/** The experience choices (the profile pop-up's values), for the form and its prefill. */
export const EXPERIENCE_LEVELS = Object.freeze([
  { value: 'student', label: 'Student / no experience' },
  { value: '0-2', label: '0–2 years' },
  { value: '3-5', label: '3–5 years' },
  { value: '5-10', label: '5–10 years' },
  { value: '10+', label: '10+ years' },
]);

const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');
const list = (value) => (Array.isArray(value) ? value : []);
const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const strings = (value) => list(value).map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);

// One profile field for the key: a sorted list of its strings, else its trimmed text; '' for
// missing, blank or empty (all "not given").
function keyPart(value) {
  if (Array.isArray(value)) {
    const items = strings(value).sort();
    return items.length ? items : '';
  }
  return text(value);
}

/**
 * The cache key of a profile: stable JSON of { nationality, currentCountry, experience, skills,
 * preferredCountries }, lists sorted (other fields, such as the name or job types, are not part).
 */
export function profileKey(profile) {
  const p = isObject(profile) ? profile : {};
  return JSON.stringify({
    nationality: keyPart(p.nationality),
    currentCountry: keyPart(p.currentCountry),
    experience: keyPart(p.experience),
    skills: keyPart(p.skills),
    preferredCountries: keyPart(p.preferredCountries),
  });
}

// The saved entry { key, savedAt, matches, profile? } while it is fresh (saved at most 24h before
// `now`, never "in the future"), else null. Its matches go through pickMatches again, so junk or
// an older format never reaches the page (none usable -> null). Never throws.
function freshEntry(storage, now) {
  try {
    const entry = JSON.parse(storage.getItem(MATCH_CACHE_KEY));
    if (!isObject(entry) || typeof entry.key !== 'string' || typeof entry.savedAt !== 'number') return null;
    const age = now - entry.savedAt;
    if (!(age >= 0 && age <= CACHE_MS)) return null;
    const matches = pickMatches({ matches: entry.matches });
    return matches.length ? { ...entry, matches } : null;
  } catch {
    return null;
  }
}

/** The matches saved for `key` (profileKey) within the last 24 hours, else null (also for junk or blocked storage). */
export function readMatchCache(storage, key, now) {
  const entry = freshEntry(storage, now);
  return entry && entry.key === key ? entry.matches : null;
}

/**
 * Keep `matches` for `key` on this device (the last result only). `profile`, when given, is kept
 * with them so a reload can restore the form (readLastMatch). False when there is nothing to keep
 * or storage is blocked.
 */
export function writeMatchCache(storage, key, matches, now, profile) {
  if (!Array.isArray(matches) || matches.length === 0) return false;
  try {
    const entry = { key, savedAt: now, matches };
    if (isObject(profile)) entry.profile = profile;
    storage.setItem(MATCH_CACHE_KEY, JSON.stringify(entry));
    return true;
  } catch {
    return false;
  }
}

/** The last fresh result and the profile it ran for, { profile, matches }, else null. */
export function readLastMatch(storage, now) {
  const entry = freshEntry(storage, now);
  if (!entry || !isObject(entry.profile) || profileKey(entry.profile) !== entry.key) return null;
  return { profile: entry.profile, matches: entry.matches };
}

const nameOf = (value) => {
  const raw = text(value);
  return countryByCode(raw)?.name ?? raw;
};

/**
 * What the prompt says about the person: ISO2 codes as country names ('ge' is Georgia, not the US
 * state), anything else as written: { nationality, currentCountry, preferredRegions: [names] }.
 */
export function describeProfile(profile) {
  const p = isObject(profile) ? profile : {};
  return {
    nationality: nameOf(p.nationality),
    currentCountry: nameOf(p.currentCountry),
    preferredRegions: strings(p.preferredCountries).map(nameOf),
  };
}

/** A match's links: { visa: '/visa?from=<from>&to=<to>' (unknown parts left out), relocate: '/relocate?dest=<name>' }. */
export function matchLinks({ from, to, name } = {}) {
  const fromCode = countryByCode(text(from))?.code;
  const toCountry = countryByCode(text(to));
  const params = [fromCode && `from=${fromCode}`, toCountry && `to=${toCountry.code}`].filter(Boolean);
  const dest = text(name) || toCountry?.name || '';
  return {
    visa: params.length ? `/visa?${params.join('&')}` : '/visa',
    relocate: dest ? `/relocate?dest=${encodeURIComponent(dest)}` : '/relocate',
  };
}

// ── The route of stamps ───────────────────────────────────────────────────────

/** The route's drawing box (SVG user units); MatchRoute keeps this aspect ratio. */
export const ROUTE_BOX = Object.freeze({ w: 320, h: 250 });

/** A stamp's diameter as a share of the route box's width (match.css: 30cqi). */
export const STAMP_SIZE = 0.3;

/**
 * The five stops, best match first: a winding route from the bottom left, low and high in turn,
 * so the stamps (STAMP_SIZE: 96 units) stay in the box and never overlap (each pair is at least
 * 96 units apart across or down).
 */
export const ROUTE_STOPS = Object.freeze([
  { x: 48, y: 188 },
  { x: 106, y: 62 },
  { x: 164, y: 178 },
  { x: 222, y: 58 },
  { x: 272, y: 170 },
].map(Object.freeze));

const ROUTE_START = { x: 12, y: 240 };
const ROUTE_END = { x: 314, y: 104 };

const round1 = (n) => Math.round(n * 10) / 10;

// The route as cubic curves through every point (Catmull-Rom), as [p0, c1, c2, p1] segments.
function routeSegments() {
  const pts = [ROUTE_START, ...ROUTE_STOPS, ROUTE_END];
  const at = (i) => pts[Math.max(0, Math.min(pts.length - 1, i))];
  const segments = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    segments.push([
      p1,
      { x: round1(p1.x + (p2.x - p0.x) / 6), y: round1(p1.y + (p2.y - p0.y) / 6) },
      { x: round1(p2.x - (p3.x - p1.x) / 6), y: round1(p2.y - (p3.y - p1.y) / 6) },
      p2,
    ]);
  }
  return segments;
}

const SEGMENTS = routeSegments();

/** The dashed route's SVG path, in ROUTE_BOX units; it passes through every stop. */
export const ROUTE_PATH = `M${ROUTE_START.x} ${ROUTE_START.y}${SEGMENTS.map(([, c1, c2, p]) => ` C${c1.x} ${c1.y} ${c2.x} ${c2.y} ${p.x} ${p.y}`).join('')}`;

/** The route's length (units, rounded up): the dash that hides it while it draws. */
export const ROUTE_LENGTH = Math.ceil(
  SEGMENTS.reduce((sum, [a, b, c, d]) => {
    let len = 0;
    let prev = a;
    for (let s = 1; s <= 64; s++) {
      const t = s / 64;
      const u = 1 - t;
      const point = {
        x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
        y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
      };
      len += Math.hypot(point.x - prev.x, point.y - prev.y);
      prev = point;
    }
    return sum + len;
  }, 0),
);

// Which stops n stamps use: fewer matches spread along the whole route.
const SPREAD = [[], [0], [0, 4], [0, 2, 4], [0, 1, 3, 4], [0, 1, 2, 3, 4]];

/**
 * Where n (at most 5) stamps sit: [{ x, y, rotate }], x / y in percent of the route box (the
 * stamp's centre, on the route), rotations alternating -10 and 9 degrees. Deterministic.
 */
export function stampSlots(n) {
  const count = Number.isInteger(n) ? Math.max(0, Math.min(5, n)) : 0;
  return SPREAD[count].map((stop, i) => ({
    x: (ROUTE_STOPS[stop].x / ROUTE_BOX.w) * 100,
    y: (ROUTE_STOPS[stop].y / ROUTE_BOX.h) * 100,
    rotate: i % 2 === 0 ? -10 : 9,
  }));
}

const STAMP_LINE = 11; // characters that fit across the stamp's ring on the smallest phone

/**
 * A match stamp's lines (Stamp `lines`): our own name for the country (never the AI's words) and
 * the score. A name too long for one line is split around the score (UNITED / 84 / KINGDOM); one
 * that fits neither way is its ISO3 code. Every line is at most 11 characters.
 */
export function stampFace({ country_code: code, match_score: score } = {}) {
  const country = countryByCode(text(code));
  const name = (country?.name ?? '').toUpperCase();
  const big = typeof score === 'number' ? String(score) : '–';
  if (name.length <= STAMP_LINE) return [name, big];
  const words = name.split(/\s+/);
  let best = null;
  for (let k = 1; k < words.length; k++) {
    const top = words.slice(0, k).join(' ');
    const bottom = words.slice(k).join(' ');
    const longest = Math.max(top.length, bottom.length);
    if (longest <= STAMP_LINE && (!best || longest < best.longest)) best = { top, bottom, longest };
  }
  return best ? [best.top, big, best.bottom] : [country?.iso3 ?? '', big];
}

// A score as a whole number 0-100 ('87/100' -> 87, 140 -> 100), or null when there is none.
function scoreOf(value) {
  const n = typeof value === 'number' ? value : Number.parseFloat(text(value));
  return Number.isFinite(n) ? Math.round(Math.min(100, Math.max(0, n))) : null;
}

/**
 * The AI's answer ({ matches: [...] }) as at most five matches, best score first (no score last):
 * each a known country (its code, else its name, must be one of the 195; repeats dropped) with our
 * own name for it, the score as 0-100 or null, and every text field a trimmed string ('' if missing).
 */
export function pickMatches(data) {
  const seen = new Set();
  const out = [];
  for (const m of list(isObject(data) ? data.matches : null)) {
    if (!isObject(m)) continue;
    const country = countryByCode(text(m.country_code)) ?? findCountryInText(text(m.country_name));
    if (!country || seen.has(country.code)) continue;
    seen.add(country.code);
    out.push({
      country_code: country.code,
      country_name: country.name,
      match_score: scoreOf(m.match_score),
      visa_difficulty: text(m.visa_difficulty),
      job_availability: text(m.job_availability),
      cost_of_living: text(m.cost_of_living),
      language_barrier: text(m.language_barrier),
      diaspora_size: text(m.diaspora_size),
      top_reason: text(m.top_reason),
      visa_path: text(m.visa_path),
    });
  }
  return out.sort((a, b) => (b.match_score ?? -1) - (a.match_score ?? -1)).slice(0, 5);
}

/**
 * Set a match as the route's destination (an explicit tap only): saves { from, to } (a From that
 * is not a country is left unset) and calls `announce` (the route pill listens) when it was
 * saved. False, with nothing announced, for an unknown country or blocked storage.
 */
export function setDestination(storage, { from, to } = {}, announce = () => {}) {
  const toCode = countryByCode(text(to))?.code;
  if (!toCode) return false;
  const saved = saveRoute(storage, { from: countryByCode(text(from))?.code ?? null, to: toCode });
  if (saved) announce();
  return saved;
}

const LEVELS = new Set(EXPERIENCE_LEVELS.map((l) => l.value));

/**
 * The form's first values: nationality from the saved `route`'s From, else the `profile`'s
 * (`nationalityFrom` says which: 'route' | 'profile' | null); current country (a code, or a
 * country named in the profile's text), experience, skills (one line) and preferred places from
 * the profile. `route` = readRoute(); `profile` = the saved profile.
 */
export function matchPrefill({ route, profile } = {}) {
  const p = isObject(profile) ? profile : {};
  const fromRoute = countryByCode(text(route?.from))?.code ?? '';
  const fromProfile = countryByCode(text(p.nationality))?.code ?? '';
  const current = text(p.currentCountry);
  const skills = Array.isArray(p.skills) ? strings(p.skills).join(', ') : typeof p.skills === 'string' ? p.skills.trim() : '';
  return {
    value: {
      nationality: fromRoute || fromProfile,
      currentCountry: (countryByCode(current) ?? findCountryInText(current))?.code ?? '',
      experience: LEVELS.has(p.experience) ? p.experience : '',
      skills,
      preferredCountries: strings(p.preferredCountries),
    },
    nationalityFrom: fromRoute ? 'route' : fromProfile ? 'profile' : null,
  };
}

/**
 * What a search sends: the form's five fields (`value`, as matchPrefill shapes it) plus the saved
 * `profile`'s job types (the prompt's job interests), and nothing else from the profile (no name,
 * no resume summary).
 */
export function requestProfile(value, profile) {
  const v = isObject(value) ? value : {};
  const out = {
    nationality: text(v.nationality),
    currentCountry: text(v.currentCountry),
    experience: text(v.experience),
    skills: text(v.skills),
    preferredCountries: strings(v.preferredCountries),
  };
  const jobTypes = strings(isObject(profile) ? profile.jobTypes : null);
  return jobTypes.length ? { ...out, jobTypes } : out;
}

const COST_WORDS = { $: 'Low', $$: 'Moderate', $$$: 'High', $$$$: 'Very high' };

/** The AI's cost of living ('$' to '$$$$') in words: { signs, word }; anything else is kept as the word. */
export function costLevel(value) {
  const raw = text(value);
  return Object.hasOwn(COST_WORDS, raw) ? { signs: raw, word: COST_WORDS[raw] } : { signs: '', word: raw };
}

// POST JSON; the parsed body, or null when the call failed in any way (network, non-JSON, non-2xx,
// an { error } body). Never rejects.
async function postJson(url, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    return res.ok && isObject(data) && !data.error ? data : null;
  } catch {
    return null;
  }
}

/**
 * One match request under the page's createLatest guard: { id, matches } (cleaned by
 * pickMatches), or { id, error } with the friendly sentence when the call failed or named no
 * known country; null when a newer search started meanwhile (its answer is the one shown).
 * `refresh`: "Refresh matches", which asks the AI again (the route skips its own cache).
 */
export async function fetchMatches(latest, profile, { refresh = false, post = postJson } = {}) {
  const id = latest.next();
  let data = null;
  try {
    data = await post('/api/country-match', refresh ? { profile, refresh: true } : { profile });
  } catch {
    data = null;
  }
  if (!latest.isCurrent(id)) return null;
  const matches = pickMatches(data);
  return matches.length ? { id, matches } : { id, error: friendlyError('match') };
}
