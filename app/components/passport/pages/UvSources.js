'use client';

import { useEffect, useRef, useState } from 'react';
import { countryByCode } from '../../../data/countries195';
import HologramSeal from '../parts/HologramSeal';
import { useRoute } from '../PassportContext';
import { FINE_HOVER, useHydrated, useMediaQuery } from '../useMediaQuery';
import { fakeDomain } from './uv';
import './pages.css';

const FALLBACK = 'ca';
const COUNT_MS = 1200;
const OFFSCREEN = '-9999px';
const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

function LockIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
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
 * p6, Official Sources: hologram seal, the verified-link count (counts up on arrival) and the UV
 * line. The UV check itself (two site cards under a lamp) is <UvFlap/>: the fold-out flap in the
 * desktop spread, inline below this page's content in the other layouts.
 */
export default function UvSources({ active = false, verifiedCount = 0 }) {
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
      <p className="jbp-uvline">
        Border officers check documents under UV. <b>Migrova checks visa websites.</b>
      </p>
    </section>
  );
}

/** The real site for the search's To country (its verified immigration authority), else Canada's. */
function pickSite(route, authorities) {
  const wanted = route?.to && route.to !== 'any' ? String(route.to).toLowerCase() : null;
  const code = wanted && authorities[wanted] ? wanted : authorities[FALLBACK] ? FALLBACK : Object.keys(authorities)[0];
  const site = code ? authorities[code] : null;
  const country = countryByCode(code);
  const missing = wanted && code !== wanted ? countryByCode(wanted) : null;
  return site && country ? { site, country, missing } : null;
}

const HINT = {
  cursor: 'MOVE THE LAMP OVER BOTH SITES',
  scan: 'THE LAMP SCANS BOTH SITES',
  off: 'BOTH SITES UNDER THE LAMP',
};

/**
 * The UV check (fold-out flap content): two identical-looking site cards. The real one is the
 * verified official site (a real link); the fake one is an invented `<country>-visa-fastpass.example`
 * (plain text, FAKE EXAMPLE, never a link). Under UV the real card shows "✓ VERIFIED" and the fake
 * "✗ NOT OFFICIAL — charges extra fees".
 *   lamp 'cursor' (desktop spread, fine pointer): a lamp follows the pointer (CSS mask, --lx/--ly
 *        written in a rAF-throttled pointermove); falls back to 'scan' on touch screens
 *   lamp 'scan'   (phones / lite): a scanner band sweeps automatically (transform/opacity only)
 *   lamp 'off'    (reduced motion): both cards shown revealed, no lamp
 * PassportStage writes data-auto="0|1|2" on the root (cards auto-reveal as the UV beat holds);
 * "Show everything" (aria-pressed) reveals both. Screen readers always get the verdicts.
 */
