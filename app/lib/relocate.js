// The Relocation Guide (/relocate) as pure logic: the boarding pass (ticket codes, city, budget
// tiers, the ADMITTED stamp, the first-week stub and where it is kept), the six chapter tabs and
// which AI fields each holds, the before-you-move checklist key, safe tel: / web links, and the
// stale-response guard. Framework-free; everything the AI sends is treated as possibly missing or
// malformed (unit-tested in scripts/site/__tests__/relocate.test.mjs).
import { checklistKey } from '../components/kit/checklistStore.js';
import { relocateDestination } from '../components/passport/search.js';
import { countryByCode, findCountryInText } from '../data/countries195.js';
import { fingerprint } from './fingerprint.js';
import { friendlyError } from './friendlyError.js';

const chapter = (id, label, keys) => Object.freeze({ id, label, keys: Object.freeze(keys) });

/**
 * The guide's chapter tabs, in order, and the relocation route's fields (RELOCATION_FIELDS in
 * app/api/relocation/fields.js) each one holds: every field is in exactly one chapter.
 */
export const RELOCATE_CHAPTERS = Object.freeze([
  chapter('money', 'Money', ['costBreakdown', 'monthlyBudget', 'comparedToUS', 'bankingSetup', 'taxInfo']),
  chapter('living', 'Living', ['overview', 'qualityOfLife', 'neighborhoods', 'climate', 'healthcareInfo']),
  chapter('work', 'Work', ['jobMarket', 'workCulture']),
  chapter('safety', 'Safety', ['safetyInfo', 'emergencyNumbers']),
  chapter('settling', 'Settling in', ['beforeYouMove', 'firstMonthTips', 'simAndInternet', 'visaPathSummary']),
  chapter('culture', 'Culture', ['culturalTips', 'languageBarrier', 'expatCommunities']),
]);

/** A trimmed string, or '' for anything that is not a string or a number. */
export const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

/** The value if it is an array, else []. */
export const list = (value) => (Array.isArray(value) ? value : []);

/** The trimmed, non-empty strings of a list (anything else dropped). */
export const lines = (value) => list(value).map((v) => (typeof v === 'string' ? v.trim() : '')).filter(Boolean);

const isObject = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

