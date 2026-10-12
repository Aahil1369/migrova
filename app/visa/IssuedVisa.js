'use client';

import { useEffect, useRef, useState } from 'react';
import PassportCard from '../components/kit/PassportCard';
import { Stamp } from '../components/kit/Stamp';
import { STAMP_INKS } from '../components/kit/stampInks';
import { MrzDecode } from '../components/kit/MrzDecode';
import { decodeFrame } from '../components/kit/mrz';
import { useInView } from '../components/kit/useInView';
import { REDUCED_MOTION, useMediaQuery } from '../components/kit/useMediaQuery';
import { countryByCode } from '../data/countries195';
import { chanceLine, leadVisa, visaEntry, visaPlainMrz, visaRawMrz, visaStamp } from './visaReport';

/** The id of the report's heading (the issued visa's title): ResultArrival focuses it. */
export const VISA_HEADING_ID = 'visa-report-h';

const SCRAMBLE_MS = 90;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// The MRZ while the report is being prepared: both raw lines scrambling (decodeFrame's scramble
// frames, so it looks like the decode that follows), decorative (aria-hidden). An ambient loop:
// paused while off screen; reduced motion shows the raw lines still.
function ScramblingMrz({ lines }) {
  const ref = useRef(null);
  const onScreen = useInView(ref, { once: false });
  const reducedMotion = useMediaQuery(REDUCED_MOTION, false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!onScreen || reducedMotion) return undefined;
    const timer = window.setInterval(() => setTick((t) => t + 1), SCRAMBLE_MS);
    return () => window.clearInterval(timer);
  }, [onScreen, reducedMotion]);

  const frame = (offset) => (reducedMotion ? 0 : 7 + ((tick + offset) % 11));
  return (
    <div ref={ref} className="kit-mrzd" aria-hidden="true">
      <span>{decodeFrame(lines[0], '', frame(0))}</span>
      <span>{decodeFrame(lines[1], '', frame(5))}</span>
    </div>
  );
}

// A status line for screen readers that is filled just after it mounts (a live region that
// already holds its text when inserted is not reliably announced).
function LateStatus({ children }) {
  const [said, setSaid] = useState('');
  useEffect(() => {
    const timer = window.setTimeout(() => setSaid(children), 100);
    return () => window.clearTimeout(timer);
  }, [children]);
  return (
    <p className="sr-only" role="status" aria-live="polite">
      {said}
    </p>
  );
}

// '12 Oct 2026' for the card, '12 OCT 26' for the stamp (the person's local date).
function issuedDates(time) {
  const date = new Date(time);
  if (Number.isNaN(date.getTime())) return { text: '', stamp: '' };
  const day = String(date.getDate()).padStart(2, '0');
  const month = MONTHS[date.getMonth()];
  const text = `${date.getDate()} ${month.charAt(0)}${month.slice(1).toLowerCase()} ${date.getFullYear()}`;
  return { text, stamp: `${day} ${month} ${String(date.getFullYear()).slice(2)}` };
}

/**
 * The visa page's signature moment, on an issued-visa card (PassportCard tone="visa").
 * `loading`: a blank visa for the destination, its MRZ scrambling, and "Preparing your report…"
 * for screen readers. With a `report`: the lead visa type (first visaTypes entry), the entry
 * status in words, processing time and fee when present, the issue date and the chance
 * (`probability` from /api/visa-probability; "checking…" while `chancePending`; a Low chance
 * adds a CAUTION note); then the MRZ decodes from the raw lines into plain English and, once it
 * has, the entry stamp (visaStamp) lands once. Reduced motion: decoded lines and the stamp at
 * once. The stamp and the MRZ only repeat what the card says in words.
 * `from` / `to` are country codes, `purpose` the purpose sent with the request, `issuedAt` the
 * time the report arrived.
 */
export default function IssuedVisa({ loading = false, report, probability, chancePending = false, from, to, purpose, issuedAt }) {
  const destination = countryByCode(to);
  const label = destination ? `VISA · ${destination.name.toUpperCase()}` : 'VISA';
  const raw = visaRawMrz({ fromIso3: countryByCode(from)?.iso3, toIso3: destination?.iso3, purpose });

  if (!report) {
    if (!loading) return null;
    return (
      <PassportCard tone="visa" className="visa-card visa-card--pending">
        <p className="visa-card-label">{label}</p>
        <p className="visa-card-type visa-card-type--pending" aria-hidden="true">
          Issuing your visa…
        </p>
        <span className="visa-card-stamp visa-card-stamp--empty" aria-hidden="true" />
        <span className="visa-skel" aria-hidden="true" />
        <span className="visa-skel visa-skel--short" aria-hidden="true" />
        <LateStatus>Preparing your report…</LateStatus>
        <div className="visa-card-mrz">
          <ScramblingMrz lines={raw} />
        </div>
      </PassportCard>
    );
  }

  return <ArrivedVisa report={report} label={label} raw={raw} probability={probability} chancePending={chancePending} to3={destination?.iso3} issuedAt={issuedAt} />;
}

function ArrivedVisa({ report, label, raw, probability, chancePending, to3, issuedAt }) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION, false);
  const [decoded, setDecoded] = useState(false);
  const lead = leadVisa(report);
  const entry = visaEntry(report.currentStatus);
  const stamp = visaStamp(report.currentStatus);
  const chance = chanceLine(probability);
  const issued = issuedDates(issuedAt);
  const summary = typeof report.statusSummary === 'string' ? report.statusSummary.trim() : '';
  // Pending and failed estimates both decode to just the next step (visaPlainMrz); the line
  // gains the chance when it arrives.
  const plain = visaPlainMrz({ currentStatus: report.currentStatus, probability });

  return (
    <PassportCard tone="visa" className="visa-card">
      <h2 id={VISA_HEADING_ID} className="visa-card-h">
        <span className="visa-card-label">{label}</span>
        <span className="visa-card-type">{lead.name}</span>
      </h2>
      {/* After the title, so a long visa name keeps the full width; the text below wraps round it. */}
      <span className="visa-card-stamp" aria-hidden="true">
        <Stamp
          shape="circle"
          color={STAMP_INKS[stamp.ink]}
          lines={[to3 || 'MGV', ...stamp.lines, issued.stamp]}
          applied={decoded || reducedMotion}
          rotate={-12}
        />
      </span>
      <p className="visa-card-entry">
        <strong>{entry.label}.</strong> {entry.step}.
      </p>
      {summary ? <p className="visa-card-summary">{summary}</p> : null}
      <dl className="visa-card-facts">
        {lead.processing ? (
          <div>
            <dt>Processing</dt>
            <dd>{lead.processing}</dd>
          </div>
        ) : null}
        {lead.fee ? (
          <div>
            <dt>Fee</dt>
            <dd>{lead.fee}</dd>
          </div>
        ) : null}
        {issued.text ? (
          <div>
            <dt>Issued</dt>
            <dd>{issued.text}</dd>
          </div>
        ) : null}
      </dl>
      <p className="visa-card-chance" aria-live="polite">
        <span>{chancePending ? 'Chance: checking…' : chance.text}</span>
        {!chancePending && chance.caution ? <span className="visa-caution">Caution</span> : null}
      </p>
      <div className="visa-card-mrz">
        <MrzDecode lines={raw} plain={plain} active label="Machine-readable zone of your visa." onDecoded={() => setDecoded(true)} />
      </div>
    </PassportCard>
  );
}
