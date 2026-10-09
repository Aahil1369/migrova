// Journey Book pose engine: scroll progress p in [0,1] -> every visual parameter of the
// passport scene. Pure and framework-free; PassportStage writes the results to DOM refs
// each animation frame, so the field names and ranges below are the contract.
//
// Needs the standard BEATS ids from timeline.js (arrival, ajar, open, spread1..4, flip1..3,
// uv, closing, finale).

import { localT, beatAt, PAGES, SPREAD_OF } from './timeline.js';

const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0
const seg = (v, from, to) => clamp01((v - from) / (to - from));
const noNegZero = (n) => (n === 0 ? 0 : n); // -0 -> 0, so strict equality and Object.is behave

export const easeInOutCubic = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Closing sub-windows (fractions of `closing`) per desktop leaf: leaf 3 closes first, leaf 0 last.
const CLOSE_WINDOWS = [[0.45, 1.0], [0.3, 0.85], [0.15, 0.7], [0.0, 0.55]];

// Book tilt/scale when closed (follow `shift`: closed <-> open).
const CLOSED_TILT_X = 8;
const CLOSED_TILT_Y = -14;
const CLOSED_SCALE = 0.92;

/**
 * Fields that are identical in the desktop and phone layouts (sky, hero/finale copy, UV
 * torch). Both poses call this, so switching layout mid-scroll can never jump them.
 */
function sharedPose(timeline, q) {
  const { ranges } = timeline;
  const lt = (beat) => localT(timeline, beat, q);

  // UV: rise over the first 20% of `uv`, hold, fall over the last 15%; 0 outside the beat.
  const u = lt('uv');
  const uv = u > 0 && u < 1 ? clamp01(Math.min(u / 0.2, (1 - u) / 0.15)) : 0;

  return {
    // 0 night -> 1 daylight, linear from the start of spread3 to the end of closing.
    sky: seg(q, ranges.spread3[0], ranges.closing[1]),
    heroOpacity: 1 - clamp01(lt('ajar') / 0.7),
    finaleOpacity: clamp01(lt('finale') / 0.6),
    flap: uv,
    uvDim: uv,
  };
}

/**
 * Desktop two-page spread pose. Leaves are indexed 0..3 (cover/notice, data/visas1,
 * visas2/entries, sources/travellers); angles are in degrees, 0 = lying on the right (closed
 * side), -180 = turned over to the left.
 */
export function desktopPose(timeline, p) {
  const q = clamp01(p);
  const { ranges } = timeline;
  const lt = (beat) => localT(timeline, beat, q);
  const closing = lt('closing');

  // Where each leaf sits once the book is opened up...
  const opened = [
    -35 * easeInOutCubic(lt('ajar')) - 145 * easeInOutCubic(lt('open')),
    -180 * easeInOutCubic(lt('flip1')),
    -180 * easeInOutCubic(lt('flip2')),
    -180 * easeInOutCubic(lt('flip3')),
  ];
  // ...and how far `closing` has brought it back (leaf 3 first, leaf 0 last).
  const leaves = opened.map((angle, i) => {
    const [from, to] = CLOSE_WINDOWS[i];
    return noNegZero(angle * (1 - easeInOutCubic(seg(closing, from, to))));
  });

  // 1 = closed book right of centre, 0 = spine centred. Opens across ajar+open, returns in
  // the second half of closing.
  const opening = easeInOutCubic(seg(q, ranges.ajar[0], ranges.open[1]));
  const returning = easeInOutCubic(seg(closing, 0.5, 1));
  const shift = 1 - opening + returning;

  // Cover light-leak: up through ajar, back down through open.
  const coverLight = lt('ajar') * (1 - lt('open'));

  return {
    shift,
    scale: noNegZero(1 - (1 - CLOSED_SCALE) * shift),
    tiltX: noNegZero(CLOSED_TILT_X * shift),
    tiltY: noNegZero(CLOSED_TILT_Y * shift),
    leaves,
    coverLight,
    ...sharedPose(timeline, q),
    bonVoyage: closing >= 0.9, // localT(closing) is 1 throughout finale
    blessing: closing >= 0.95,
  };
}

// ---- phone "notepad": one page at a time -------------------------------------------------

// spread beat -> [left page index, right page index], derived from PAGES / SPREAD_OF.
const SPREAD_PAGES = {};
PAGES.forEach((page, i) => {
  const beat = SPREAD_OF[page];
  if (beat) (SPREAD_PAGES[beat] ||= []).push(i);
});
// flip beat -> the spread whose right page it lifts away.
const FLIP_FROM = { flip1: 'spread1', flip2: 'spread2', flip3: 'spread3' };
const SOURCES_PAGE = PAGES.indexOf('sources');
const LAST_PAGE = PAGES.length - 1;

/**
 * Phone notepad pose: which page (index into PAGES) is showing and how far it has lifted
 * away (`flip` 0..1, linear across its flip window; the page underneath is `page + 1`, or the
 * cover after the last page). Callers may ease `flip` (`easeInOutCubic` is exported).
 */
export function notepadPose(timeline, p) {
  const q = clamp01(p);
  const beat = beatAt(timeline, q);
  const t = localT(timeline, beat, q);

  let page = 0;
  let flip = 0;
  if (beat === 'open') {
    flip = t; // the cover lifts away to reveal the notice
  } else if (SPREAD_PAGES[beat]) {
    const [left, right] = SPREAD_PAGES[beat];
    if (t >= 0.6) {
      page = right;
    } else {
      page = left;
      flip = seg(t, 0.4, 0.6); // left page turns over the middle 20% of the beat
    }
  } else if (FLIP_FROM[beat]) {
    page = SPREAD_PAGES[FLIP_FROM[beat]][1];
    flip = t;
  } else if (beat === 'uv') {
    page = SOURCES_PAGE;
  } else if (beat === 'closing' && t < 0.5) {
    page = LAST_PAGE;
    flip = 2 * t;
  }

  return { page, flip, ...sharedPose(timeline, q) };
}
