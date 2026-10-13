'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Stamp } from '../components/kit/Stamp';
import { STAMP_INKS } from '../components/kit/stampInks';
import { PlaneGlyph } from '../components/kit/Glyphs';
import { useInView } from '../components/kit/useInView';
import { ROUTE_BOX, ROUTE_LENGTH, ROUTE_PATH, stampFace, stampSlots } from '../lib/match';

export const STAMP_GAP_MS = 180; // one stamp lands after another
const FIRST_MS = 100; // the first lands as the line reaches it (the line takes 950ms, match.css)
const START_MS = 150; // once on screen, let the arrival scroll settle first

// Best match first, as in the approved route-of-stamps mockup.
const INKS = [STAMP_INKS.green, STAMP_INKS.blue, STAMP_INKS.purple, STAMP_INKS.gold, STAMP_INKS.terracotta];

const VIEW_BOX = `0 0 ${ROUTE_BOX.w} ${ROUTE_BOX.h}`;

const scoreWords = (score) => (typeof score === 'number' ? String(score) : 'not given');

/**
 * Country Match's signature moment: the dashed route (ROUTE_PATH) draws itself (stroke-dashoffset)
 * and one match-score stamp per match (at most five, stampFace: our country name + the score,
 * STAMP_INKS) lands on it after another, 180ms apart, once, when the route first comes on
 * screen. Each stamp is a <button> named "Set <country> as my destination, match score <n>";
 * a tap calls `onPick(match)` (the page saves the route; nothing is saved without a tap). The
 * stamp of the saved destination (`picked`, a country code) wears a plane pin and is described as
 * "Your destination". Reduced motion: the route and stamps show at once.
 */
export default function MatchRoute({ matches = [], onPick, picked }) {
  const ref = useRef(null);
  const inView = useInView(ref);
  const [landed, setLanded] = useState(false);
  const destId = useId();

  useEffect(() => {
    if (!inView) return undefined;
    const timer = window.setTimeout(() => setLanded(true), START_MS);
    return () => window.clearTimeout(timer);
  }, [inView]);

  const stops = matches.slice(0, 5);
  const slots = stampSlots(stops.length);

  return (
    <div ref={ref} className="mt-route" data-landed={landed ? '' : undefined}>
      <svg className="mt-route-svg" viewBox={VIEW_BOX} aria-hidden="true" focusable="false">
        <path className="mt-route-line" d={ROUTE_PATH} />
        {/* Paper over the line that slides off it: the route draws from its start. */}
        <path className="mt-route-cover" d={ROUTE_PATH} style={{ '--len': `${ROUTE_LENGTH}px` }} />
      </svg>
      <span id={destId} hidden>
        Your destination
      </span>
      <ol className="mt-stops">
        {stops.map((match, i) => {
          const slot = slots[i];
          const isPicked = Boolean(picked) && picked === match.country_code;
          return (
            <li
              key={match.country_code}
              className={`mt-stop${isPicked ? ' mt-stop--picked' : ''}`}
              style={{ left: `${slot.x}%`, top: `${slot.y}%`, '--d': `${FIRST_MS + i * STAMP_GAP_MS}ms` }}
            >
              <button
                type="button"
                className="mt-stop-btn"
                aria-label={`Set ${match.country_name} as my destination, match score ${scoreWords(match.match_score)}`}
                aria-describedby={isPicked ? destId : undefined}
                onClick={() => onPick?.(match)}
              >
                <span className="mt-stop-face" aria-hidden="true">
                  <Stamp shape="circle" color={INKS[i]} lines={stampFace(match)} applied={landed} rotate={slot.rotate} />
                </span>
                {isPicked ? (
                  <span className="mt-stop-pin" aria-hidden="true">
                    <PlaneGlyph />
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/**
 * While the matches are found: the same route with five empty dashed stops and its dashes slowly
 * marching (an ambient loop, paused while off screen; still under reduced motion). Decorative:
 * the form's status line says it in words.
 */
export function PendingRoute() {
  const ref = useRef(null);
  const onScreen = useInView(ref, { once: false });
  return (
    <div ref={ref} className="mt-route mt-route--pending" aria-hidden="true" data-offscreen={onScreen ? undefined : ''}>
      <svg className="mt-route-svg" viewBox={VIEW_BOX} focusable="false">
        <path className="mt-route-line" d={ROUTE_PATH} />
      </svg>
      <ol className="mt-stops">
        {stampSlots(5).map((slot, i) => (
          <li key={i} className="mt-stop" style={{ left: `${slot.x}%`, top: `${slot.y}%` }}>
            <span className="mt-stop-blank" />
          </li>
        ))}
      </ol>
    </div>
  );
}
