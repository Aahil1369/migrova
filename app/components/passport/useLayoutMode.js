'use client';

import { useEffect, useState } from 'react';
import { decideMotion, FRAME_QUERIES } from './motionMode.js';

export { decideMotion };

const MOTIONS = ['full', 'lite', 'reduced'];

// SSR / first client render: identical on server and client, so hydration never mismatches.
const DEFAULT_MODE = Object.freeze({ motion: 'full', phone: false, tiny: false, short: false });

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
 * `{ motion: 'full' | 'lite' | 'reduced', phone: boolean, tiny: boolean, short: boolean }`
 * (tiny / short: FRAME_QUERIES). Renders `{ motion: 'full', phone: false, tiny: false, short: false }`
 * on the server and for the first
 * client render, then settles on the real values after mount and tracks changes (rotate,
 * resize across 768px or the short-frame height, zoom, OS motion preference) without
 * remounting. Pick the Book layout with decideLayout(mode) (motionMode.js).
 */
export function useLayoutMode() {
  const [mode, setMode] = useState(DEFAULT_MODE);

  useEffect(() => {
    const override = readOverride(); // read once
    const phoneQuery = window.matchMedia('(max-width: 767px)');
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');
    const tinyQuery = window.matchMedia(FRAME_QUERIES.tiny);
    const shortQuery = window.matchMedia(FRAME_QUERIES.short);

    const evaluate = () => {
      const nav = typeof navigator === 'undefined' ? {} : navigator;
      const next = {
        motion: decideMotion({
          override,
          reducedMotion: reducedQuery.matches,
          saveData: nav.connection?.saveData,
          deviceMemory: nav.deviceMemory,
          coarsePointer: coarseQuery.matches,
          hardwareConcurrency: nav.hardwareConcurrency,
        }),
        phone: phoneQuery.matches,
        tiny: tinyQuery.matches,
        short: shortQuery.matches,
      };
      setMode((prev) =>
        prev.motion === next.motion && prev.phone === next.phone && prev.tiny === next.tiny && prev.short === next.short
          ? prev
          : next,
      );
    };

    evaluate();
    const stops = [phoneQuery, reducedQuery, coarseQuery, tinyQuery, shortQuery].map((mql) => listen(mql, evaluate));
    return () => stops.forEach((stop) => stop());
  }, []);

  return mode;
}
