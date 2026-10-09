// Machine-readable-zone strip for the Journey Book cover and data page.
// Pure and framework-free. Every produced line is exactly MRZ_LEN characters.

export const MRZ_LEN = 44;
export const MRZ_PLAIN = ['PLAIN ENGLISH. OFFICIAL SOURCES.', 'NO SCAMS. NO GUESSWORK.'];
export const DECODE_FRAMES = 59;

const CHARSET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<';

// Uppercase, and turn anything outside [A-Z0-9<] into the '<' filler.
const sanitize = (value) => String(value ?? '').toUpperCase().replace(/[^A-Z0-9<]/g, '<');

// Truncate or pad a string to exactly MRZ_LEN characters.
const fit = (value, filler) => String(value ?? '').slice(0, MRZ_LEN).padEnd(MRZ_LEN, filler);

// The verified-link count as 4 MRZ digits (capped at 9999); '<<<<' when unknown, so the strip
// never shows a made-up number.
function countField(count) {
  const n = typeof count === 'number' ? count : Number.NaN;
  if (!Number.isFinite(n) || n < 0) return '<<<<';
  return String(Math.min(9999, Math.floor(n))).padStart(4, '0');
}

/**
 * Build the two MRZ lines. `fromIso3` / `toIso3` are optional ISO3 codes; with no route the
 * strip reads "YOUR<FAMILY" and "ANY". `count` is the verified official-link count
 * (computed from OFFICIAL_SOURCES on the server and passed down), shown after the 195.
 */
export function buildMrz({ fromIso3, toIso3, count } = {}) {
  const from = sanitize(fromIso3);
  const to = toIso3 == null || toIso3 === '' ? 'ANY' : sanitize(toIso3);
  const line1 = `P<MGVYOUR<FAMILY<<${from}`;
  const line2 = `195${countField(count)}MGV<<${to}<<NEXT<STOP`;
  return [fit(line1, '<'), fit(line2, '<')];
}

/**
 * One frame of the scramble-to-plain-English decode. `raw` and `plain` are single
 * lines; both are padded/truncated to MRZ_LEN, and so is the result.
 * Frames 0-6 hold `raw`; from frame 7 each character scrambles until it is revealed
 * (left to right) at frame 18 + floor(i * 0.9); from DECODE_FRAMES it is all plain.
 */
export function decodeFrame(raw, plain, frame) {
  const f = Math.floor(Number(frame)) || 0;
  const rawLine = fit(raw, '<');
  const plainLine = fit(plain, ' ');
  if (f <= 6) return rawLine;
  if (f >= DECODE_FRAMES) return plainLine;
  let out = '';
  for (let i = 0; i < MRZ_LEN; i++) {
    out += f >= 18 + Math.floor(i * 0.9)
      ? plainLine[i]
      : CHARSET[(i * 7 + f * 3) % CHARSET.length];
  }
  return out;
}
