// Text helpers for the Journey Book pages. Pure and framework-free (server-safe; unit-tested in
// scripts/passport/__tests__/pages-copy.test.mjs).

export const STORY_MAX = 220;

/**
 * A traveller's story as a margin note: whitespace collapsed, and anything past STORY_MAX
 * characters cut and ended with "…". Counts code points, so an emoji is never split.
 */
export function clampStory(text) {
  const clean = String(text ?? '').replace(/\s+/g, ' ').trim();
  const chars = Array.from(clean);
  if (chars.length <= STORY_MAX) return clean;
  return `${chars.slice(0, STORY_MAX).join('')}…`;
}

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** Entry-stamp date in local time: "09 OCT 2026". */
export function stampDate(date) {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
