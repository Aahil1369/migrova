'use client';

import { useEffect, useState } from 'react';

const MOTIONS = ['full', 'lite', 'reduced'];
const finitePositive = (n) => typeof n === 'number' && Number.isFinite(n) && n > 0;

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

// SSR / first client render: identical on server and client, so hydration never mismatches.
const DEFAULT_MODE = Object.freeze({ motion: 'full', phone: false });

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
 * `{ motion: 'full' | 'lite' | 'reduced', phone: boolean }`.
 * Renders `{ motion: 'full', phone: false }` on the server and for the first client render,
 * then settles on the real values after mount and tracks changes (rotate, resize across
 * 768px, OS motion preference) without remounting.
 */
export function useLayoutMode() {
  const [mode, setMode] = useState(DEFAULT_MODE);

  useEffect(() => {
    const override = readOverride(); // read once
    const phoneQuery = window.matchMedia('(max-width: 767px)');
    const reducedQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const coarseQuery = window.matchMedia('(pointer: coarse)');

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
      };
      setMode((prev) => (prev.motion === next.motion && prev.phone === next.phone ? prev : next));
    };

    evaluate();
    const stops = [phoneQuery, reducedQuery, coarseQuery].map((mql) => listen(mql, evaluate));
    return () => stops.forEach((stop) => stop());
  }, []);

  return mode;
}
