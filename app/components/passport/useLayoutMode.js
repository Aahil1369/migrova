'use client';

import { useEffect, useLayoutEffect, useState } from 'react';
import { decideMotion, FRAME_QUERIES } from './motionMode.js';

export { decideMotion };

const MOTIONS = ['full', 'lite', 'reduced'];
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

// SSR / first client render: identical on server and client, so hydration never mismatches.
// (Until `settled`, stage.css / passport.css lay the server HTML out with FRAME_QUERIES.)
const DEFAULT_MODE = Object.freeze({ motion: 'full', phone: false, roomy: true, tiny: false, settled: false });

function readOverride() {
  try {
    const value = new URLSearchParams(window.location.search).get('motion');
    return MOTIONS.includes(value) ? value : null;
  } catch {
    return null;
  }
}

function listen(mql, handler) {
  if (mql.addEventListener) {
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }
  mql.addListener(handler); // Safari < 14
  return () => mql.removeListener(handler);
}

/**
 * `{ motion: 'full' | 'lite' | 'reduced', phone, roomy, tiny, settled }` (phone / roomy / tiny:
 * FRAME_QUERIES). Renders DEFAULT_MODE on the server and for the hydration render, then settles
 * on the real values in a layout effect — before the hydrated page is painted again — and tracks
 * changes (rotate, resize across a frame threshold, zoom, OS motion preference). Pick the Book
 * layout with decideLayout(mode) (motionMode.js). `settled` turns true with the first real values.
 */
export function useLayoutMode() {
  const [mode, setMode] = useState(DEFAULT_MODE);

  useIsoLayoutEffect(() => {
    const override = readOverride(); // read once
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const queries = Object.entries(FRAME_QUERIES).map(([key, query]) => [key, window.matchMedia(query)]);

    const evaluate = () => {
      const nav = typeof navigator === 'undefined' ? {} : navigator;
      const next = {
        motion: decideMotion({ override, reducedMotion: reducedQuery.matches, deviceMemory: nav.deviceMemory }),
        settled: true,
      };
      for (const [key, mql] of queries) next[key] = mql.matches;
      setMode((prev) => (Object.keys(next).every((k) => prev[k] === next[k]) ? prev : next));
    };

    evaluate();
    const stops = [reducedQuery, ...queries.map(([, mql]) => mql)].map((mql) => listen(mql, evaluate));
    return () => stops.forEach((stop) => stop());
  }, []);

  return mode;
}
