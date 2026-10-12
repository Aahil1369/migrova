'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * `matchMedia(query).matches`, live. Server render and hydration use `serverValue`, then the
 * real value (no hydration mismatch, no setState in an effect).
 */
export function useMediaQuery(query, serverValue = false) {
  const subscribe = useCallback(
    (onChange) => {
      if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {};
      const mql = window.matchMedia(query);
      if (mql.addEventListener) {
        mql.addEventListener('change', onChange);
        return () => mql.removeEventListener('change', onChange);
      }
      mql.addListener(onChange); // Safari < 14
      return () => mql.removeListener(onChange);
    },
    [query],
  );
  const getSnapshot = () =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia(query).matches
      : serverValue;
  return useSyncExternalStore(subscribe, getSnapshot, () => serverValue);
}

const noSubscribe = () => () => {};

/**
 * false on the server and during hydration, true right after (React re-renders once). For
 * decorative parts that are not visible at load: leaving them out of the server HTML keeps the
 * first layout (and so the hero's LCP) cheap, and they mount before anyone can scroll to them.
 */
export function useHydrated() {
  return useSyncExternalStore(noSubscribe, () => true, () => false);
}

export const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';
export const FINE_HOVER = '(hover: hover) and (pointer: fine)';
