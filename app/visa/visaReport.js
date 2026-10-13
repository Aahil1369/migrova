// The issued visa on /visa, as pure logic: what a form submit does, which entry stamp a report
// gets, the chance line, the two machine-readable-zone lines (raw, then plain English), the card's
// lead visa, and the documents checklist (key + items). Framework-free; everything the AI sends is
// treated as possibly missing or malformed (unit-tested in scripts/site/__tests__/visaReport.test.mjs).
import { checklistKey } from '../components/kit/checklistStore.js';
import { MRZ_LEN } from '../components/kit/mrz.js';

/**
 * The entry stamp per `currentStatus` (stamp ink names from STAMP_INKS). Never a negative word:
 * a hard route is APPLY FIRST, an unknown status is CHECK (visaStamp), and a low chance is plain
 * text beside the stamp, not a different stamp.
 */
export const VISA_STAMPS = Object.freeze({
  'visa-free': { lines: ['VISA FREE'], ink: 'green' },
  'e-visa': { lines: ['E-VISA', 'APPLY ONLINE'], ink: 'blue' },
  'visa-on-arrival': { lines: ['ON ARRIVAL'], ink: 'blue' },
  'visa-required': { lines: ['APPLY FIRST'], ink: 'gold' },
  citizen: { lines: ['HOME'], ink: 'green' },
});
const CHECK_STAMP = { lines: ['CHECK'], ink: 'gold' };

// The same meaning in plain words, for the card text beside the (decorative) stamp; the step,
// uppercased, is the decoded MRZ's second line.
const ENTRY = {
  'visa-free': { label: 'Visa free', step: 'No visa needed for short stays' },
  'e-visa': { label: 'E-visa', step: 'Apply online before you go' },
  'visa-on-arrival': { label: 'Visa on arrival', step: 'Get it when you land' },
  'visa-required': { label: 'Visa required', step: 'Apply before you go' },
  citizen: { label: 'Citizen', step: 'You can live here' },
};
const CHECK_ENTRY = { label: 'Check the rules', step: 'Check the official site' };

const CHANCES = ['low', 'medium', 'high', 'very high'];
const NO_CHANCE = 'Chance estimate unavailable';

const PURPOSE_CODES = { work: 'WORK', study: 'STUDY', tourist: 'TOUR', 'permanent residency': 'PR', 'digital nomad': 'NOMAD' };

// 'Visa Required ', 'VISA_FREE' -> 'visa-required', 'visa-free'; anything but a string -> ''.
const statusKey = (value) => (typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s_]+/g, '-') : '');
// ' Very  High' -> 'very high'.
const wordsKey = (value) => (typeof value === 'string' ? value.trim().toLowerCase().replace(/[\s_-]+/g, ' ') : '');
const known = (table, key) => key !== '' && Object.hasOwn(table, key);

// A trimmed string, or '' for anything that is not a string or number.
const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

// An ISO 3166 alpha-3 code as printed in the MRZ, or XXX when it is missing or not three letters.
const iso3 = (value) => {
  const code = text(value).toUpperCase();
  return /^[A-Z]{3}$/.test(code) ? code : 'XXX';
};

// Exactly MRZ_LEN characters: cut, or padded with `filler`.
const fit = (line, filler) => line.slice(0, MRZ_LEN).padEnd(MRZ_LEN, filler);

// FNV-1a over a string, as 7 base-36 characters [0-9A-Z]: the raw MRZ's document number and the
// checklist's list fingerprint (stable across runs and browsers, not a security hash).
function fingerprint(value) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
}

export const MISSING_FIELDS = 'Please select both your nationality and destination country.';

/**
 * What submitting the visa form does, in this order: 'busy' (ignored while a search is loading),
 * 'missing' (show MISSING_FIELDS: the form is checked before anything else, so a first visit never
 * sees the legal notice for an empty form), 'ack' (the one-time legal notice first), 'search'.
 */
export function visaSubmitStep({ loading, nationality, targetCountry, acked }) {
  if (loading) return 'busy';
  if (!nationality || !targetCountry) return 'missing';
  if (!acked) return 'ack';
  return 'search';
}

/** The entry stamp for a report's `currentStatus`: { lines, ink } (a copy); CHECK / gold when unknown. */
export function visaStamp(currentStatus) {
  const key = statusKey(currentStatus);
  const stamp = known(VISA_STAMPS, key) ? VISA_STAMPS[key] : CHECK_STAMP;
  return { lines: [...stamp.lines], ink: stamp.ink };
}

