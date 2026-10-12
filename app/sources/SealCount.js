'use client';

import { useEffect, useRef } from 'react';
import HologramSeal from '../components/kit/HologramSeal';
import { countUp } from '../components/kit/countUp';
import { useInView } from '../components/kit/useInView';

/**
 * The hologram seal on /sources (decorative, aria-hidden: the page prints the same total as text
 * beside it). Its number counts up from 0 to `total` once, the first time the seal scrolls into
 * view; the server HTML already holds the final number, and reduced motion keeps it. The ring's
 * slow turn (an ambient loop) pauses while the seal is off screen (sources.css, data-offscreen).
 */
export default function SealCount({ total, label = 'VERIFIED LINKS' }) {
  const ref = useRef(null);
  const arrived = useInView(ref);
  const onScreen = useInView(ref, { once: false, rootMargin: '0px' });

  useEffect(() => {
    const number = arrived ? ref.current?.querySelector('.jb-seal-core b') : null;
    if (!number) return undefined;
    if (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    return countUp(number, total);
  }, [arrived, total]);

  return (
    <span ref={ref} className="src-seal" aria-hidden="true" data-offscreen={onScreen ? undefined : ''}>
      <HologramSeal count={total} label={label} />
    </span>
  );
}
