'use client';

import { useId } from 'react';
import PassportCard from './kit/PassportCard';
import { STAMP_INKS } from './kit/stampInks';

// How full the meter is per estimate, and its ink (every ink reaches 4.5:1 on the paper).
const LEVELS = {
  low: { fill: 0.2, ink: STAMP_INKS.terracotta, label: 'Low' },
  medium: { fill: 0.5, ink: STAMP_INKS.gold, label: 'Medium' },
  high: { fill: 0.75, ink: STAMP_INKS.green, label: 'High' },
  'very high': { fill: 0.95, ink: STAMP_INKS.green, label: 'Very high' },
};

// What a factor does to the chance, as a word (the AI sometimes adds "… depending on …").
function impact(value) {
  const word = String(value ?? '').trim().toLowerCase();
  if (word.startsWith('positive')) return { text: 'Helps', ink: STAMP_INKS.green };
  if (word.startsWith('negative')) return { text: 'Works against', ink: STAMP_INKS.terracotta };
  return { text: 'Depends', ink: STAMP_INKS.gold };
}

const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');

/**
 * The chance estimate from /api/visa-probability, in detail: the level on a meter (its fill is
 * `transform: scaleX(fill)`, decorative; the level is the text beside it), the estimated range,
 * the factors with what each does, and the tip. An unknown level shows no meter; an answer with
 * nothing usable renders nothing.
 */
export default function VisaProbabilityMeter({ data }) {
  const headingId = useId();
  if (!data) return null;
  const key = text(data.probability).toLowerCase().replace(/\s+/g, ' ');
  const level = Object.hasOwn(LEVELS, key) ? LEVELS[key] : null; // never Object.prototype keys
  const factors = Array.isArray(data.factors) ? data.factors.filter((f) => text(f?.factor)) : [];
  const range = text(data.percentage_range);
  const via = text(data.recommended_visa_type);
  const processing = text(data.processing_time);
  const tip = text(data.tip);
  if (!level && !range && !via && !processing && factors.length === 0 && !tip) return null;

  return (
    <PassportCard aria-labelledby={headingId}>
      <p className="m-0 mb-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-paper-ink-sub">Rough estimate · not a prediction</p>
      <h3 id={headingId} className="m-0 text-[22px] font-extrabold leading-[1.2] tracking-[-0.01em]">Your chance estimate</h3>

      {level && (
        <div className="mt-4 flex items-center gap-4">
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-page-ink/10" aria-hidden="true">
            <div className="h-full w-full origin-left rounded-full" style={{ transform: `scaleX(${level.fill})`, background: level.ink }} />
          </div>
          <span className="text-[28px] font-extrabold leading-none tracking-[-0.02em]" style={{ color: level.ink }}>{level.label}</span>
        </div>
      )}

      {(range || via || processing) && (
        <p className="m-0 mt-4 text-[16px] leading-[1.55] text-paper-ink-dim">
          {range && <>Estimated range: <strong className="font-bold text-page-ink">{range}</strong></>}
          {via && <>{range ? ' via ' : 'Via '}<strong className="font-bold text-page-ink">{via}</strong></>}
          {processing && <>{range || via ? ' · ' : ''}Processing: {processing}</>}
        </p>
      )}

      {factors.length > 0 && (
        <>
          <h4 className="m-0 mt-5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-paper-ink-sub">Key factors</h4>
          <ul className="m-0 mt-2 grid list-none gap-2.5 p-0">
            {factors.map((f, i) => {
              const effect = impact(f.impact);
              return (
                <li key={i} className="text-[16px] leading-[1.5] text-paper-ink-dim">
                  <span className="mr-2 font-mono text-[12px] font-bold uppercase tracking-[0.08em]" style={{ color: effect.ink }}>{effect.text}</span>
                  {text(f.factor)}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {tip && (
        <p className="m-0 mt-5 rounded-[10px] border-[1.5px] border-dashed border-page-ink/25 px-4 py-3 text-[16px] leading-[1.55] text-paper-ink-dim">
          <strong className="font-bold text-page-ink">Tip:</strong> {tip}
        </p>
      )}
    </PassportCard>
  );
}
