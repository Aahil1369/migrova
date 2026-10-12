'use client';

import { heroMrz } from './kit/heroMrz';
import { useHydrated } from './kit/useMediaQuery';
import { useSavedRoute } from './passport/useSavedRoute';

/**
 * The MRZ line under a tool page's headline (ToolHeader): the page's code letter and the route
 * saved on this device, e.g. V<MGV<<PAK<<CAN<<…. Decorative (aria-hidden; the navbar route pill
 * carries the route for everyone). Lives beside RoutePill rather than in kit/, because it reads
 * the saved route (passport/useSavedRoute), which the kit may not import. The server renders it
 * invisible; it fades in once the client has read the route, so it never flashes XXX first.
 */
export default function RouteMrz({ code }) {
  const route = useSavedRoute();
  const ready = useHydrated();
  return (
    <p className="kit-mrz" aria-hidden="true" data-ready={ready ? '' : undefined}>
      {heroMrz(code, route)}
    </p>
  );
}
