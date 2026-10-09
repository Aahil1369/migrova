'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { countryByCode } from '../../../data/countries195';
import { buildMrz, decodeFrame, DECODE_FRAMES, MRZ_PLAIN } from '../mrz';
import { useRoute } from '../PassportContext';
import { REDUCED_MOTION, useMediaQuery } from '../useMediaQuery';
import './pages.css';

const FRAME_MS = 45;
const START_MS = 250; // let the page land first
// What the MRZ decodes to (MRZ_PLAIN), in sentence case for screen readers.
const MRZ_MEANING = 'Machine-readable zone: Plain English. Official sources. No scams. No guesswork.';

/**
 * The two MRZ lines. On each arrival (`active` turning true) they scramble-decode into
 * MRZ_PLAIN, one decodeFrame every 45ms (setTimeout chain, cancelled on deactivation and
 * unmount), and stay decoded; leaving resets them to the raw lines. Tap / click / Enter replays.
 * `still` (stack layout) or prefers-reduced-motion: raw and plain lines shown together, no motion.
 * Visually 2 x 44 characters; assistive tech gets the plain-English meaning instead.
 */
function MrzDecode({ lines, active, still }) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION, false);
  const quiet = still || reducedMotion;
  const [frame, setFrame] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (!active || quiet) return undefined;
    let f = 0;
    let timer = 0;
    const tick = () => {
      f += 1;
      setFrame(f);
      if (f < DECODE_FRAMES) timer = window.setTimeout(tick, FRAME_MS);
    };
    timer = window.setTimeout(tick, run ? 0 : START_MS);
    return () => {
      window.clearTimeout(timer);
      setFrame(0); // back to the raw lines: the next arrival (or replay) decodes again
    };
  }, [active, quiet, run]);

  if (quiet) {
    return (
      <div className="jbp-mrz jbp-mrz--still" role="img" aria-label={MRZ_MEANING}>
        <span>{lines[0]}</span>
        <span>{lines[1]}</span>
        <span className="jbp-mrz-plain">{MRZ_PLAIN[0]}</span>
        <span className="jbp-mrz-plain">{MRZ_PLAIN[1]}</span>
      </div>
    );
  }
  const done = frame >= DECODE_FRAMES;
  return (
    <button
      type="button"
      className="jbp-mrz"
      data-decoded={done ? 'true' : 'false'}
      aria-label={`${MRZ_MEANING} Replay the decode.`}
      onClick={() => setRun((n) => n + 1)}
    >
      <span aria-hidden="true">{decodeFrame(lines[0], MRZ_PLAIN[0], frame)}</span>
      <span aria-hidden="true">{decodeFrame(lines[1], MRZ_PLAIN[1], frame)}</span>
    </button>
  );
}

// Line-art family photo: two adults and a child, no faces.
function FamilyPhoto() {
  return (
    <svg viewBox="0 0 120 152" aria-hidden="true" focusable="false">
      <g fill="none" stroke="#2f5139" strokeOpacity=".16" strokeWidth="1">
        <circle cx="60" cy="58" r="46" />
        <ellipse cx="60" cy="58" rx="22" ry="46" />
        <ellipse cx="60" cy="58" rx="46" ry="15" />
      </g>
      <g fill="#e2ecda" stroke="#2f5139" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 152 C14 104 64 104 64 152" />
        <circle cx="39" cy="74" r="14" />
        <path d="M56 152 C56 100 108 100 108 152" />
        <circle cx="82" cy="70" r="15" />
        <path d="M40 152 C40 122 80 122 80 152" />
        <circle cx="60" cy="108" r="11" />
      </g>
    </svg>
  );
}

/**
 * p2, the data page: holder, From -> To from the current search (defaults "Your country" /
 * "Your 5 best matches"), a line-art family photo, "Find my countries →" and the two MRZ lines
 * built from the route (ANY when unset), which decode into plain English on arrival.
 * `still`: the reduced-motion stack (raw + plain lines together). `verifiedCount`: the computed
 * verified-link count, printed in the MRZ (never hard-coded).
 */
export default function DataPage({ active = false, still = false, verifiedCount }) {
  const { route } = useRoute();
  const from = countryByCode(route?.from);
  const to = route?.to && route.to !== 'any' ? countryByCode(route.to) : null;
  const [line1, line2] = buildMrz({ fromIso3: from?.iso3, toIso3: to?.iso3, count: verifiedCount });

  return (
    <section id="data" aria-labelledby="data-h" tabIndex={-1} className="jbp jbp-data">
      <div className="jbp-data-grid">
        <div className="jbp-photo">
          <FamilyPhoto />
        </div>
        <div>
          <h2 id="data-h" className="jbp-holder">
            <span className="jbp-label">
              HOLDER<span aria-hidden="true"> / TITULAIRE</span>
            </span>
            Your family
          </h2>
          <dl className="jbp-fields">
            <div>
              <dt className="jbp-label">
                FROM<span aria-hidden="true"> / DE</span>
              </dt>
              <dd>
                {from ? (
                  <>
                    <span aria-hidden="true">{from.flag} </span>
                    {from.name}
                  </>
                ) : (
                  'Your country'
                )}
              </dd>
            </div>
            <div>
              <dt className="jbp-label">
                TO<span aria-hidden="true"> / À</span>
              </dt>
              <dd>
                {to ? (
                  <>
                    <span aria-hidden="true">{to.flag} </span>
                    {to.name}
                  </>
                ) : (
                  'Your 5 best matches'
                )}
              </dd>
            </div>
            <div>
              <dt className="jbp-label">VALID FOR</dt>
              <dd>195 countries</dd>
            </div>
          </dl>
        </div>
      </div>
      <Link href="/match" className="jbp-cta">
        Find my countries →
      </Link>
      <MrzDecode lines={[line1, line2]} active={active} still={still} />
    </section>
  );
}
