'use client';

import { useId } from 'react';
import Link from 'next/link';
import Guilloche from './kit/Guilloche';
import PassportCard from './kit/PassportCard';
import { CheckGlyph } from './kit/Glyphs';
import { STAMP_INKS } from './kit/stampInks';
import { costLevel, matchLinks } from '../lib/match';

// The visa difficulty's dot (decorative; the word is beside it).
const VISA_INKS = { easy: STAMP_INKS.green, moderate: STAMP_INKS.gold, hard: STAMP_INKS.terracotta, 'very hard': STAMP_INKS.terracotta };

/**
 * One country match as a passport page (the kit's PassportCard paper) with the kit's M-MATCH visa
 * vignette stuck on it: the kit's own .jb-vignette parts (kit.css holds the tint, ink, guilloche
 * rosette, watermark letter, type label and foil), with the country as the vignette's title (h3),
 * the score beside it and the reason as its description. Then the VISA / JOBS / COST / LANG strip,
 * the visa-path sentence, links that carry the route (/visa?from=<from>&to=<code>,
 * /relocate?dest=<name>) and "Set as destination", which calls `onPick(match)` like a tap on the
 * country's stamp. `match` comes from pickMatches (app/lib/match.js); `from` is the passport's
 * country code; `picked`: it is the saved destination.
 * (Not the Vignette component itself: its parts are spans for a link / <summary>, and this head
 * holds a heading and paragraphs.)
 * Its own styles (.mt-card, .mt-vig-*, .mt-stats, .mt-go …) are in app/match/match.css, which the
 * /match page imports: a shared component imports no page's stylesheet.
 */
export default function CountryMatchCard({ match, rank, from, picked = false, onPick }) {
  const id = useId();
  const links = matchLinks({ from, to: match.country_code, name: match.country_name });
  const cost = costLevel(match.cost_of_living);
  const visa = match.visa_difficulty;
  const visaInk = Object.hasOwn(VISA_INKS, visa.toLowerCase()) ? VISA_INKS[visa.toLowerCase()] : null;
  const score = match.match_score;
  const stats = [
    { short: 'Visa', long: 'Visa difficulty', value: visa, ink: visaInk },
    { short: 'Jobs', long: 'Job availability', value: match.job_availability },
    { short: 'Cost', long: 'Cost of living', value: cost.word, signs: cost.signs },
    { short: 'Lang', long: 'Language barrier', value: match.language_barrier },
  ];

  return (
    <PassportCard as="article" className="mt-card" aria-labelledby={id}>
      <div className="jb-vignette mt-vig" data-type="M-MATCH">
        <div className="jb-vignette-card">
          <Guilloche variant="rosette" seed="M-MATCH" className="jb-vignette-rosette" />
          <span className="jb-vignette-letter" aria-hidden="true">M</span>
          <span className="jb-vignette-type" aria-hidden="true">
            VISA TYPE <b>M-MATCH</b> · {String(rank).padStart(2, '0')}
          </span>
          <div className="mt-vig-head">
            <h3 id={id} className="jb-vignette-title">{match.country_name}</h3>
            <p className="mt-vig-score">
              {typeof score === 'number' ? (
                <>
                  <b>{score}</b>
                  <span className="mt-vig-of">/100</span>
                  <span className="sr-only"> match score</span>
                </>
              ) : (
                <span className="mt-vig-of">No score</span>
              )}
            </p>
          </div>
          {match.top_reason ? <p className="jb-vignette-desc">{match.top_reason}</p> : null}
          <span className="jb-vignette-holo" aria-hidden="true"><span /></span>
        </div>
      </div>

      <dl className="mt-stats">
        {stats.map((s) => (
          <div key={s.short}>
            <dt>
              <span aria-hidden="true">{s.short}</span>
              <span className="sr-only">{s.long}</span>
            </dt>
            <dd>
              {s.ink ? <span className="mt-dot" style={{ background: s.ink }} aria-hidden="true" /> : null}
              {s.signs ? <span className="mt-signs" aria-hidden="true">{s.signs}</span> : null}
              {s.value || 'Not given'}
            </dd>
          </div>
        ))}
      </dl>

      {match.visa_path ? (
        <p className="mt-path">
          <span className="mt-path-label">Visa path</span>
          {match.visa_path}
        </p>
      ) : null}

      <div className="mt-actions">
        <Link href={links.visa} className="mt-go mt-go--primary">
          Check the visa
        </Link>
        <Link href={links.relocate} className="mt-go">
          Relocation guide
        </Link>
        <a href="https://opportumap.netlify.app/jobs" target="_blank" rel="noopener noreferrer" className="mt-go">
          Jobs on OpportuMap<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
      <div className="mt-set-row">
        <button type="button" className="mt-set" aria-describedby={id} onClick={() => onPick?.(match)}>
          Set as destination
        </button>
        {picked ? (
          <p className="mt-is-dest">
            <CheckGlyph /> Your destination
          </p>
        ) : null}
      </div>
    </PassportCard>
  );
}
