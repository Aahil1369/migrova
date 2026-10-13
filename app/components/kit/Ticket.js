'use client';

import { useEffect, useRef, useState } from 'react';
import { Stamp } from './Stamp';
import { STAMP_INKS } from './stampInks';
import { CheckGlyph, PlaneGlyph, ScissorsGlyph } from './Glyphs';
import { REDUCED_MOTION, useMediaQuery } from './useMediaQuery';
import './kit.css';
import './ticket.css';

const TEAR_MS = 700; // the stub's flight (ticket.css .tk-stub--flying)
const STAMP_MS = 450; // the ADMITTED stamp lands once the pass has settled on screen

export const TICKET_SAVED = 'Saved on this device';
const NOTE_SAVED = 'Your first-week plan is saved on this device.';
const NOTE_FAILED = "Couldn't save it on this device: this browser is blocking storage.";

/**
 * A boarding pass (the homepage pass's sibling look, no shared code): the heading (`headingId`,
 * for ResultArrival) holds the kicker, the big FROM (plane) TO codes (decorative) and the trip in
 * words (`from` → `city`); a fare box of `tiers` ([{ label, amount }], a row that stacks on
 * phones); an ADMITTED stamp (`stamp` lines, blue ink, decorative) that lands once; and a
 * perforated stub titled `stubTitle` listing `stubItems`.
 * The stub's button is the only way to save: it plays a 700ms tear (transform / opacity), then
 * calls `onTear()`, which saves and returns false when it could not. Reduced motion: a
 * "Save my first-week plan" button does the same at once. `torn`: already saved (the stub shows
 * as torn off). No stub items -> no stub.
 */
export function Ticket({ fromCode, toCode, from = '', city, tiers = [], stamp = [], stubTitle, stubItems = [], onTear, torn = false, headingId }) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION, false);
  const [landed, setLanded] = useState(false);
  // null, then 'flying' while the stub is in the air, then 'saved' or 'failed'.
  const [tear, setTear] = useState(null);
  const noteRef = useRef(null);
  const timer = useRef(0);

  useEffect(() => {
    const id = window.setTimeout(() => setLanded(true), STAMP_MS);
    return () => {
      window.clearTimeout(id);
      window.clearTimeout(timer.current);
    };
  }, []);

  const finish = () => setTear(onTear?.() === false ? 'failed' : 'saved');

  const tearOff = (event) => {
    if (tear) return;
    // The button is about to fly away (or be replaced): keep keyboard focus next to it, on the note.
    if (document.activeElement === event.currentTarget) noteRef.current?.focus({ preventScroll: true });
    if (reducedMotion) {
      finish();
      return;
    }
    setTear('flying');
    timer.current = window.setTimeout(finish, TEAR_MS);
  };

  const flying = tear === 'flying';
  const saved = torn || tear === 'saved';
  let slot = null;
  if (stubItems.length > 0 && saved) {
    slot = (
      <p className="tk-saved">
        <CheckGlyph /> {TICKET_SAVED}
      </p>
    );
  } else if (stubItems.length > 0 && tear !== 'failed') {
    slot = (
      <div className={`tk-stub${flying ? ' tk-stub--flying' : ''}`} aria-hidden={flying || undefined} inert={flying || undefined}>
        <p className="tk-stub-title">{stubTitle}</p>
        <ul className="tk-stub-list">
          {stubItems.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
        <button type="button" className="tk-tear" onClick={tearOff}>
          {reducedMotion ? (
            'Save my first-week plan'
          ) : (
            <>
              Tear off to save<span className="sr-only"> my first-week plan</span> <ScissorsGlyph />
            </>
          )}
        </button>
      </div>
    );
  }

  const note = tear === 'saved' ? NOTE_SAVED : tear === 'failed' ? NOTE_FAILED : '';
  return (
    <div className="tk-wrap">
      <div className={`tk${slot ? '' : ' tk--solo'}`}>
        <div className="tk-main">
          <h2 id={headingId} className="tk-head">
            <span className="tk-kicker">Boarding pass · relocation</span>
            <span className="tk-codes" aria-hidden="true">
              {fromCode}
              <PlaneGlyph className="tk-plane" />
              {toCode}
            </span>
            <span className="tk-city">
              {from ? (
                <>
                  {from} <span aria-hidden="true">→</span>
                  <span className="sr-only">to</span>{' '}
                </>
              ) : null}
              {city}
            </span>
          </h2>
          <div className="tk-row">
            {tiers.length > 0 ? (
              <div className="tk-fare">
                <p className="tk-label">Fare · monthly budget, USD</p>
                <dl className="tk-tiers">
                  {tiers.map((t) => (
                    <div key={t.label}>
                      <dt>{t.label}</dt>
                      <dd>{t.amount}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
            <span className="tk-stamp" aria-hidden="true">
              <Stamp shape="rect" color={STAMP_INKS.blue} lines={stamp} applied={landed} rotate={-4} />
            </span>
          </div>
        </div>
        {slot ? <div className="tk-slot">{slot}</div> : null}
      </div>
      <p ref={noteRef} tabIndex={-1} className="tk-note" data-ok={tear === 'failed' ? 'false' : undefined} aria-live="polite">
        {note}
      </p>
    </div>
  );
}

export default Ticket;
