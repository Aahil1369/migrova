// UV check (Official Sources fold-out): pure helpers. Framework-free; unit-tested in
// scripts/passport/__tests__/uv.test.mjs.

const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0

/**
 * The invented look-alike site for a country: `<country-name-lowercased-hyphenated>-visa-fastpass.example`.
 * Accents are stripped (NFKD), anything that is not a-z / 0-9 becomes '-', runs of dashes collapse
 * and the ends are trimmed. Always the reserved `.example` TLD, so it can never be a real (scam)
 * domain; render it as plain text, never as a link.
 */
export function fakeDomain(name) {
  const slug = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${slug || 'country'}-visa-fastpass.example`;
}

// Where, inside the `uv` beat (0..1), each card reveals itself without the lamp. The flap is
// fully open from 0.2 to 0.85 of the beat, so the lamp has the first part of the hold to itself.
const REVEAL_AT = [0.45, 0.6];

/**
 * How many UV cards have auto-revealed at `uvT` (localT of the `uv` beat): 0, 1 (the real site)
 * or 2 (both). Scrolling back before the beat resets it, so the check replays.
 */
export function uvRevealLevel(uvT) {
  const t = Number.isFinite(uvT) ? uvT : 0;
  return REVEAL_AT.filter((at) => t >= at).length;
}

const ARM_AT = 0.6;
const FIRE_BELOW = 0.5;

/**
 * The lamp "clicks off" with a warm flicker when the UV dim falls past 0.5 on the way out.
 * Feed it every frame: `{ armed, fire } = uvFlickerStep(armed, dim)`. It arms once the dim is
 * up (>= 0.6) and fires exactly once as it falls below 0.5; jitter around 0.5 cannot re-fire
 * until the dim has been back up. Never fires on the way in.
 */
export function uvFlickerStep(armed, dim) {
  if (!Number.isFinite(dim)) return { armed: Boolean(armed), fire: false }; // no signal: no change
  const d = clamp01(dim);
  if (d >= ARM_AT) return { armed: true, fire: false };
  if (armed && d < FIRE_BELOW) return { armed: false, fire: true };
  return { armed: Boolean(armed), fire: false };
}

// The flicker itself: two 60ms opacity pulses of the dim layer before it fades (WAAPI, so the
// per-frame inline opacity takes over again when it ends). Times in ms.
export const FLICKER_KEYFRAMES = [
  { opacity: 0.5, offset: 0 },
  { opacity: 0.92, offset: 30 / 180 },
  { opacity: 0.22, offset: 60 / 180 },
  { opacity: 0.22, offset: 120 / 180 },
  { opacity: 0.86, offset: 150 / 180 },
  { opacity: 0.18, offset: 1 },
];
export const FLICKER_MS = 180;
