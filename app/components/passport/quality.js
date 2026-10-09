// Adaptive quality for the Journey Book. Pure and framework-free (unit-tested in
// scripts/passport/__tests__/quality.test.mjs). PassportStage samples rAF frame intervals while
// the user scrolls the book and writes the tier to .ps-stage[data-quality]; CSS drops extras:
//   high    everything
//   medium  no cover sheen / foil shimmer / hologram-seal spin
//   low     also no star twinkle / globe spin, no page shading (gutter shade, turn dim) or shadows
// The page flip and the book opening / closing are never dropped.

export const QUALITY = ['high', 'medium', 'low'];
const LOWEST = QUALITY[QUALITY.length - 1];
const MIN_FRAMES = 60;

/** Nearest-rank percentile of an ascending array (0 when empty). */
const rank = (sorted, q) => (sorted.length ? sorted[Math.max(0, Math.ceil(q * sorted.length) - 1)] : 0);

/**
 * Frame-interval stats (ms): p50 / p95, `vsync` (the display's frame interval, estimated from the
 * fastest 5% of frames) and fps (from the mean interval). Junk entries are ignored.
 */
export function frameStats(intervals) {
  const xs = (Array.isArray(intervals) ? intervals : [])
    .filter((x) => typeof x === 'number' && Number.isFinite(x) && x > 0)
    .sort((a, b) => a - b);
  if (!xs.length) return { count: 0, p50: 0, p95: 0, vsync: 0, fps: 0 };
  const mean = xs.reduce((sum, x) => sum + x, 0) / xs.length;
  return { count: xs.length, p50: rank(xs, 0.5), p95: rank(xs, 0.95), vsync: rank(xs, 0.05), fps: 1000 / mean };
}

/**
 * One step down when the active-scroll frames are clearly over budget, else `current`. Never
 * upgrades. Needs >= minFrames intervals. The budget is ~25ms (40fps), normalised for the
 * refresh rate: at least 1.5 display frames, so a 30 Hz Low Power Mode iPhone's steady 33ms
 * frames are not jank, while a 120 Hz phone gets no extra headroom for being fast. The display
 * frame is `vsync` (calibrated on idle frames, see createQualityMonitor) or the fastest frames
 * seen, whichever is shorter.
 */
export function decideQuality(intervals, current = 'high', { minFrames = MIN_FRAMES, budgetMs = 25, vsync = 0 } = {}) {
  const i = Math.max(0, QUALITY.indexOf(current));
  if (i === QUALITY.length - 1) return LOWEST;
  const stats = frameStats(intervals);
  if (stats.count < minFrames) return QUALITY[i];
  const display = vsync > 0 ? Math.min(vsync, stats.vsync) : stats.vsync;
  return stats.p95 > Math.max(budgetMs, 1.5 * display) ? QUALITY[i + 1] : QUALITY[i];
}

/**
 * Frame sampler: call activity() on every scroll event while the book is on screen; it records
 * rAF intervals until `idleMs` after the last one (the gap before a scroll starts is never a
 * sample) and calls onChange(tier) when decideQuality steps down. Evaluates every `every` new
 * frames over the last `window` frames; starts over after each step; stops at the lowest tier.
 * calibrate(): once, while the page is idle, times 12 frames to learn the display's frame
 * interval (median), so a device that is slow on every frame is not mistaken for a 30 Hz display.
 * raf / caf / now: requestAnimationFrame / cancelAnimationFrame / performance.now (same clock).
 */
export function createQualityMonitor({ raf, caf, now, onChange, tier = 'high', idleMs = 150, window = 90, every = 15 }) {
  let current = QUALITY.includes(tier) ? tier : 'high';
  let samples = [];
  let fresh = 0;
  let last = 0;
  let until = 0;
  let id = 0;
  let stopped = false;
  let vsync = 0;
  let calId = 0;

  const tick = (t) => {
    id = 0;
    if (stopped) return;
    if (last) {
      samples.push(t - last);
      if (samples.length > window) samples.shift();
      fresh += 1;
    }
    last = t;
    if (fresh >= every && samples.length >= MIN_FRAMES) {
      fresh = 0;
      const next = decideQuality(samples, current, { vsync });
      if (next !== current) {
        current = next;
        samples = [];
        onChange(current);
      }
    }
    if (t < until && current !== LOWEST) id = raf(tick);
    else last = 0; // the run is over: the next one starts fresh
  };

  return {
    activity() {
      if (stopped || current === LOWEST) return;
      until = now() + idleMs;
      if (!id) id = raf(tick);
    },
    calibrate(frames = 12) {
      if (stopped || calId) return;
      const stamps = [];
      const step = (t) => {
        calId = 0;
        if (stopped) return;
        stamps.push(t);
        if (stamps.length <= frames) {
          calId = raf(step);
          return;
        }
        const gaps = stamps.slice(1).map((x, k) => x - stamps[k]).sort((a, b) => a - b);
        vsync = gaps[gaps.length >> 1];
      };
      calId = raf(step);
    },
    tier: () => current,
    stop() {
      stopped = true;
      if (id) caf(id);
      if (calId) caf(calId);
      id = 0;
      calId = 0;
    },
  };
}
