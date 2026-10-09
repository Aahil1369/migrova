// Security-print patterns for the Journey Book: wavy guilloche lines (page paper) and a
// spirograph rosette (visa vignettes, hologram seal), as CSS `url("data:image/svg+xml…")`
// values. Pure and framework-free: no DOM access, safe during SSR and in node tests.
// Same seed -> the identical string (memoised).

const cache = new Map();

// FNV-1a: any seed (number, string, undefined) -> uint32.
function hashSeed(seed) {
  const s = String(seed ?? 0);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32: small deterministic PRNG, uniform in [0, 1).
function prng(seed) {
  let a = hashSeed(seed);
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Minimal escaping for an SVG inside url("…"): no double quotes, and the URL-special
// characters percent-encoded.
function toCssUrl(svg) {
  const body = svg
    .replace(/\s+/g, ' ')
    .replace(/"/g, "'")
    .replace(/%/g, '%25')
    .replace(/#/g, '%23')
    .replace(/</g, '%3C')
    .replace(/>/g, '%3E');
  return `url("data:image/svg+xml;utf8,${body}")`;
}

function memo(key, build) {
  if (!cache.has(key)) cache.set(key, build());
  return cache.get(key);
}

const W = 400;
const H = 570; // page aspect 1 : 1.42
const LINES = 26;

/**
 * Wavy security lines for a passport page (the prototype's generator, with the phase,
 * amplitude and frequency of each line nudged by `seed` so every page differs a little).
 * Stretches to the element (`preserveAspectRatio="none"`): use `background-size: 100% 100%`.
 */
export function guillocheDataUri(seed = 0) {
  return memo(`g:${seed}`, () => {
    const rand = prng(`g${seed}`);
    const shift = rand() * Math.PI * 2;
    let paths = '';
    for (let k = 0; k < LINES; k++) {
      const amp = 10 + (k % 5) * 3 + rand() * 2;
      const freq = 0.035 + (k % 4) * 0.006 + rand() * 0.002;
      const ph = k * 0.7 + shift;
      const y0 = k * 22;
      let d = '';
      for (let x = 0; x <= W; x += 6) {
        const y = y0 + Math.sin(x * freq + ph) * amp + Math.sin(x * freq * 2.3 + ph) * 3;
        d += `${x ? 'L' : 'M'}${x} ${y.toFixed(1)}`;
      }
      paths += `<path d="${d}"/>`;
    }
    return toCssUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">` +
        `<g fill="none" stroke="#2f5139" stroke-opacity="0.09" stroke-width="0.8">${paths}</g></svg>`,
    );
  });
}

/**
 * Spirograph rosette (hypotrochoid) in a 100x100 box, for vignettes and the seal.
 * `color` is any SVG colour (default deep green).
 */
export function rosetteDataUri(seed = 0, color = '#2f6b47') {
  return memo(`r:${seed}:${color}`, () => {
    const rand = prng(`r${seed}`);
    const R = 30;
    const r = [7, 11, 13][Math.floor(rand() * 3)]; // coprime with R -> a different lobe count
    const k = 17 + rand() * 4;
    const turns = r; // with gcd(R, r) = 1 the curve closes after r turns
    let d = '';
    for (let t = 0, i = 0; t <= Math.PI * 2 * turns + 0.01; t += 0.06, i++) {
      const x = 50 + (R - r) * Math.cos(t) + k * Math.cos(((R - r) / r) * t);
      const y = 50 + (R - r) * Math.sin(t) - k * Math.sin(((R - r) / r) * t);
      d += `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return toCssUrl(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">` +
        `<path d="${d}" fill="none" stroke="${color}" stroke-width="0.5"/>` +
        `<circle cx="50" cy="50" r="48" fill="none" stroke="${color}" stroke-width="0.4" stroke-dasharray="1 1.6"/></svg>`,
    );
  });
}