/** The stamp's meaning as plain words: { label, step }, e.g. 'Visa required' / 'Apply before you go'. */
export function visaEntry(currentStatus) {
  const key = statusKey(currentStatus);
  return { ...(known(ENTRY, key) ? ENTRY[key] : CHECK_ENTRY) };
}

/**
 * The chance from /api/visa-probability as plain text: 'Chance: medium' …; `caution` for a Low
 * chance (shown as a CAUTION note, never as a stamp). Anything else, including a failed or missing
 * estimate: 'Chance estimate unavailable'.
 */
export function chanceLine(probability) {
  const key = wordsKey(probability);
  if (!CHANCES.includes(key)) return { text: NO_CHANCE, caution: false };
  return { text: `Chance: ${key}`, caution: key === 'low' };
}

/**
 * The visa's raw MRZ, two lines of exactly 44 [A-Z0-9<]: `V<{to}{purpose}<<{from}<<…` and a filler
 * line (a document number derived from the route, then MGV and both codes), the same every time
 * for the same visa. Purpose codes: WORK, STUDY, TOUR, PR, NOMAD (none for anything else);
 * a missing or malformed ISO3 code reads XXX.
 */
export function visaRawMrz({ fromIso3, toIso3, purpose } = {}) {
  const from = iso3(fromIso3);
  const to = iso3(toIso3);
  const code = PURPOSE_CODES[wordsKey(purpose)] ?? '';
  const docNo = fingerprint(`${to}${code}${from}`);
  return [fit(`V<${to}${code}<<${from}<<`, '<'), fit(`${docNo}<<MGV<<${from}<<${to}<<${code}<<`, '<')];
}

/**
 * What the MRZ decodes into, two lines of exactly 44 characters (space-padded):
 * '✓ ' + the stamp words, then the next step + ' · ' + the chance in capitals, e.g.
 * '✓ APPLY FIRST' / 'APPLY BEFORE YOU GO · CHANCE: MEDIUM'. When the step and the chance together
 * pass 44 characters the chance is left off (it is always in the card's text), so a word is never
 * cut in half; a missing estimate never fits, so pending / failed lines read just the next step.
 */
export function visaPlainMrz({ currentStatus, probability } = {}) {
  const step = visaEntry(currentStatus).step.toUpperCase();
  const withChance = `${step} · ${chanceLine(probability).text.toUpperCase()}`;
  return [
    fit(`✓ ${visaStamp(currentStatus).lines.join(' · ')}`, ' '),
    fit(withChance.length <= MRZ_LEN ? withChance : step, ' '),
  ];
}

/**
 * The visa the card leads with: the report's first visa type, { name, processing, fee } (each a
 * trimmed string, '' when missing). No usable first entry: name 'Visa options below'.
 */
export function leadVisa(report) {
  const first = Array.isArray(report?.visaTypes) ? report.visaTypes[0] : null;
  const entry = first && typeof first === 'object' ? first : {};
  return {
    name: (typeof entry.name === 'string' && entry.name.trim()) || 'Visa options below',
    processing: text(entry.processingTime),
    fee: text(entry.cost),
  };
}

/**
 * Where the documents checklist is saved on this device: checklistKey(['visa', from, to, purpose]),
 * e.g. 'migrova_check:visa:pk:ca:study'. Given `items` (the labels shown), a fingerprint of the
 * list is added, because ticks are saved by position: a re-run that returns a different list
 * starts empty instead of showing ticks the person never made.
 */
export function docsKey({ from, to, purpose, items } = {}) {
  const parts = ['visa', from, to, purpose];
  if (Array.isArray(items)) parts.push(fingerprint(items.join('\n')));
  return checklistKey(parts);
}

/**
 * The report's documentChecklist as checklist labels: 'Valid passport (original) — note'. Plain
 * string entries are kept; entries without a document name are dropped; [] for a non-array.
 */
export function checklistItems(documentChecklist) {
  if (!Array.isArray(documentChecklist)) return [];
  return documentChecklist
    .map((doc) => {
      if (typeof doc === 'string') return doc.trim();
      const name = text(doc?.document);
      if (!name) return '';
      const format = text(doc.format);
      const notes = text(doc.notes);
      return `${name}${format ? ` (${format})` : ''}${notes ? ` — ${notes}` : ''}`;
    })
    .filter(Boolean);
}
