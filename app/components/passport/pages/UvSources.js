'use client';

import { useEffect, useRef } from 'react';
import { countryByCode } from '../../../data/countries195';
import HologramSeal from '../parts/HologramSeal';
import { usePassport } from '../PassportContext';
import './pages.css';

const FALLBACK = 'ca';
const COUNT_MS = 1200;
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="#1f6f47" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="#1f6f47" strokeWidth="1.6" />
    </svg>
  );
}

/** Count `el`'s number up from 0 to `target` (rAF, ~1.2s). Returns a cancel function. */
function countUp(el, target) {
  const node = el.firstChild; // React's text node: update it in place, never replace it
  if (!node || !target) return () => {};
  let frame = 0;
  let start = 0;
  const tick = (now) => {
    if (!start) start = now;
    const t = Math.min(1, (now - start) / COUNT_MS);
    node.nodeValue = String(Math.round(target * easeOutCubic(t)));
    if (t < 1) frame = window.requestAnimationFrame(tick);
  };
  frame = window.requestAnimationFrame(tick);
  return () => {
    window.cancelAnimationFrame(frame);
    node.nodeValue = String(target);
  };
}

/**
 * p6, Official Sources (Step 1, no UV effect yet): hologram seal, the verified-link count
 * (counts up on arrival), the real official site for the search's To country (its verified
 * immigration authority, else Canada's) and the UV line.
 * `authorities`: { [code]: { name, url, domain } } computed on the server (sourcesSummary.js).
 */
export default function UvSources({ active = false, verifiedCount = 0, authorities = {} }) {
  const { route } = usePassport();
  const numberRef = useRef(null);

  useEffect(() => {
    const el = numberRef.current;
    if (!active || !el) return undefined;
    const still =
      el.closest('.jb-stack') ||
      (typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    if (still) return undefined;
    return countUp(el, verifiedCount);
  }, [active, verifiedCount]);

  const wanted = route?.to && route.to !== 'any' ? String(route.to).toLowerCase() : null;
  const code = wanted && authorities[wanted] ? wanted : authorities[FALLBACK] ? FALLBACK : Object.keys(authorities)[0];
  const site = code ? authorities[code] : null;
  const country = countryByCode(code);
  const wantedCountry = wanted && code !== wanted ? countryByCode(wanted) : null;

  return (
    <section id="sources" aria-labelledby="sources-h" tabIndex={-1} className="jbp jbp-sources">
      <h2 id="sources-h" className="jbp-title jbp-title--sm">Only the real government sites.</h2>
      <div className="jbp-sources-row">
        <span className="jbp-sources-seal" aria-hidden="true">
          <HologramSeal count={verifiedCount} label="VERIFIED" />
        </span>
        <p className="jbp-count">
          <b>
            <span ref={numberRef} aria-hidden="true">{verifiedCount}</span>
            <span className="sr-only">{verifiedCount}</span>
          </b>{' '}
          verified government links · 195 countries · 0 look-alikes
        </p>
      </div>
      {site && country ? (
        <>
          <p className="jbp-label jbp-site-cap">
            {wantedCountry
              ? `NO VERIFIED IMMIGRATION AUTHORITY LINK FOR ${wantedCountry.name.toUpperCase()} YET · EXAMPLE: ${country.name.toUpperCase()}`
              : `REAL SITE · ${country.name.toUpperCase()}`}
          </p>
          <a className="jbp-site" href={site.url} target="_blank" rel="noopener noreferrer">
            <span className="jbp-site-bar">
              <LockIcon />
              <span>{site.domain}</span>
            </span>
            <span className="jbp-site-body">
              <span className="jbp-site-name">{site.name}</span>
              <span className="jbp-site-ok">✓ Verified official site</span>
            </span>
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        </>
      ) : null}
      <p className="jbp-uvline">
        Border officers check documents under UV. <b>Migrova checks visa websites.</b>
      </p>
    </section>
  );
}
