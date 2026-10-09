'use client';

import { useEffect, useRef, useState } from 'react';
import { Noto_Naskh_Arabic } from 'next/font/google';
import { Stamp } from '../parts/Stamp';
import { STAMP_INKS } from '../parts/stampInks';
import { useHydrated } from '../useMediaQuery';
import './pages.css';

// Only the cover word uses it; not preloaded, so it never competes with the hero H1 (LCP).
const naskh = Noto_Naskh_Arabic({ subsets: ['arabic'], weight: '600', preload: false });

const ETYMOLOGY =
  'The word for journey crossed borders too: Arabic safar → Urdu safar → Swahili safari → English.';
const FAREWELL =
  'At the end of the journey the word becomes a farewell: Urdu safar bakhair, Swahili safari njema, English safe travels.';

function Crest() {
  return (
    <svg className="jbp-crest" viewBox="0 0 120 120" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="jbp-crest-foil" x1="0" x2="1">
          <stop offset="0" stopColor="#b89a4a" />
          <stop offset=".5" stopColor="#f3e3a0" />
          <stop offset="1" stopColor="#a88a3c" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#jbp-crest-foil)" strokeWidth="1.6">
        <circle cx="60" cy="60" r="44" />
        <ellipse cx="60" cy="60" rx="22" ry="44" />
        <ellipse cx="60" cy="60" rx="38" ry="44" />
        <ellipse cx="60" cy="60" rx="44" ry="15" />
        <ellipse cx="60" cy="60" rx="44" ry="31" />
        <circle cx="60" cy="60" r="54" strokeDasharray="2 3" />
      </g>
      <path d="M30 46 Q60 6 92 40" fill="none" stroke="#b8cf5d" strokeWidth="2" strokeLinecap="round" />
      <circle cx="30" cy="46" r="3" fill="#b8cf5d" />
      <circle cx="92" cy="40" r="3" fill="#b8cf5d" />
    </svg>
  );
}

/**
 * p0, the outside cover: crest, the cover word "سفر · SAFARI · JOURNEY" (hover / focus / tap
 * shows its etymology; Escape or a tap elsewhere closes it), chip, issuer MGV and the spine
 * microprint.
 * `pointerFoil` (desktop full mode): the foil follows the pointer (--mx); otherwise a slow
 * 8s CSS sheen crosses the cover.
 * Closing beat (pose-driven, no React state): PassportStage sets data-bon-voyage="1" on this
 * section -> the BON VOYAGE stamp thunks onto a paper label on the cover (ink from STAMP_INKS:
 * the inks are made for paper), and data-blessing="1" -> the cover word cross-fades to
 * "سفر بخیر · SAFARI NJEMA · SAFE TRAVELS".
 */
export default function Cover({ active = false, pointerFoil = false }) {
  const ref = useRef(null);
  const wordRef = useRef(null);
  const [showEtym, setShowEtym] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const hydrated = useHydrated(); // the BON VOYAGE label is closing-beat only: kept off the first render

  useEffect(() => {
    const el = ref.current;
    if (!pointerFoil || !active || !el) return undefined;
    let frame = 0;
    let x = 0.5;
    const onMove = (e) => {
      x = e.clientX / Math.max(1, window.innerWidth);
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        el.style.setProperty('--mx', `${(x * 100).toFixed(1)}%`);
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [pointerFoil, active]);

  // Escape hides the tooltip (hover, focus or tap-opened) until the pointer / focus comes back.
  useEffect(() => {
    if (!active) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      setShowEtym(false);
      setDismissed(true);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [active]);

  // A tap-opened tooltip closes on a tap anywhere else.
  useEffect(() => {
    if (!showEtym) return undefined;
    const onDown = (e) => {
      if (!wordRef.current?.contains(e.target)) setShowEtym(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [showEtym]);

  const rearm = () => setDismissed(false);

  return (
    <section
      ref={ref}
      id="cover"
      aria-labelledby="cover-h"
      tabIndex={-1}
      className={`jbp jbp-cover ${pointerFoil ? 'jbp-cover--pointer' : 'jbp-cover--sheen'}`}
    >
      <p className="jbp-spine">JOURNEY BOOK · SPECIMEN · NOT A TRAVEL DOCUMENT</p>
      <h2 id="cover-h" className="jbp-cover-title jbp-foil">
        MIGROVA <span>JOURNEY BOOK</span>
      </h2>
      <Crest />
      <div
        ref={wordRef}
        className="jbp-word-wrap"
        data-dismissed={dismissed ? 'true' : 'false'}
        onMouseEnter={rearm}
        onMouseLeave={rearm}
      >
        <button
          type="button"
          className="jbp-word"
          aria-describedby="cover-etym"
          onClick={() => {
            setDismissed(false);
            setShowEtym((open) => !open);
          }}
          onFocus={rearm}
          onBlur={() => {
            rearm();
            setShowEtym(false);
          }}
        >
          <span className="jbp-word-a jbp-foil">
            <span lang="ar" dir="rtl" className={naskh.className}>
              سفر
            </span>{' '}
            · SAFARI · JOURNEY
          </span>
          <span className="jbp-word-b jbp-foil">
            {/* The space stays outside the Naskh spans: a space would pull in the font's
                Latin subset file just for that one character. */}
            <span lang="ur" dir="rtl">
              <span className={naskh.className}>سفر</span> <span className={naskh.className}>بخیر</span>
            </span>{' '}
            · SAFARI NJEMA · SAFE TRAVELS
          </span>
        </button>
        <span id="cover-etym" role="tooltip" className="jbp-etym" data-open={showEtym ? 'true' : 'false'}>
          <span className="jbp-etym-a">{ETYMOLOGY}</span>
          <span className="jbp-etym-b">{FAREWELL}</span>
        </span>
      </div>
      <div className="jbp-cover-foot">
        <span className="jbp-chip" aria-hidden="true" />
        <span>
          ISSUER <b>MGV</b>
        </span>
      </div>
      {hydrated ? (
        <span className="jbp-bv" aria-hidden="true">
          <Stamp shape="circle" color={STAMP_INKS.terracotta} rotate={0} lines={['MIGROVA', 'BON VOYAGE', '• MGV •']} />
        </span>
      ) : null}
      <span className="jbp-sheen" aria-hidden="true" />
    </section>
  );
}
