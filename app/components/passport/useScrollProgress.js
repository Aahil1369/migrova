'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0

/** Lands exactly on the target once this close (progress units: ~0.6px of a desktop book). */
export const SNAP = 1e-4;
/** Longest frame the easing ever steps (ms): a tab switch or a long stall never jumps the book. */
export const MAX_DT = 50;
/**
 * Easing time constants (ms) per input. Wheel / mouse / keyboard: smooths 100px wheel steps
 * (half way in ~45ms, 95% in 3 tau). Touch: follows the finger closely.
 */
export const TAU = Object.freeze({ wheel: 65, touch: 35 });
const FRAME_MS = 1000 / 60; // until the display's frame interval is known

// useLayoutEffect warns on the server in older React; the server never runs effects anyway.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Scroll progress through a tall section: 0 when its top reaches the top of the viewport, 1
 * when its bottom reaches the bottom of the viewport. Pure.
 */
export function scrollTarget({ scrollY, sectionTop, sectionHeight, viewportHeight }) {
  return clamp01((scrollY - sectionTop) / Math.max(1, sectionHeight - viewportHeight));
}

/**
 * One frame of time-based easing toward `target`, `dt` ms after the previous frame:
 * alpha = 1 - exp(-dt / tau), dt capped at MAX_DT. Frame-rate independent: after the same time
 * the value is in the same place at 30, 60 or 120 Hz (a constant-speed scroll is trailed by
 * tau minus at most half a frame). Lands exactly on the target inside SNAP. Pure.
 */
export function easeToward(cur, target, dt, tau) {
  const diff = target - cur;
  if (Math.abs(diff) < SNAP) return target;
  const step = dt > 0 ? Math.min(dt, MAX_DT) : 0; // NaN / negative -> no time passed
  const next = cur + diff * (1 - Math.exp(-step / (tau > 0 ? tau : TAU.wheel)));
  return Math.abs(target - next) < SNAP ? target : next;
}

/**
 * The hook's DOM-free core, so the loop can be unit-tested with a fake clock.
 *
 *   measure()  -> { top, height }       section document offset and height
 *   viewport() -> { scrollY, height }   current scroll position and viewport height
 *   isHidden() -> boolean               document.hidden (rAF does not run in hidden tabs)
 *   raf / caf                           requestAnimationFrame / cancelAnimationFrame (frames are
 *                                       timed by the rAF timestamp)
 *
 * start() measures and snaps to the current scroll position; sync() reads the scroll position
 * (call on scroll); remeasure() re-reads the section geometry first (call on resize); stop()
 * tears down. setOnFrame(fn) swaps the callback and, once started, immediately calls it with
 * the current progress: a settled loop would otherwise never feed a new callback.
 * setInput('touch' | 'wheel') picks the easing time constant (TAU) for what scrolls the page.
 * The first frame of a run steps one display frame (learned from earlier runs; 1/60s at first).
 */
export function createScrollProgress({ measure, viewport, isHidden, raf, caf, onFrame }) {
  let frame = onFrame;
  let top = 0;
  let height = 0;
  let target = 0;
  let cur = null; // null until start()
  let rafId = 0;
  let stopped = false;
  let tau = TAU.wheel;
  let last = 0; // the previous frame's timestamp within this run (0: none yet)
  let frameMs = FRAME_MS; // the display's frame interval, smoothed

  const emit = (value) => {
    cur = value;
    frame(value);
  };
  const measureNow = () => {
    ({ top, height } = measure());
  };
  const readTarget = () => {
    const v = viewport();
    target = scrollTarget({
      scrollY: v.scrollY,
      sectionTop: top,
      sectionHeight: height,
      viewportHeight: v.height,
    });
  };
  const tick = (ts) => {
    rafId = 0;
    if (stopped) return;
    let dt = frameMs;
    if (Number.isFinite(ts)) {
      if (last) {
        dt = ts - last;
        if (dt > 0 && dt <= MAX_DT) frameMs += (dt - frameMs) * 0.3;
      }
      last = ts;
    }
    const next = easeToward(cur, target, dt, tau);
    if (next !== cur) emit(next);
    if (cur !== target) rafId = raf(tick);
    else last = 0; // settled: the next run starts fresh
  };
  const sync = () => {
    if (stopped || cur === null) return;
    readTarget();
    if (isHidden()) {
      emit(target); // rAF is paused: render now
      last = 0;
    } else if (!rafId) rafId = raf(tick);
  };

  return {
    start() {
      if (stopped) return;
      measureNow();
      readTarget();
      emit(target); // snap: no sweep when the page is restored mid-scroll
      last = 0;
    },
    sync,
    remeasure() {
      if (stopped) return;
      measureNow();
      sync();
    },
    setOnFrame(fn) {
      frame = fn;
      if (!stopped && cur !== null) fn(cur);
    },
    setInput(kind) {
      tau = kind === 'touch' ? TAU.touch : TAU.wheel;
    },
    current: () => cur,
    stop() {
      stopped = true;
      if (rafId) caf(rafId);
      rafId = 0;
    },
  };
}

