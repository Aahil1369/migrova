'use client';

import { memo, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRoute } from './PassportContext';
import { hasRoute, routeCodes, routeLabel, routeSpoken, sameRoute, saveRoute } from './routeStore';
import { stubState } from './passStub';
import { visaHref } from './search';
import { announceRouteChange, deviceStorage, useSavedRoute } from './useSavedRoute';
import { PlaneGlyph, ScissorsGlyph } from './parts/Glyphs';
import { REDUCED_MOTION, useHydrated, useMediaQuery } from './useMediaQuery';
import './stage.css';

const TEAR_MS = 700; // the stub's flight (CSS transition)
const ANNOUNCE_MS = 550; // the route pill appears as the stub vanishes


/**
 * The finale's boarding pass, from the current search (PassportContext): big ISO3 codes
 * `{FROM} ✈ {TO}` (ANY when unset), "GATE /match · SEAT 1A · BOARDING: when you're ready",
 * "Find my countries →" (/match) and "Check a visa" (/visa?from&to, empty parts left out).
 * The perforated stub is the ONLY way the route is saved: tearing it (or, in reduced motion,
 * "Remember this route") calls saveRoute(localStorage) and fires 'migrova:route' so the navbar
 * pill appears. Storage blocked -> the tear still plays and an aria-live note says so.
 * `passRef`: PassportStage slides the pass out of the book with the finale (opacity/transform).
 * `still`: the reduced-motion layouts, fade and stack (no tear animation).
 */
function BoardingPass({ passRef, still = false }) {
  // The root stays the same element (PassportStage styles it every frame); the pass itself
  // mounts right after hydration (it only shows in the finale), so its markup stays out of the
  // server HTML, which keeps the first layout, and so the hero's LCP, cheap.
  const hydrated = useHydrated();
  return (
    <div ref={passRef} className="bp">
      {hydrated ? <Pass still={still} /> : null}
    </div>
  );
}

function Pass({ still }) {
  const { route } = useRoute();
  const saved = useSavedRoute();
  const reducedMotion = useMediaQuery(REDUCED_MOTION, false);
  const quiet = still || reducedMotion;
  // { key, ok, done } for the last tear of this route (keyed, so a new search shows a fresh stub)
  const [tear, setTear] = useState(null);
  const noteRef = useRef(null);
  const timers = useRef([]);

  useEffect(
    () => () => {
      timers.current.forEach((id) => window.clearTimeout(id));
      timers.current = [];
    },
    [],
  );

  const key = routeLabel(route);
  const codes = routeCodes(route);
  const worth = hasRoute(route);
  const remembered = worth && sameRoute(saved, route);
  const state = stubState({ tear, key, remembered, routeComplete: worth, reduced: quiet });

  const save = (e) => {
    if (state.disabled || (state.view !== 'stub' && state.view !== 'button')) return;
    // The clicked button is about to be replaced (flying copy / "remembered" / the note): keep
    // keyboard focus on the note next to it, without scrolling the page.
    const hadFocus = typeof document !== 'undefined' && document.activeElement === e.currentTarget;
    const ok = saveRoute(deviceStorage(), route);
    setTear({ key, ok, done: quiet });
    if (hadFocus) noteRef.current?.focus({ preventScroll: true });
    if (quiet) {
      if (ok) announceRouteChange();
      return;
    }
    if (ok) timers.current.push(window.setTimeout(announceRouteChange, ANNOUNCE_MS));
    timers.current.push(
      window.setTimeout(() => setTear((t) => (t && t.key === key ? { ...t, done: true } : t)), TEAR_MS),
    );
  };

  let stub;
  if (state.view === 'flying') {
    stub = (
      <span className="bp-stub bp-stub--flying" aria-hidden="true">
        <span className="bp-stub-kicker">STUB</span>
        <span className="bp-stub-codes">
          {codes.from}→{codes.to}
        </span>
        <span className="bp-stub-cta">
          Tear to remember this route on this device <ScissorsGlyph />
        </span>
      </span>
    );
  } else if (state.view === 'remembered') {
    stub = (
      <span className="bp-stub-done">
        <b aria-hidden="true">✓</b> Remembered on this device
      </span>
    );
  } else if (state.view === 'failed') {
    stub = null; // the note explains
  } else if (state.view === 'button') {
    stub = (
      <button
        type="button"
        className="bp-remember"
        onClick={save}
        aria-disabled={state.disabled}
        aria-describedby={state.hint ? 'bp-hint' : undefined}
      >
        Remember this route
      </button>
    );
  } else {
    stub = (
      <button
        type="button"
        className="bp-stub"
        onClick={save}
        aria-disabled={state.disabled}
        aria-describedby={state.hint ? 'bp-hint' : undefined}
      >
        <span className="bp-stub-kicker" aria-hidden="true">
          STUB
        </span>
        <span className="bp-stub-codes" aria-hidden="true">
          {codes.from}→{codes.to}
        </span>
        <span className="bp-stub-cta">
          Tear to remember this route on this device <ScissorsGlyph />
        </span>
      </button>
    );
  }

  return (
    <>
      <div className="bp-ticket">
        <div className="bp-main">
          <p className="bp-kicker" aria-hidden="true">
            BOARDING PASS · MIGROVA
          </p>
          <p className="bp-codes">
            <span className="sr-only">Boarding pass: {routeSpoken(route)}</span>
            <span aria-hidden="true">{codes.from}</span>
            <span className="bp-plane" aria-hidden="true">
              <PlaneGlyph />
            </span>
            <span aria-hidden="true">{codes.to}</span>
          </p>
          <p className="bp-meta">
            GATE <b>/match</b> · SEAT <b>1A</b> · BOARDING: <b>when you&apos;re ready</b>
          </p>
          <div className="bp-actions">
            <Link href="/match" className="bp-btn bp-btn--primary">
              Find my countries →
            </Link>
            <Link href={visaHref(route)} className="bp-btn">
              Check a visa
            </Link>
          </div>
        </div>
        <div className="bp-stubslot">{stub}</div>
      </div>
      {state.hint ? (
        <p id="bp-hint" className="bp-hint">
          To remember a route, choose where you&apos;re from or going above.
        </p>
      ) : null}
      <p
        ref={noteRef}
        tabIndex={-1}
        className="bp-note"
        data-ok={state.noteOk === null ? undefined : String(state.noteOk)}
        aria-live="polite"
      >
        {state.note}
      </p>
    </>
  );
}

export default memo(BoardingPass);
