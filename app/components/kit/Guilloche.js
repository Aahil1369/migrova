'use client';

import { useEffect, useRef } from 'react';
import { guillocheDataUri, rosetteDataUri } from './guillochePattern.js';

export { guillocheDataUri, rosetteDataUri };

/**
 * Decorative security-print layer (aria-hidden). The SVG data URI is generated once per seed
 * and applied on mount, so it never bloats the server HTML (spec: "generated once on mount").
 * `variant`: 'lines' (page guilloche) | 'rosette' (vignette / seal). Size and position it
 * with `className`.
 */
export default function Guilloche({ seed = 0, variant = 'lines', color, className = '' }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.backgroundImage = variant === 'rosette' ? rosetteDataUri(seed, color) : guillocheDataUri(seed);
  }, [seed, variant, color]);

  return <span ref={ref} aria-hidden="true" className={className} />;
}
