// The traveller's saved route (From -> To). Pure; storage is injected so it can be
// a fake in tests and so a throwing/blocked localStorage never crashes the page.
import { countryByCode } from '../../data/countries195.js';

export const ROUTE_KEY = 'migrova_route';
// Window event fired after the route is saved or forgotten on this page (RoutePill, BoardingPass).
export const ROUTE_EVENT = 'migrova:route';

// A valid country code (lowercased) or null.
const asCode = (value) => {
  if (typeof value !== 'string') return null;
  const country = countryByCode(value);
  return country ? country.code : null;
};

// A valid country code, the literal 'any', or null.
const asDestination = (value) => {
  if (typeof value === 'string' && value.toLowerCase() === 'any') return 'any';
  return asCode(value);
};

const isUnset = (value) => value === null || value === undefined;

/** Read the saved route as { from, to } (each a code or null), or null if there is none. */
export function readRoute(storage) {
  try {
    const raw = storage.getItem(ROUTE_KEY);
    if (raw === null || raw === undefined) return null;
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    return { from: asCode(data.from), to: asDestination(data.to) };
  } catch {
    return null;
  }
}

/**
 * Save the route. `from`/`to` may be null/undefined; anything else must be a valid
 * country code (`to` may also be 'any'). Returns false and writes nothing on invalid
 * input, and false if storage throws.
 */
export function saveRoute(storage, { from, to } = {}, now = Date.now()) {
  try {
    const fromCode = isUnset(from) ? null : asCode(from);
    const toCode = isUnset(to) ? null : asDestination(to);
    if (!isUnset(from) && fromCode === null) return false;
    if (!isUnset(to) && toCode === null) return false;
    storage.setItem(ROUTE_KEY, JSON.stringify({ from: fromCode, to: toCode, savedAt: now }));
    return true;
  } catch {
    return false;
  }
}

/** Forget the saved route. Never throws. */
export function forgetRoute(storage) {
  try {
    storage.removeItem(ROUTE_KEY);
  } catch {
    /* storage blocked: nothing to forget */
  }
}

const iso3Of = (value) => {
  const country = typeof value === 'string' ? countryByCode(value) : null;
  return country ? country.iso3 : 'ANY';
};

/** { from: 'PAK', to: 'CAN' } ISO3 codes for the boarding pass; unset, 'any' or invalid -> 'ANY'. */
export function routeCodes(route) {
  const { from, to } = route || {};
  return { from: iso3Of(from), to: iso3Of(to) };
}

/** 'PAK ✈ CAN' | 'PAK ✈ ANY' | 'ANY ✈ ANY' (missing or invalid codes read as ANY). */
export function routeLabel(route) {
  const codes = routeCodes(route);
  return `${codes.from} ✈ ${codes.to}`;
}

/** 'Pakistan to Canada' | 'Pakistan to anywhere' | 'anywhere to anywhere' (for screen readers). */
export function routeSpoken(route) {
  const { from, to } = route || {};
  const nameOf = (value) => {
    const code = asCode(value);
    return code ? countryByCode(code).name : 'anywhere';
  };
  return `${nameOf(from)} to ${nameOf(to)}`;
}

/** Worth remembering: a valid From, or a valid (non-'any') To. */
export function hasRoute(route) {
  const { from, to } = route || {};
  return asCode(from) !== null || asCode(to) !== null;
}

/** Same From and To (valid codes compared case-insensitively; unset/invalid == unset, 'any' != unset). */
export function sameRoute(a, b) {
  if (!a || !b) return false;
  return asCode(a.from) === asCode(b.from) && asDestination(a.to) === asDestination(b.to);
}
