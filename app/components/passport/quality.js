// Adaptive quality for the Journey Book. Pure and framework-free (unit-tested in
// scripts/passport/__tests__/quality.test.mjs). PassportStage samples rAF frame intervals while
// the user scrolls the book and writes the tier to .ps-stage[data-quality]; CSS drops extras:
//   high    everything
//   medium  no cover sheen / foil shimmer / hologram-seal spin
//   low     also no star twinkle / globe spin, no page shading (gutter shade, turn dim) or shadows
// The page flip and the book opening / closing are never dropped.
//
// Only sustained jank steps down: over the last 2s of scrolling, every 0.5s slice has to spend at
// least a quarter of its time in frames over budget. Frames older than 2s are dropped, and a lone
// stall over 150ms between on-time frames (a GPU raster flush, a pipeline compile, a GC: nothing a
// tier can shed) is left out. A tier that was stepped down to gets one way back up after 4s of
// clean scrolling; stepped down to again, it stays (no oscillation).

export const QUALITY = ['high', 'medium', 'low'];
const LOWEST = QUALITY.length - 1;

export const TUNING = Object.freeze({
  budgetMs: 25, // a frame over ~25ms (40fps) is over budget...
  displayFrames: 1.5, // ...or over 1.5 display frames, whichever is longer
  slowestDisplayMs: 34, // no display refreshes slower than 30 Hz (Low Power Mode)
  windowMs: 2000, // only the last 2s of scrolling counts
  slices: 4, // ...in four 0.5s slices: jank has to show in every one
  minActiveMs: 250, // a slice is evidence once it holds this much scrolling
  jankShare: 0.25, // janky slice: >= 25% of its time in frames over budget
  cleanShare: 0.05, // clean slice: <= 5%
  stallMs: 150, // a frame this long between two on-time frames is a lone stall: left out
  recoverMs: 4000, // clean scrolling that earns a step back up (once per tier)
  everyMs: 250, // the monitor judges at most this often
});

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
 * The frame budget (ms) on a display refreshing every `display` ms: ~25ms (40fps), but at least
 * 1.5 display frames, so a 30 Hz Low Power Mode iPhone's steady 33ms frames are not jank, while a
 * 120 Hz phone gets no extra headroom for being fast. No display is slower than 30 Hz, so frames
 * that are all slow (a 5 fps device) never pass for a slow display.
 */
export function frameBudget(display, tuning = TUNING) {
  const frame = display > 0 ? Math.min(display, tuning.slowestDisplayMs) : 0;
  return Math.max(tuning.budgetMs, tuning.displayFrames * frame);
}

/** Back-to-back frame intervals -> samples [{ t, d }] (t: when the frame ended), from `start`. */
export function toSamples(intervals, start = 0) {
  let t = start;
  return intervals.map((d) => ({ t: (t += d), d }));
}

/**
 * Leaves out lone stalls: frames over `stallMs` whose neighbours (the frames just before and
 * after, where there are any) are within `budget`. A run of slow frames is kept whole.
 */
export function dropIsolatedStalls(samples, budget = TUNING.budgetMs, tuning = TUNING) {
  return samples.filter((s, i) => {
    if (s.d <= tuning.stallMs) return true;
    const prev = samples[i - 1];
    const next = samples[i + 1];
    return (prev !== undefined && prev.d > budget) || (next !== undefined && next.d > budget);
  });
}

/**
 * Verdict on the scrolling frames of the last `windowMs` before `now` (default: the last frame),
 * lone stalls left out (dropIsolatedStalls), split into `slices` equal slices. A slice is evidence once it holds
 * `minActiveMs` of frames. The display frame is the calibrated `vsync` or, if shorter or unknown,
 * the fastest 5% of the frames.
 *   janky  every slice is evidence and spends >= jankShare of its time in frames over budget
 *   clean  every slice is evidence and spends <= cleanShare of its time over budget
 *   dirty  some slice is evidence and spends more than cleanShare over budget
 * `shares` holds each slice's share (null: not enough scrolling in it).
 */
export function judgeFrames(samples, { now, vsync = 0, tuning } = {}) {
  const T = { ...TUNING, ...tuning };
  const list = (Array.isArray(samples) ? samples : []).filter(
    (s) => s && Number.isFinite(s.t) && Number.isFinite(s.d) && s.d > 0,
  );
  const end = Number.isFinite(now) ? now : list.length ? list[list.length - 1].t : 0;
  const from = end - T.windowMs;
  const inWindow = list.filter((s) => s.t > from && s.t <= end);
  const fastest = frameStats(inWindow.map((s) => s.d)).vsync;
  const display = vsync > 0 && (!fastest || vsync < fastest) ? vsync : fastest;
  const budget = frameBudget(display, T);
  const recent = dropIsolatedStalls(inWindow, budget, T);
  const len = T.windowMs / T.slices;
  const slices = Array.from({ length: T.slices }, () => ({ active: 0, over: 0 }));
  for (const s of recent) {
    const slice = slices[Math.min(T.slices - 1, Math.floor((s.t - from) / len))];
    slice.active += s.d;
    if (s.d > budget) slice.over += s.d;
  }
  const shares = slices.map((s) => (s.active >= T.minActiveMs ? s.over / s.active : null));
  return {
    budget,
    shares,
    janky: shares.every((x) => x !== null && x >= T.jankShare),
    clean: shares.every((x) => x !== null && x <= T.cleanShare),
    dirty: shares.some((x) => x !== null && x > T.cleanShare),
  };
}

