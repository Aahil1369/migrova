// Stamp ink colours that keep stamp text readable on passport paper (--page #fbf8f2).
// Pure and framework-free (unit-tested in scripts/passport/__tests__/stampInks.test.mjs).
// Any `color` given to <Stamp> must reach WCAG 4.5:1 on #fbf8f2; use these.

export const PAGE_PAPER = '#fbf8f2';

// WCAG contrast on #fbf8f2, measured before multiply (which only darkens):
export const STAMP_INKS = Object.freeze({
  green: '#1f6f47', // 5.79:1
  blue: '#2d5bd7', // 5.52:1
  terracotta: '#a94a1f', // 5.37:1
  purple: '#6a43a8', // 6.65:1
  gold: '#7a5c12', // 5.88:1
});

export const DEFAULT_STAMP_INK = STAMP_INKS.green;

function luminance(hex) {
  const n = parseInt(String(hex).replace('#', ''), 16);
  const channel = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG 2.x contrast ratio between two #rrggbb colours (1..21). */
export function contrastRatio(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
