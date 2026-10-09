// Which Journey Book pages are on screen for a pose. Pure and framework-free.
// PassportStage uses it each frame (setActive only when the set changes) and for the keyboard
// focus jump; pages use their `active` flag to apply vignettes / thunk stamps / count up.

import { PAGES } from './timeline.js';

const LAST = PAGES.length - 1;
const LEAVES = 4; // cover/notice, data/visas1, visas2/entries, sources/travellers

/**
 * Pages showing (wholly or partly) for `pose` in `layout`, as a Set of PAGES ids.
 * - 'spread' (desktopPose): a leaf is on the right (> -2deg), on the left (< -178deg) or
 *   turning (same thresholds as leafStyle). Showing: the top of the right stack (front of the
 *   first leaf still on the right, else the observations base), the top of the left stack
 *   (back of the last leaf on the left) and, for a turning leaf, the side facing the viewer
 *   (front until -90deg, then back). So a page stays showing until it is fully covered and
 *   counts as arrived as soon as it is uncovered or past half a turn.
 * - 'notepad' / 'lite' (notepadPose): the showing page; while it lifts (0 < flip < 0.5) the
 *   page underneath (page + 1, or the cover after the last page) joins it, then takes over.
 * - 'stack' (reduced motion): every page.
 */
export function activePages(layout, pose) {
  if (layout === 'stack') return new Set(PAGES);

  if (layout === 'notepad' || layout === 'lite') {
    const page = Number.isInteger(pose?.page) && pose.page >= 0 && pose.page <= LAST ? pose.page : 0;
    const flip = Number.isFinite(pose?.flip) ? pose.flip : 0;
    const under = PAGES[(page + 1) % PAGES.length];
    if (flip >= 0.5) return new Set([under]);
    return new Set(flip > 0 ? [PAGES[page], under] : [PAGES[page]]);
  }

  const leaves = Array.isArray(pose?.leaves) ? pose.leaves : [];
  const angle = (i) => (Number.isFinite(leaves[i]) ? leaves[i] : 0);
  const out = new Set();
  let right = null;
  let left = null;
  for (let i = 0; i < LEAVES; i++) {
    const a = angle(i);
    if (a < -178) left = PAGES[2 * i + 1];
    else if (a > -2) right ??= PAGES[2 * i];
    else out.add(a > -90 ? PAGES[2 * i] : PAGES[2 * i + 1]); // turning: the side facing us
  }
  out.add(right ?? PAGES[LAST]);
  if (left) out.add(left);
  return out;
}

/** Stable string key for a page set (cheap change detection). */
export const activeKey = (set) => [...set].sort().join('|');