/** Whether an AI field holds something: not null / missing, not a blank string, not an empty list. */
function present(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** The chapters with at least one present field in `result`, in chapter order. */
export function chaptersFor(result) {
  if (!isObject(result)) return [];
  return RELOCATE_CHAPTERS.filter((c) => c.keys.some((key) => Object.hasOwn(result, key) && present(result[key])));
}

/**
 * The 3-letter code on the boarding pass: the ISO3 code of the country named in `place`
 * ('Toronto, Canada' -> 'CAN'), else the place's first three letters with accents dropped and
 * padded with X ('Lahore' -> 'LAH', 'Ōsaka' -> 'OSA', '' -> 'XXX'). Always [A-Z]{3}.
 */
export function ticketCode(place) {
  const name = typeof place === 'string' ? place : '';
  const iso3 = findCountryInText(name)?.iso3;
  if (/^[A-Z]{3}$/.test(iso3 ?? '')) return iso3;
  const letters = name.normalize('NFD').replace(/[^A-Za-z]/g, '').toUpperCase();
  return letters.slice(0, 3).padEnd(3, 'X');
}

const TIERS = [
  ['budget', 'Budget'],
  ['comfortable', 'Comfortable'],
  ['luxury', 'Luxury'],
];

// A positive amount from a number or a plain numeric string ('1,800', '$2,950'); else NaN.
function amountOf(value) {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return Number.NaN;
  const digits = value.replace(/[\s$,]/g, '');
  return /^\d+(\.\d+)?$/.test(digits) ? Number(digits) : Number.NaN;
}

const isAmount = (n) => Number.isFinite(n) && n > 0;

/**
 * An AI amount in US dollars: a bare number ('2500', 95000, '$1,800') reads '$2,500' plus
 * '/<per>' ('mo', 'yr'); anything else (a range, prose) is kept as written, trimmed.
 */
export function usd(value, per) {
  const n = amountOf(value);
  return isAmount(n) ? `$${Math.round(n).toLocaleString('en-US')}${per ? `/${per}` : ''}` : text(value);
}

/**
 * The fare box: monthlyBudget's tiers as [{ label: 'Budget', amount: '$1,200/mo' }, …] in the
 * order Budget, Comfortable, Luxury, keeping only real positive amounts; [] when there is none.
 */
export function budgetTiers(monthlyBudget) {
  if (!isObject(monthlyBudget)) return [];
  return TIERS.flatMap(([key, label]) => {
    const value = Object.hasOwn(monthlyBudget, key) ? monthlyBudget[key] : null;
    return isAmount(amountOf(value)) ? [{ label, amount: usd(value, 'mo') }] : [];
  });
}

/** The city for the ticket: the part before the first comma ('Toronto, Canada' -> 'Toronto'). */
export function cityName(place) {
  return typeof place === 'string' ? place.split(',')[0].trim() : '';
}

const STAMP_LINE_MAX = 18;

/**
 * The ADMITTED stamp's lines: ['ADMITTED', 'TORONTO']. The city is uppercased, kept to letters,
 * digits and . ' - ; one longer than 18 characters (or none) shows the ticket code instead, so a
 * word is never cut in half.
 */
export function admittedStamp(city, code) {
  const name = (typeof city === 'string' ? city : '')
    .normalize('NFC')
    .replace(/[^\p{L}\p{N}\s.'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  const fallback = /^[A-Z]{3}$/.test(code ?? '') ? code : 'XXX';
  return ['ADMITTED', name && name.length <= STAMP_LINE_MAX ? name : fallback];
}

/** The first-week plan on the stub: the guide's firstMonthTips as trimmed strings, at most five. */
export function weekPlan(result) {
  return lines(isObject(result) ? result.firstMonthTips : null).slice(0, 5);
}

/** Where a torn stub (the first-week plan) is kept on this device, per destination. */
export function stubKey(destination) {
  return checklistKey(['relocate-week1', destination]);
}

/**
 * The before-you-move checklist's device key: checklistKey(['relocate', destination]). Given the
 * `items` shown, a fingerprint of the list is added, because ticks are saved by position: a
 * re-run that returns another list starts empty instead of showing ticks nobody made.
 */
export function beforeKey(destination, items) {
  const parts = ['relocate', destination];
  if (Array.isArray(items)) parts.push(fingerprint(items.join('\n')));
  return checklistKey(parts);
}

/** Keep the torn stub's plan on this device ({ items, savedAt } under stubKey). False when storage is missing or refuses. */
export function saveWeekPlan(storage, destination, items, now = Date.now()) {
  try {
    storage.setItem(stubKey(destination), JSON.stringify({ items: lines(items), savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

/** The plan saved for `destination` on this device (a list of strings), or null: none, junk, or storage blocked. */
export function savedWeekPlan(storage, destination) {
  try {
    const raw = storage.getItem(stubKey(destination));
    if (raw === null || raw === undefined) return null;
    const data = JSON.parse(raw);
    return isObject(data) && Array.isArray(data.items) && data.items.every((s) => typeof s === 'string') ? data.items : null;
  } catch {
    return null;
  }
}

/** 'tel:112' for the first number in an emergency entry ('112 or 999', '+44 20 …'); '' when there is none. */
export function telHref(value) {
  const match = /\+?\d[\d\s().-]*/.exec(text(value));
  if (!match) return '';
  return `tel:${match[0].startsWith('+') ? '+' : ''}${match[0].replace(/\D/g, '')}`;
}

/**
 * An AI-given web address as a safe link target: http(s) only (a bare 'meetup.com/x' gets
 * https://); '' for anything else (javascript:, prose, placeholders).
 */
export function safeUrl(value) {
  let href = typeof value === 'string' ? value.trim() : '';
  if (!href || /\s/.test(href)) return '';
  if (!/^[a-z][a-z0-9+.-]*:/i.test(href)) {
    if (!/^[\w-]+(\.[\w-]+)+(\/|$)/.test(href)) return '';
    href = `https://${href}`;
  }
  try {
    const url = new URL(href);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : '';
  } catch {
    return '';
  }
}

/**
 * The form's prefill: `dest` (?dest=) or the saved `route`'s To country (relocateDestination);
 * the origin from the saved route's From country as a name ('pk' -> 'Pakistan'), else the
 * `profile`'s current country (originFrom says which: 'route' | 'profile' | null); the field from
 * the profile's first job type. `route` = readRoute(); `profile` = the parsed saved profile.
 */
export function relocatePrefill({ dest, route, profile } = {}) {
  const fromRoute = countryByCode(route?.from)?.name ?? '';
  const saved = isObject(profile) ? profile : {};
  const current = typeof saved.currentCountry === 'string' ? saved.currentCountry.trim() : '';
  const job = typeof list(saved.jobTypes)[0] === 'string' ? saved.jobTypes[0].trim() : '';
  return {
    destination: relocateDestination(dest, route),
    origin: fromRoute || current,
    originFrom: fromRoute ? 'route' : current ? 'profile' : null,
    field: job.replace('Data Science / ML', 'Data Science'),
  };
}

/** The visa check for this move:/visa?from=<origin>&to=<destination>, leaving out a country it cannot name. */
export function visaLink({ origin, destination } = {}) {
  const from = findCountryInText(text(origin))?.code;
  const to = findCountryInText(text(destination))?.code;
  const params = [from && `from=${from}`, to && `to=${to}`].filter(Boolean);
  return params.length ? `/visa?${params.join('&')}` : '/visa';
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
 * One guide request under the page's createLatest guard: { id, data }, or { id, error } with the
 * friendly sentence; null when a newer search started meanwhile (its answer is dropped, so the
 * newest search always wins: a double submit, a second city chip tapped quickly).
 */
export async function fetchGuide(latest, body, post = postJson) {
  const id = latest.next();
  let data = null;
  try {
    data = await post('/api/relocation', body);
  } catch {
    data = null;
  }
  if (!latest.isCurrent(id)) return null;
  return isObject(data) ? { id, data } : { id, error: friendlyError('relocation') };
}
