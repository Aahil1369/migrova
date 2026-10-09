'use client';

import { useEffect, useLayoutEffect, useRef } from 'react';

const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0
const SNAP = 1e-4;

// useLayoutEffect warns on the server in older React; the server never runs effects anyway.
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

/**
 * Scroll progress through a tall section: 0 when its top reaches the top of the viewport, 1
 * when its bottom reaches the bottom of the viewport. Pure.
 */
export function scrollTarget({ scrollY, sectionTop, sectionHeight, viewportHeight }) {
  return clamp01((scrollY - sectionTop) / Math.max(1, sectionHeight - viewportHeight));
}

/** One easing step toward `target`; lands exactly on it once within 1e-4. Pure. */
export function easeStep(cur, target, ease) {
  const diff = target - cur;
  return Math.abs(diff) < SNAP ? target : cur + diff * ease;
}

/**
 * The hook's DOM-free core, so the loop can be unit-tested with a fake clock.
 *
 *   measure()  -> { top, height }       section document offset and height
 *   viewport() -> { scrollY, height }   current scroll position and viewport height
 *   isHidden() -> boolean               document.hidden (rAF does not run in hidden tabs)
 *   raf / caf                           requestAnimationFrame / cancelAnimationFrame
 *
 * start() measures and snaps to the current scroll position; sync() reads the scroll position
 * (call on scroll); remeasure() re-reads the section geometry first (call on resize); stop()
 * tears down. setOnFrame(fn) swaps the callback and, once started, immediately calls it with
 * the current progress: a settled loop would otherwise never feed a new callback.
 */
export function createScrollProgress({ measure, viewport, isHidden, raf, caf, onFrame, ease = 0.09 }) {
  const k = ease > 0 && ease <= 1 ? ease : 0.09;
  let frame = onFrame;
  let top = 0;
  let height = 0;
  let target = 0;
  let cur = null; // null until start()
  let rafId = 0;
  let stopped = false;

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
  const tick = () => {
    rafId = 0;
    if (stopped) return;
    const next = easeStep(cur, target, k);
    if (next !== cur) emit(next);
    if (cur !== target) rafId = raf(tick);
  };
  const sync = () => {
    if (stopped || cur === null) return;
    readTarget();
    if (isHidden()) emit(target); // rAF is paused: render now
    else if (!rafId) rafId = raf(tick);
  };

  return {
    start() {
      if (stopped) return;
      measureNow();
      readTarget();
      emit(target); // snap: no sweep when the page is restored mid-scroll
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
 * - rAF is paused in hidden tabs, so while `document.hidden` every scroll event snaps and
 *   calls `onFrame` immediately.
 * - The first frame on mount (before paint) snaps to the current scroll position.
 * - Callers get `onFrame(current p)` whenever the callback identity changes, even if the user
 *   has not scrolled (layout phase, before paint). To force a re-pose after the DOM it drives
 *   was swapped (e.g. a layout-mode switch), pass a new callback, such as a `useCallback`
 *   keyed on the layout mode. An inline callback is called again on every render.
 * - No React state is touched per frame; the hook returns nothing.
 */
export function useScrollProgress(sectionRef, onFrame, { ease = 0.09 } = {}) {
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
      ease,
    });
    controllerRef.current = controller;
    controller.start();

    const onScroll = () => controller.sync();
    const onResize = () => controller.remeasure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onResize) : null;
    observer?.observe(section);

    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onResize);
      observer?.disconnect();
      controller.stop();
      controllerRef.current = null;
    };
  }, [sectionRef, ease]);
}
