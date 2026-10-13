// The relocation guide's JSON contract, shared by the API route and its tests. Pure, no imports.

/**
 * The top-level fields the relocation prompt asks the AI for, in the prompt's order. The route
 * answers exactly these (a missing one is null, anything else the AI adds is dropped), and the
 * page files each one under exactly one chapter (RELOCATE_CHAPTERS in app/lib/relocate.js; a test
 * compares this list with the prompt's JSON shape).
 */
export const RELOCATION_FIELDS = Object.freeze([
  'overview',
  'costBreakdown',
  'monthlyBudget',
  'comparedToUS',
  'neighborhoods',
  'jobMarket',
  'languageBarrier',
  'qualityOfLife',
  'beforeYouMove',
  'firstMonthTips',
  'expatCommunities',
  'taxInfo',
  'healthcareInfo',
  'safetyInfo',
  'climate',
  'workCulture',
  'bankingSetup',
  'simAndInternet',
  'emergencyNumbers',
  'culturalTips',
  'visaPathSummary',
]);

/** The AI's parsed answer as exactly RELOCATION_FIELDS (missing -> null). Throws when it is not a JSON object. */
export function pickRelocation(parsed) {
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Relocation answer is not a JSON object');
  return Object.fromEntries(RELOCATION_FIELDS.map((field) => [field, Object.hasOwn(parsed, field) ? parsed[field] ?? null : null]));
}

/**
 * The in-memory cache key of one guide: destination, origin and field all change the answer.
 * Case and outer spaces do not; the parts are JSON-quoted so 'a:b' + 'c' never meets 'a' + 'b:c'.
 */
export function relocationCacheKey({ destination, origin, field } = {}) {
  const part = (value) => String(value ?? '').trim().toLowerCase();
  return JSON.stringify([part(destination), part(origin), part(field)]);
}
