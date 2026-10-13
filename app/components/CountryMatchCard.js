'use client';

import { useId } from 'react';
import Link from 'next/link';
import Guilloche from './kit/Guilloche';
import { CheckGlyph } from './kit/Glyphs';
import { STAMP_INKS } from './kit/stampInks';
import { costLevel, matchLinks } from '../lib/match';
import '../match/match.css';

// The visa difficulty's dot (decorative; the word is beside it).
const VISA_INKS = { easy: STAMP_INKS.green, moderate: STAMP_INKS.gold, hard: STAMP_INKS.terracotta, 'very hard': STAMP_INKS.terracotta };

/**
 * One country match as a passport page with a visa vignette stuck on it (the Country Match
 * tool's M-MATCH tint, a guilloche rosette, a foil strip): the country (h3) and its score, the
 * reason, then the VISA / JOBS / COST / LANG strip, the visa-path sentence, links that carry the
 * route (/visa?from=<from>&to=<code>, /relocate?dest=<name>) and "Set as destination", which calls
 * `onPick(match)` like a tap on the country's stamp. `match` comes from pickMatches (app/lib/
 * match.js); `from` is the passport's country code; `picked`: it is the saved destination.
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
    <article className="mt-card" aria-labelledby={id}>
      <div className="mt-vig">
        <Guilloche variant="rosette" seed="M-MATCH" className="mt-vig-rosette" />
        <span className="mt-vig-letter" aria-hidden="true">M</span>
        <span className="mt-vig-foil" aria-hidden="true" />
        <p className="mt-vig-type" aria-hidden="true">
          Visa type <b>M-MATCH</b> · {String(rank).padStart(2, '0')}
        </p>
        <div className="mt-vig-head">
          <h3 id={id} className="mt-vig-name">{match.country_name}</h3>
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
        {match.top_reason ? <p className="mt-vig-reason">{match.top_reason}</p> : null}
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
    </article>
  );
}
