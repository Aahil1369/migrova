// Pose -> inline-style helpers for the Journey Book DOM rendered by Book.js / NightSky.js.
// Pure and framework-free. PassportStage feeds pose values (pose.js) in and writes the
// returned strings/numbers to the refs each animation frame; keeping the translateZ
// stacking, hinge and z-order rules here means they live next to the DOM they describe.

const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0
const seg = (v, from, to) => clamp01((v - from) / (to - from));

export const LEAF_Z_STEP = 1.2; // px between stacked leaves
export const FLIP_Z = 6; // px: a leaf mid-turn floats above both stacks
export const DIM_MAX = 0.35;

/**
 * Desktop leaf `index` (0 = cover/notice … 3 = sources/travellers) at `angle` degrees
 * (0 = lying on the right, -180 = turned to the left), from `pose.leaves[index]`.
 * Stacking is translateZ only: on the right the cover is highest, on the left lowest;
 * a leaf that is mid-turn sits at FLIP_Z. `dim` is the opacity for that leaf's
 * `[data-dim]` overlays (|sin(angle)| x 0.35).
 */
export function leafStyle(index, angle, count = 4) {
  const a = Number.isFinite(angle) ? angle : 0;
  const onLeft = a < -90;
  const flipping = a < -2 && a > -178;
  const z = flipping ? FLIP_Z : onLeft ? index * LEAF_Z_STEP : (count - index) * LEAF_Z_STEP;
  return {
    transform: `translateZ(${+z.toFixed(2)}px) rotateY(${+a.toFixed(3)}deg)`,
    dim: +(Math.abs(Math.sin((a * Math.PI) / 180)) * DIM_MAX).toFixed(3),
  };
}

/**
 * Horizontal offset (px) of the closed book from the centre: beside the hero copy, never
 * off the right edge. `pageWidth` = a leaf's offsetWidth (measure on resize, not per frame).
 */
export function closedShiftPx(viewportWidth, pageWidth) {
  return Math.max(0, Math.min(viewportWidth * 0.13, viewportWidth / 2 - pageWidth * 1.08));
}

/**
 * `refs.book` transform from desktopPose {shift, scale, tiltX, tiltY, flap} and closedShiftPx().
 * `flapPx` = the flap's width (refs.flap.current.offsetWidth, measured on resize): as the UV
 * flap opens the book slides left by flapPx/2 x pose.flap, so spread + open flap stays
 * centred (Ruling R11; the CSS clamps spread + flap to <= 96vw).
 */
export function bookTransform({ shift = 0, scale = 1, tiltX = 0, tiltY = 0, flap = 0 }, shiftPx, flapPx = 0) {
  const x = +(shift * shiftPx - (flapPx / 2) * clamp01(flap)).toFixed(2) || 0;
  return `translate3d(${x}px,0,0) rotateX(${+tiltX.toFixed(3)}deg) rotateY(${+tiltY.toFixed(3)}deg) scale(${+scale.toFixed(4)})`;
}

// The flap fades in over the first 15% of its swing, so its blank back face never pops in
// over the sources page.
const FLAP_FADE = 0.15;

/**
 * Fold-out flap on the sources page, from `pose.flap` (0 folded away … 1 fully open to the
 * right of the page). Opacity ramps 0 -> 1 over the first 15% of the swing; the flap only
 * takes pointer events once it is (nearly) open.
 */
export function flapStyle(flap) {
  const f = clamp01(flap);
  return {
    transform: `rotateY(${+(f * 180).toFixed(2)}deg)`,
    opacity: +clamp01(f / FLAP_FADE).toFixed(3),
    pointerEvents: f > 0.98 ? 'auto' : 'none',
  };
}

/**
 * Phones / lite: the UV check (`.jb-flap-inline`) folds out over the sources page body as
 * `pose.flap` rises. The page content fades out over the first half, then the UV check fades
 * in and slides up 24px over the second half, so the two are never both half-visible and only
 * one of them takes taps. Returns opacities for both plus the flap's transform/pointer-events.
 * `still` (the reduced-motion fade layout): the same crossfade without the slide.
 */