/** One step down when judgeFrames finds sustained jank, else `current`. Never steps up by itself. */
export function decideQuality(samples, current = 'high', options = {}) {
  const i = Math.max(0, QUALITY.indexOf(current));
  if (i === LOWEST) return QUALITY[LOWEST];
  return judgeFrames(samples, options).janky ? QUALITY[i + 1] : QUALITY[i];
}

/**
 * Frame sampler: call activity() on every scroll event while the book is on screen; it records
 * rAF intervals until `idleMs` after the last one (the gap before a scroll starts is never a
 * sample), keeps the last `windowMs` of them and judges them every `everyMs`:
 *   - sustained jank (judgeFrames janky) steps one tier down;
 *   - below 'high', `recoverMs` of clean scrolling (back-to-back clean windows; a dirty one starts
 *     over, a pause does not) steps one tier back up, once per tier: `memory.retried` remembers
 *     it, so a tier stepped down to again stays.
 * Each step calls onChange(tier) and starts the samples over. Sampling stops once no step is left.
 * `memory` ({ tier, retried }) is mutated in place: hand the same object to the next monitor to
 * keep the tier across client navigation.
 * calibrate(): once, while the page is idle, times 12 frames to learn the display's frame
 * interval (median), so a device that is slow on every frame is not mistaken for a 30 Hz display.
 * raf / caf / now: requestAnimationFrame / cancelAnimationFrame / performance.now (same clock).
 */
export function createQualityMonitor({ raf, caf, now, onChange, memory = {}, idleMs = 150, tuning }) {
  const T = { ...TUNING, ...tuning };
  if (!QUALITY.includes(memory.tier)) memory.tier = 'high';
  if (!Array.isArray(memory.retried)) memory.retried = [];
  let samples = [];
  let last = 0;
  let until = 0;
  let id = 0;
  let stopped = false;
  let vsync = 0;
  let calId = 0;
  let judgedAt = -Infinity;
  let cleanWindows = 0;
  let cleanAt = -Infinity;

  const level = () => QUALITY.indexOf(memory.tier);
  const canDown = () => level() < LOWEST;
  const canUp = () => level() > 0 && !memory.retried.includes(memory.tier);
  const step = (by) => {
    if (by < 0) memory.retried.push(memory.tier); // its second chance is used up
    memory.tier = QUALITY[level() + by];
    samples = [];
    cleanWindows = 0;
    cleanAt = -Infinity;
    onChange(memory.tier);
  };
  const judge = (t) => {
    const verdict = judgeFrames(samples, { now: t, vsync, tuning: T });
    if (verdict.janky && canDown()) {
      step(1);
      return;
    }
    if (!canUp()) return;
    if (verdict.dirty) {
      cleanWindows = 0;
      cleanAt = -Infinity;
    } else if (verdict.clean && t - cleanAt >= T.windowMs) {
      cleanWindows += 1;
      cleanAt = t;
      if (cleanWindows * T.windowMs >= T.recoverMs) step(-1);
    }
  };

  const tick = (t) => {
    id = 0;
    if (stopped) return;
    if (last) samples.push({ t, d: t - last });
    last = t;
    let old = 0;
    while (old < samples.length && samples[old].t <= t - T.windowMs) old += 1;
    if (old) samples.splice(0, old);
    if (t - judgedAt >= T.everyMs) {
      judgedAt = t;
      judge(t);
    }
    if (t < until && (canDown() || canUp())) id = raf(tick);
    else last = 0; // the run is over: the next one starts fresh
  };

  return {
    activity() {
      if (stopped || !(canDown() || canUp())) return;
      until = now() + idleMs;
      if (!id) id = raf(tick);
    },
    calibrate(frames = 12) {
      if (stopped || calId) return;
      const stamps = [];
      const stepCal = (t) => {
        calId = 0;
        if (stopped) return;
        stamps.push(t);
        if (stamps.length <= frames) {
          calId = raf(stepCal);
          return;
        }
        const gaps = stamps
          .slice(1)
          .map((x, k) => x - stamps[k])
          .sort((a, b) => a - b);
        vsync = gaps[gaps.length >> 1];
      };
      calId = raf(stepCal);
    },
    tier: () => memory.tier,
    stop() {
      stopped = true;
      if (id) caf(id);
      if (calId) caf(calId);
      id = 0;
      calId = 0;
    },
  };
}
