'use client';

import { useEffect, useRef } from 'react';
import './kit.css';

const ANNOUNCE_MS = 100; // let the empty live region reach the accessibility tree first

/**
 * Wraps an AI result as it arrives: a <section> labelled by the result heading (the element
 * with `id`, inside `children`). On mount it moves focus to that heading (made focusable with
 * tabindex="-1") and scrolls it to the top of the view, just under the sticky navbar
 * (scroll-margin-top in kit.css), so the result's moment plays on screen; smooth, or at once
 * under reduced motion. Then it announces `label` (e.g. "Your visa report is ready") in a
 * polite live region. Mount it once per result: give it a new `key` for a new one.
 * The result's own moment (MRZ decode, stamp) is played by the children.
 */
export function ResultArrival({ id, label, children }) {
  const liveRef = useRef(null);

  useEffect(() => {
    const heading = document.getElementById(id);
    if (heading) {
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      // A focus scroll only brings the heading to the nearest edge (the bottom, coming from the
      // form above), which would leave the result itself below the fold: scroll it to the top.
      heading.focus({ preventScroll: true });
      heading.scrollIntoView({ block: 'start' });
    }
    const live = liveRef.current;
    const timer = window.setTimeout(() => {
      if (live) live.textContent = label;
    }, ANNOUNCE_MS);
    return () => {
      window.clearTimeout(timer);
      if (live) live.textContent = '';
    };
  }, [id, label]);

  return (
    <section className="kit-arrival" aria-labelledby={id}>
      <p ref={liveRef} className="sr-only" role="status" aria-live="polite" />
      {children}
    </section>
  );
}

export default ResultArrival;