export function inlineFlapStyle(flap, still = false) {
  const f = clamp01(flap);
  const shown = seg(f, 0.5, 1);
  return {
    pageOpacity: +(1 - seg(f, 0, 0.5)).toFixed(3),
    opacity: +shown.toFixed(3),
    transform: still ? 'none' : `translate3d(0, ${+((1 - shown) * 24).toFixed(1)}px, 0)`,
    pointerEvents: shown > 0.5 ? 'auto' : 'none',
    pagePointerEvents: f < 0.5 ? 'auto' : 'none',
  };
}

/**
 * Phone notepad page `index` (0..8) for notepadPose {page, flip}. Pass `flip` already eased
 * (easeInOutCubic). The showing page lifts upward over its top hinge (rotateX 0 -> 180,
 * hidden past 90 by backface-visibility); the page underneath is page + 1, or the cover
 * after the last page. Every other page is transparent but stays focusable (opacity, not
 * visibility), so keyboard focus can still reach it and trigger the focus jump.
 */
export function notepadPageStyle(index, page, flip, count = 9) {
  const f = clamp01(flip);
  const under = (page + 1) % count;
  if (index === page) {
    return {
      transform: `perspective(1600px) rotateX(${+(f * 180).toFixed(2)}deg)`,
      opacity: 1,
      zIndex: 2,
      pointerEvents: f < 0.5 ? 'auto' : 'none',
      dim: +(Math.sin(f * Math.PI) * DIM_MAX).toFixed(3),
    };
  }
  if (index === under) {
    return {
      transform: 'none',
      opacity: 1,
      zIndex: 1,
      pointerEvents: f >= 0.5 ? 'auto' : 'none',
      dim: +((1 - f) * 0.2).toFixed(3),
    };
  }
  return { transform: 'none', opacity: 0, zIndex: 0, pointerEvents: 'none', dim: 0 };
}

/**
 * Lite mode page `index` (no 3D): the showing page slides up a little and fades out over the
 * page underneath. Same arguments and z-order rules as notepadPageStyle.
 */
export function litePageStyle(index, page, flip, count = 9) {
  const f = clamp01(flip);
  const under = (page + 1) % count;
  if (index === page) {
    return {
      transform: f > 0 ? `translateY(${+(-4 * f).toFixed(3)}%)` : 'none',
      opacity: +(1 - f).toFixed(3),
      zIndex: 2,
      pointerEvents: f < 0.5 ? 'auto' : 'none',
    };
  }
  if (index === under) {
    return { transform: 'none', opacity: 1, zIndex: 1, pointerEvents: f >= 0.5 ? 'auto' : 'none' };
  }
  return { transform: 'none', opacity: 0, zIndex: 0, pointerEvents: 'none' };
}

/**
 * Fade mode page `index` (reduced motion): opacity only, nothing moves. The showing page fades
 * out over the page underneath, which is already fully there. Same arguments and z-order rules
 * as notepadPageStyle.
 */
export function fadePageStyle(index, page, flip, count = 9) {
  const s = litePageStyle(index, page, flip, count);
  s.transform = 'none';
  return s;
}

/**
 * NightSky layer opacities for `pose.sky` (0 night … 1 daylight), Ruling R1: predawn is
 * fully in by 1/3, sunrise by 2/3, day by 0.9. The layers are opaque and stacked
 * night < predawn < (stars, globe) < sunrise < day, so only the upper layers fade in and
 * night stays at 1 (no see-through dip mid-crossfade).
 */
export function skyLayers(sky) {
  const s = clamp01(sky);
  return {
    night: 1,
    predawn: +seg(s, 0, 1 / 3).toFixed(3),
    sunrise: +seg(s, 1 / 3, 2 / 3).toFixed(3),
    day: +seg(s, 2 / 3, 0.9).toFixed(3),
  };
}

/**
 * The stars and the globe sit under the opaque sunrise layer: once it is fully in (sky >= 2/3)
 * they cannot be seen, so their loops pause (PassportStage writes .jb-sky[data-covered]).
 */
export function starsCovered(sky) {
  return skyLayers(sky).sunrise >= 1;
}

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
