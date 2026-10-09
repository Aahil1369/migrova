'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { forgetRoute, hasRoute, routeLabel, routeSpoken, ROUTE_EVENT } from './passport/routeStore';
import { visaHref } from './passport/search';
import { announceRouteChange, deviceStorage, useSavedRoute } from './passport/useSavedRoute';
import './RoutePill.css';

/**
 * The route saved on this device (by tearing the homepage boarding-pass stub), as a navbar pill:
 * "✈ PAK ✈ CAN" linking to /visa?from&to, plus ✕ "Forget my route". Renders nothing until the
 * client has read storage (no hydration mismatch), when nothing is saved, or when storage is
 * blocked. Follows 'migrova:route' (this page) and 'storage' (other tabs).
 *   tone    'night' | 'paper' (navbar tones)
 *   variant 'bar' (header; below 400px only the ✈ and ✕ show) | 'drawer' (mobile menu)
 */
export default function RoutePill({ tone = 'paper', variant = 'bar' }) {
  const saved = useSavedRoute();
  // Pop in only when the route arrives while this page is open (a tear), not on every page load.
  const [pop, setPop] = useState(false);
  useEffect(() => {
    const onRoute = () => setPop(true);
    window.addEventListener(ROUTE_EVENT, onRoute);
    return () => window.removeEventListener(ROUTE_EVENT, onRoute);
  }, []);

  if (!saved || !hasRoute(saved)) return null;
  const label = routeLabel(saved);
  const forget = () => {
    forgetRoute(deviceStorage());
    announceRouteChange();
  };

  return (
    <span
      key={label}
      className={`route-pill route-pill--${tone} route-pill--${variant}${pop ? ' route-pill--pop' : ''}`}
    >
      <Link
        href={visaHref(saved)}
        className="route-pill-link"
        aria-label={`Your saved route, ${routeSpoken(saved)}: check a visa`}
      >
        <span className="route-pill-icon" aria-hidden="true">
          ✈
        </span>
        <span className="route-pill-text" aria-hidden="true">
          {label}
        </span>
      </Link>
      <button type="button" className="route-pill-x" aria-label="Forget my route" onClick={forget}>
        <span aria-hidden="true">✕</span>
      </button>
    </span>
  );
}
