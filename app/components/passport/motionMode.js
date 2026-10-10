// Journey Book motion tier and layout decisions. Pure and framework-free (unit-tested in
// scripts/passport/__tests__/layoutMode.test.mjs); useLayoutMode feeds them live signals, and
// stage.css / passport.css repeat FRAME_QUERIES so the server HTML is already laid out right.

const MOTIONS = ['full', 'lite', 'reduced'];
const finitePositive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * The frame geometry the books are laid out for (px). The one-page book and the spread are laid
 * out at no less than their design width (the narrowest page whose content fits at its text
 * floor, measured with the longest country names and two stories) and scaled down in CSS to fit
 * the frame below the navbar (passport.css: --jb-design-pw, `100svh - 97px`, 85px).
 *   onePage      phones (< 768px wide), 16px floor: content fits from 310px
 *   onePageWide  >= 768px wide (desktop page rhythm, 7-line stories), 16px floor: fits from 370px
 *   spread       12px floor, UV flap included: fits from 326px
 *   minScale     the one-page book may shrink to 13px effective body text (16px x 13/16)
 *   phoneCopy    the shortest phone frame whose hero (at load and once the stage sticks) and
 *                finale + boarding pass fit below the navbar (stage.css short-phone rules):
 *                fits at 500px, overflows at 480px
 *   shortPhone   phone frames up to this tall get those short-phone rules (SHORT_PHONE_QUERY)
 */
export const FRAME = Object.freeze({
  navbar: 73,
  gap: 12,
  aspect: 1.42,
  onePage: 320,
  onePageWide: 380,
  spread: 330,
  minScale: 13 / 16,
  phoneCopy: 500,
  shortPhone: 610,
});

const CLEAR = FRAME.navbar + 2 * FRAME.gap; // frame height the books never use
const PHONE_MAX_W = 767;
// The spread: two design pages + the 0.6-page UV flap within 96vw, a design page below the navbar.
const ROOMY_W = Math.ceil((2.6 * FRAME.spread) / 0.96);
const ROOMY_H = Math.ceil(FRAME.spread * FRAME.aspect + CLEAR);
// Below these the scaled one-page book would go under 13px body text: stack instead.
const TINY_W = Math.ceil(FRAME.minScale * FRAME.onePage + 32) - 1; // 32 = the side gutters
const TINY_H = Math.max(Math.floor(FRAME.minScale * FRAME.onePage * FRAME.aspect + CLEAR), FRAME.phoneCopy - 1);
const TINY_H_WIDE = Math.floor(FRAME.minScale * FRAME.onePageWide * FRAME.aspect + CLEAR);

/**
 *   phone  one-page layouts only (the spread needs the width)
 *   roomy  the spread fits at its design size below the navbar, UV flap included
 *   tiny   even the scaled one-page book would be unreadable, or the hero / finale copy would
 *          not fit beside it (landscape phones, heavy zoom)
 */
export const FRAME_QUERIES = Object.freeze({
  phone: `(max-width: ${PHONE_MAX_W}px)`,
  roomy: `(min-width: ${ROOMY_W}px) and (min-height: ${ROOMY_H}px)`,
  tiny:
    `(max-width: ${TINY_W}px), (max-width: ${PHONE_MAX_W}px) and (max-height: ${TINY_H}px), ` +
    `(min-width: ${PHONE_MAX_W + 1}px) and (max-height: ${TINY_H_WIDE}px)`,
});

/**
 * The phone frames whose hero / finale copy gets the tight short-phone type on the sticky stage
 * (stage.css, `.ps-stage ...`). Starts just past the tiny phone frames (too narrow or too short):
 * those stack, and the stack has no .ps-stage, so tight type there would apply only until the
 * layout settles and the hero would reflow when it does. Not part of FRAME_QUERIES (useLayoutMode
 * subscribes to those): no layout decision depends on it.
 */
export const SHORT_PHONE_QUERY =
  `(min-width: ${TINY_W + 1}px) and (max-width: ${PHONE_MAX_W}px) and ` +
  `(min-height: ${TINY_H + 1}px) and (max-height: ${FRAME.shortPhone}px)`;

/** FRAME_QUERIES evaluated for a viewport of `width` x `height` CSS px. Pure. */
export function frameFlags(width, height) {
  const phone = width <= PHONE_MAX_W;
  return {
    phone,
    roomy: width >= ROOMY_W && height >= ROOMY_H,
    tiny: width <= TINY_W || height <= (phone ? TINY_H : TINY_H_WIDE),
  };
}

/**
 * The CSS scale of the one-page book in a `width` x `height` frame (passport.css .jb-pad): its
 * page is laid out at max(design width, the natural min(100vw - 32px, 70svh / 1.42)) and shrunk
 * to fit below the navbar and between the side gutters. Effective body text = 16px x scale.
 */
export function onePageScale(width, height) {
  const design = width <= PHONE_MAX_W ? FRAME.onePage : FRAME.onePageWide;
  const pw = Math.max(design, Math.min(width - 32, (0.7 * height) / FRAME.aspect));
  return Math.min(1, (height - CLEAR) / (pw * FRAME.aspect), (width - 32) / pw);
}

/**
 * The book's fit scale (passport.css --jb-fit, written by PassportStage): shrink to fit below the
 * navbar and, for one-page books, between the 16px side gutters; never above 1. `vw` / `svh` are
 * the frame (100vw / 100svh in px), `pw` / `ph` a page's laid-out size. Computed here rather than
 * in CSS: WebKit resolves the CSS-trig division (tan(atan2(a, b))) to a wrong, negative scale,
 * which turned the book upside down on iPhones. Missing / junk sizes -> 1 (unscaled), and the
 * result is never zero or negative. Pure.
 */
export function bookFit({ spread, vw, svh, pw, ph } = {}) {
  if (!finitePositive(vw) || !finitePositive(svh) || !finitePositive(pw) || !finitePositive(ph)) return 1;
  let fit = Math.min(1, (svh - CLEAR) / ph);
  if (!spread) fit = Math.min(fit, (vw - 32) / pw);
  return fit > 0 ? +fit.toFixed(4) : 1;
}

/**
 * Pure motion-tier decision. Missing / unknown signals (undefined, null, NaN) never count as
 * "low-end": only a real signal can downgrade the experience.
 *
 *   override (valid ?motion= value) > reduced-motion preference > <= 2GB device memory > full
 *
 * Core count, touch and Save-Data are deliberately ignored: WebKit reports 4 cores on every
 * iPhone, and Save-Data is about bytes, not CPU. Slow devices are handled at run time by the
 * adaptive quality tiers instead (quality.js).
 */
export function decideMotion({ override, reducedMotion, deviceMemory } = {}) {
  if (MOTIONS.includes(override)) return override;
  if (reducedMotion === true) return 'reduced';
  if (finitePositive(deviceMemory) && deviceMemory <= 2) return 'lite';
  return 'full';
}

/**
 * Which Book layout to mount from the motion tier and the FRAME_QUERIES flags:
 *   tiny -> 'stack' (pages in normal flow); reduced -> 'fade' (one page at a time, opacity only);
 *   lite -> 'lite'; a phone or a frame without room for the spread -> 'notepad' (scaled to
 *   fit); otherwise the 3D 'spread'.
 */
export function decideLayout({ motion, phone, roomy, tiny } = {}) {
  if (tiny === true) return 'stack';
  if (motion === 'reduced') return 'fade';
  if (motion === 'lite') return 'lite';
  return phone === true || roomy === false ? 'notepad' : 'spread';
}