export function UvFlap({ active = false, authorities = {}, lamp = 'cursor' }) {
  const { route } = useRoute();
  const fineHover = useMediaQuery(FINE_HOVER, true);
  // The UV layers, scanner band and lamp glow mount right after hydration: the flap is folded
  // away at load, and leaving them out of the server HTML keeps the first layout cheap.
  const hydrated = useHydrated();
  const mode = lamp === 'cursor' && !fineHover ? 'scan' : lamp;
  const [all, setAll] = useState(lamp === 'off');
  const rootRef = useRef(null);
  const glowRef = useRef(null);

  // Desktop lamp: follow the pointer while the page is on screen (no React state per move).
  useEffect(() => {
    const root = rootRef.current;
    if (mode !== 'cursor' || !active || all || !root) return undefined;
    const layers = [...root.querySelectorAll('.uvc-uv--lamp')];
    const glow = glowRef.current;
    let frame = 0;
    let x = -1e5;
    let y = -1e5;
    const paint = () => {
      frame = 0;
      for (const el of layers) {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--lx', `${(x - r.left).toFixed(1)}px`);
        el.style.setProperty('--ly', `${(y - r.top).toFixed(1)}px`);
      }
      if (glow) {
        const r = root.getBoundingClientRect();
        glow.style.transform = `translate3d(${(x - r.left).toFixed(1)}px, ${(y - r.top).toFixed(1)}px, 0)`;
      }
    };
    const onMove = (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!frame) frame = window.requestAnimationFrame(paint);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) window.cancelAnimationFrame(frame);
      for (const el of layers) {
        el.style.setProperty('--lx', OFFSCREEN);
        el.style.setProperty('--ly', OFFSCREEN);
      }
      if (glow) glow.style.transform = '';
    };
  }, [mode, active, all, hydrated]);

  const pick = pickSite(route, authorities);
  if (!pick) return null;
  const { site, country, missing } = pick;
  const fake = fakeDomain(country.name);
  const caption = missing
    ? `NO VERIFIED IMMIGRATION AUTHORITY LINK FOR ${missing.name.toUpperCase()} YET · EXAMPLE: ${country.name.toUpperCase()}`
    : `${country.name.toUpperCase()} · ONE REAL, ONE FAKE`;

  return (
    <div
      ref={rootRef}
      className="jbp-uv"
      data-uv=""
      data-mode={mode}
      data-all={all ? 'true' : 'false'}
      data-active={active ? 'true' : 'false'}
      role="group"
      aria-labelledby="uv-h"
    >
      <h3 id="uv-h" className="jbp-label jbp-uv-h">
        UV CHECK<span aria-hidden="true"> · {HINT[mode] || HINT.off}</span>
      </h3>
      <p className="jbp-label jbp-uv-cap">{caption}</p>
      <div className="jbp-uv-cards">
        <div className="uvc uvc--real">
          <a className="uvc-body" href={site.url} target="_blank" rel="noopener noreferrer">
            <span className="uvc-face">
              <span className="uvc-bar">
                <LockIcon />
                <span className="uvc-domain">{site.domain}</span>
              </span>
              <span className="uvc-title" aria-hidden="true">Apply for a visa</span>
              <span className="uvc-desc" aria-hidden="true">Official immigration services for visitors, students and workers.</span>
              <span className="uvc-cta" aria-hidden="true">Apply now →</span>
            </span>
            {hydrated ? (
              <>
                <span className="uvc-uv uvc-uv--lamp" aria-hidden="true">
                  <span className="uvc-uvdomain">{site.domain}</span>
                  <b className="uvc-uvname">{site.name}</b>
                  <span className="uvc-seal uvc-seal--ok">✓ VERIFIED</span>
                </span>
                <span className="uvc-uv uvc-uv--full">
                  <span className="uvc-uvdomain" aria-hidden="true">{site.domain}</span>
                  <b className="uvc-uvname">{site.name}</b>
                  <span className="uvc-seal uvc-seal--ok">✓ VERIFIED</span>
                </span>
              </>
            ) : (
              <span className="sr-only"> {site.name}, verified official site</span>
            )}
            <span className="sr-only"> (official site, opens in a new tab)</span>
          </a>
        </div>
        <div className="uvc uvc--fake">
          <span className="uvc-badge">FAKE EXAMPLE</span>
          <div className="uvc-body">
            <span className="uvc-face">
              <span className="uvc-bar">
                <LockIcon />
                <span className="uvc-domain">{fake}</span>
              </span>
              <span className="uvc-title" aria-hidden="true">Apply for a visa</span>
              <span className="uvc-desc" aria-hidden="true">Official immigration services for visitors, students and workers.</span>
              <span className="uvc-cta" aria-hidden="true">Apply now →</span>
            </span>
            {hydrated ? (
              <>
                <span className="uvc-uv uvc-uv--lamp" aria-hidden="true">
                  <span className="uvc-uvdomain">{fake}</span>
                  <b className="uvc-uvname">Not a government site</b>
                  <span className="uvc-seal uvc-seal--bad">✗ NOT OFFICIAL — charges extra fees</span>
                </span>
                <span className="uvc-uv uvc-uv--full">
                  <span className="uvc-uvdomain" aria-hidden="true">{fake}</span>
                  <b className="uvc-uvname">Not a government site</b>
                  <span className="uvc-seal uvc-seal--bad">✗ NOT OFFICIAL — charges extra fees</span>
                </span>
              </>
            ) : (
              <span className="sr-only"> Not a government site: not official, charges extra fees</span>
            )}
          </div>
        </div>
        {hydrated ? <span className="jbp-uv-band" aria-hidden="true" /> : null}
      </div>
      <button type="button" className="jbp-uv-toggle" aria-pressed={all} onClick={() => setAll((on) => !on)}>
        Show everything
      </button>
      {hydrated ? <span ref={glowRef} className="jbp-uv-glow" aria-hidden="true" /> : null}
    </div>
  );
}