/**
 * Drives `onFrame(p)` with a smoothed (eased) scroll progress for the element in `sectionRef`.
 *
 * - Reads the section's document offset and height on mount, on window resize and whenever the
 *   section's own size changes (ResizeObserver).
 * - Runs a requestAnimationFrame loop only while the eased value is still catching up to the
 *   raw scroll position; the last frame lands exactly on the target, then the loop idles.
 * - Time-based easing (easeToward): the same feel at any frame rate. The time constant follows
 *   the last input: a touch (pointerdown from a finger or pen) tightens it, a wheel, mouse or key
 *   press relaxes it (TAU).
 * - rAF is paused in hidden tabs, so while `document.hidden` every scroll event snaps and
 *   calls `onFrame` immediately.
 * - The first frame on mount (before paint) snaps to the current scroll position.
 * - Callers get `onFrame(current p)` whenever the callback identity changes, even if the user
 *   has not scrolled (layout phase, before paint). To force a re-pose after the DOM it drives
 *   was swapped (e.g. a layout-mode switch), pass a new callback, such as a `useCallback`
 *   keyed on the layout mode. An inline callback is called again on every render.
 * - No React state is touched per frame; the hook returns nothing.
 */
export function useScrollProgress(sectionRef, onFrame) {
  const onFrameRef = useRef(onFrame);
  const controllerRef = useRef(null);

  // Declared first so on mount it only records the callback; the controller does not exist yet.
  useIsoLayoutEffect(() => {
    onFrameRef.current = onFrame;
    controllerRef.current?.setOnFrame(onFrame);
  }, [onFrame]);

  useIsoLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;

    const controller = createScrollProgress({
      measure: () => ({
        top: section.getBoundingClientRect().top + window.scrollY, // document offset
        height: section.offsetHeight,
      }),
      viewport: () => ({ scrollY: window.scrollY, height: window.innerHeight }),
      isHidden: () => document.hidden,
      raf: (cb) => window.requestAnimationFrame(cb),
      caf: (id) => window.cancelAnimationFrame(id),
      onFrame: onFrameRef.current,
    });
    controllerRef.current = controller;
    controller.start();

    const onScroll = () => controller.sync();
    const onResize = () => controller.remeasure();
    const onPointer = (e) => controller.setInput(e.pointerType === 'mouse' ? 'wheel' : 'touch');
    const onWheelOrKey = () => controller.setInput('wheel');
    const passive = { passive: true, capture: true };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    window.addEventListener('pointerdown', onPointer, passive);
    window.addEventListener('wheel', onWheelOrKey, passive);
    window.addEventListener('keydown', onWheelOrKey, passive);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(section);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointerdown', onPointer, passive);
      window.removeEventListener('wheel', onWheelOrKey, passive);
      window.removeEventListener('keydown', onWheelOrKey, passive);
      observer?.disconnect();
      controller.stop();
      controllerRef.current = null;
    };
  }, [sectionRef]);
}
