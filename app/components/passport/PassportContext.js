'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const PassportContext = createContext(null);

// { from, to }: country codes or null; `to` may also be 'any'. Anything else -> null.
function normalizeRoute(route) {
  const pick = (value) => (typeof value === 'string' && value.trim() ? value.trim() : null);
  return { from: pick(route?.from), to: pick(route?.to) };
}

/**
 * Shared Journey Book state:
 *   route     { from, to } — the current search (codes or null; `to` may be 'any')
 *   setRoute  (route | prev => route) — normalised to the shape above
 *   active    Set of PAGES ids currently on screen (starts as {'cover'})
 *   setActive (Set | prev => Set) — call only when the set really changes
 */
export function PassportProvider({ initialRoute, children }) {
  const [route, setRouteState] = useState(() => normalizeRoute(initialRoute));
  const [active, setActive] = useState(() => new Set(['cover']));

  const setRoute = useCallback((next) => {
    setRouteState((prev) => normalizeRoute(typeof next === 'function' ? next(prev) : next));
  }, []);

  const value = useMemo(() => ({ route, setRoute, active, setActive }), [route, setRoute, active]);
  return <PassportContext.Provider value={value}>{children}</PassportContext.Provider>;
}

/** The PassportProvider value. Throws when used outside the provider. */
export function usePassport() {
  const value = useContext(PassportContext);
  if (!value) {
    throw new Error('usePassport() must be used inside <PassportProvider> (app/components/passport/PassportContext.js).');
  }
  return value;
}
