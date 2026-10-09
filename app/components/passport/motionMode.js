// Journey Book motion tier and layout decisions. Pure and framework-free (unit-tested in
// scripts/passport/__tests__/layoutMode.test.mjs); useLayoutMode feeds them live signals.

const MOTIONS = ['full', 'lite', 'reduced'];
const finitePositive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

/**
 * Frame heights the books need. Both are sized from the frame height, and their pages (16px
 * text floor on the one-page book, 12px on the spread) would clip content that can't be
 * scrolled below these. Measured: the one-page book clips at 375x620 and fits at 375x640; the
 * spread fits down to 1024x600.
 *   tiny  (<= 560px): landscape phones, desktop zoom (200% on 1440x900 is 720x450)
 *   short (<  640px): small phones once the browser's toolbars are subtracted
 */
export const FRAME_QUERIES = Object.freeze({
  tiny: '(max-height: 560px)',
  short: '(max-height: 639px)',
});

/**
 * Pure motion-tier decision. Missing / unknown signals (undefined, null, NaN) never count as
 * "low-end": only a real signal can downgrade the experience.
 *
 *   override (valid ?motion= value) > reduced-motion preference > lite triggers > full
 */
export function decideMotion({
  override,
  reducedMotion,
  saveData,
  deviceMemory,
  coarsePointer,
  hardwareConcurrency,
} = {}) {
  if (MOTIONS.includes(override)) return override;
  if (reducedMotion === true) return 'reduced';
  if (saveData === true) return 'lite';
  if (finitePositive(deviceMemory) && deviceMemory <= 2) return 'lite';
  if (coarsePointer === true && finitePositive(hardwareConcurrency) && hardwareConcurrency <= 4) {
    return 'lite';
  }
  return 'full';
}

/**
 * Which Book layout to mount. Reduced motion, a tiny frame, or a short frame for a one-page
 * book -> 'stack' (pages in normal flow, nothing clipped); lite -> 'lite'; phone width ->
 * 'notepad'; otherwise the 3D 'spread'. `tiny` / `short` = FRAME_QUERIES matches.
 */
export function decideLayout({ motion, phone, tiny, short } = {}) {
  if (motion === 'reduced' || tiny === true) return 'stack';
  const onePage = motion === 'lite' || phone === true;
  if (onePage && short === true) return 'stack';
  if (motion === 'lite') return 'lite';
  return phone === true ? 'notepad' : 'spread';
}
