'use client';

import { useMemo, useSyncExternalStore } from 'react';
import { readRoute, ROUTE_EVENT, ROUTE_KEY } from './routeStore';

/** window.localStorage, or null when the browser blocks it (Safari private mode, policies). */
export function deviceStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange) {
  window.addEventListener(ROUTE_EVENT, onChange);
  window.addEventListener('storage', onChange); // other tabs
  return () => {
    window.removeEventListener(ROUTE_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// The raw stored string is the snapshot: stable between reads, so React re-renders only when
// it really changes. Blocked storage -> null.
function rawSnapshot() {
  try {
    return deviceStorage()?.getItem(ROUTE_KEY) ?? null;
  } catch {
    return null;
  }
}

/**
 * The route saved on this device ({ from, to } or null), live: re-read on the 'migrova:route'
 * window event (tear / forget on this page) and on 'storage' (other tabs). Null on the server
 * and during hydration, so nothing that depends on it can mismatch.
 */
export function useSavedRoute() {
  const raw = useSyncExternalStore(subscribe, rawSnapshot, () => null);
  return useMemo(() => (raw === null ? null : readRoute({ getItem: () => raw })), [raw]);
}

/** Tell every listener on this page (route pill, boarding pass) that the saved route changed. */
export function announceRouteChange() {
  window.dispatchEvent(new Event(ROUTE_EVENT));
}
