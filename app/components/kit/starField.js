// Deterministic star positions for the night-sky header bands (the homepage NightSky and the tool
// pages). Pure and framework-free; unit-tested in scripts/passport/__tests__/smoothness.test.mjs.

/**
 * The night sky's 64 stars in `layers` groups: NightSky renders each group as one SVG layer that
 * twinkles as a whole (opacity only), instead of 64 individually animated elements.
 * Deterministic (no Math.random: server and client render the same HTML). x / y: percentages as
 * strings ('37.70'); r: radius in px (1, every 5th star 1.5: 2px / 3px dots).
 */
export function starField(count = 64, layers = 3) {
  const out = Array.from({ length: layers }, () => []);
  for (let i = 0; i < count; i++) {
    out[i % layers].push({
      x: ((i * 37.7) % 100).toFixed(2),
      y: ((i * 61.3) % 100).toFixed(2),
      r: i % 5 === 0 ? 1.5 : 1,
    });
  }
  return out;
}
