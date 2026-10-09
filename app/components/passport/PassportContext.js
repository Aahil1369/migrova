'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// Two contexts, so the (frequent) `active` page-set changes never re-render route-only
// consumers such as JourneySearch (196 <option>s x2) or the boarding pass.
const RouteContext = createContext(null);
const ActiveContext = createContext(null);

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
 * useRoute() / useActive() subscribe to one half each; usePassport() to both.
 */
export function PassportProvider({ initialRoute, children }) {
  const [route, setRouteState] = useState(() => normalizeRoute(initialRoute));
  const [active, setActive] = useState(() => new Set(['cover']));

  const setRoute = useCallback((next) => {
    setRouteState((prev) => normalizeRoute(typeof next === 'function' ? next(prev) : next));
  }, []);

  const routeValue = useMemo(() => ({ route, setRoute }), [route, setRoute]);
  const activeValue = useMemo(() => ({ active, setActive }), [active]);
  return (
    <RouteContext.Provider value={routeValue}>
      <ActiveContext.Provider value={activeValue}>{children}</ActiveContext.Provider>
    </RouteContext.Provider>
  );
}

function required(value, hook) {
  if (!value) {
    throw new Error(`${hook}() must be used inside <PassportProvider> (app/components/passport/PassportContext.js).`);
  }
  return value;
}

/** { route, setRoute }. Re-renders only when the route changes. Throws outside the provider. */
export function useRoute() {
  return required(useContext(RouteContext), 'useRoute');
}

/** { active, setActive }. Throws outside the provider. */
export function useActive() {
  return required(useContext(ActiveContext), 'useActive');
}

/** The whole PassportProvider value { route, setRoute, active, setActive }. Throws outside the provider. */
export function usePassport() {
  const routeValue = required(useContext(RouteContext), 'usePassport');
  const activeValue = required(useContext(ActiveContext), 'usePassport');
  return { ...routeValue, ...activeValue };
}
