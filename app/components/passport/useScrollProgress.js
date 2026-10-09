'use client';

import { useEffect, useRef } from 'react';

const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0
const SNAP = 1e-4;

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
 * Drives `onFrame(p)` with a smoothed (eased) scroll progress for the element in `sectionRef`.
 *
 * - Reads the section's document offset and height on mount and again on window resize and
 *   whenever the section's own size changes (ResizeObserver).
 * - Runs a requestAnimationFrame loop only while the eased value is still catching up to the
 *   raw scroll position; the last frame lands exactly on the target.
 * - rAF is paused in hidden tabs, so while `document.hidden` every scroll event snaps and
 *   calls `onFrame` immediately.
 * - The first frame on mount snaps straight to the current scroll position (no sweep when the
 *   page is restored mid-scroll).
 * - `onFrame` is kept in a ref, so callers need not memoise it. No React state is touched per
 *   frame; the hook returns nothing.
 */
export function useScrollProgress(sectionRef, onFrame, { ease = 0.09 } = {}) {
  const frameRef = useRef(onFrame);
  useEffect(() => {
    frameRef.current = onFrame;
  });

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const k = ease > 0 && ease <= 1 ? ease : 0.09;

    let top = 0;
    let height = 0;
    let target = 0;
    let cur = 0;
    let raf = 0;

    const measure = () => {
      top = section.getBoundingClientRect().top + window.scrollY; // document offset
      height = section.offsetHeight;
    };
    const readTarget = () => {
      target = scrollTarget({
        scrollY: window.scrollY,
        sectionTop: top,
        sectionHeight: height,
        viewportHeight: window.innerHeight,
      });
    };

    const tick = () => {
      raf = 0;
      const next = easeStep(cur, target, k);
      if (next !== cur) {
        cur = next;
        frameRef.current(cur);
      }
      if (cur !== target) raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(tick);
    };
    const sync = () => {
      readTarget();
      if (document.hidden) {
        cur = target;
        frameRef.current(cur);
      } else {
        start();
      }
    };
    const remeasure = () => {
      measure();
      sync();
    };

    measure();
    readTarget();
    cur = target;
    frameRef.current(cur);

    window.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', remeasure);
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(remeasure) : null;
    observer?.observe(section);

    return () => {
      window.removeEventListener('scroll', sync);
      window.removeEventListener('resize', remeasure);
      observer?.disconnect();
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
    };
  }, [sectionRef, ease]);
}
