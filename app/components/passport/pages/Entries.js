'use client';

import { useSyncExternalStore } from 'react';
import Stamp from '../parts/Stamp';
import { STAMP_INKS } from '../parts/stampInks';
import { stampDate } from './storyText';
import './pages.css';

// Today's date in the visitor's time zone: '' on the server and during hydration, then the
// client's date (no server/client text mismatch). The date never needs a live subscription.
const noSubscribe = () => () => {};
const useToday = () => useSyncExternalStore(noSubscribe, () => stampDate(new Date()), () => '');

const STEPS = [
  { shape: 'circle', ink: STAMP_INKS.green, stamp: 'TELL US', title: 'Tell us about you', text: "Nationality and where you'd go." },
  { shape: 'rect', ink: STAMP_INKS.blue, stamp: 'OPTIONS', title: 'See your options', text: 'Countries ranked by real access.' },
  { shape: 'triangle', ink: STAMP_INKS.terracotta, stamp: 'THE PATH', title: 'Understand the path', text: 'Papers, timelines, costs.' },
  { shape: 'hexagon', ink: STAMP_INKS.purple, stamp: 'REAL HELP', title: 'Get real help', text: 'Lawyer costs and free aid.' },
];

/**
 * p5, how it works: four entry stamps "ENTRY 0n · <STEP> · <today>" (circle, rect, triangle,
 * hexagon) thunk in on arrival along a dashed route. Each step is also real text beside its
 * stamp (>= 16px on phones), so the stamps themselves are decorative.
 */
export default function Entries({ active = false }) {
  const today = useToday();

  return (
    <section id="entries" aria-labelledby="entries-h" tabIndex={-1} className="jbp jbp-entries-page">
      <h2 id="entries-h" className="jbp-title jbp-title--sm">How it works</h2>
      <div className="jbp-entries-wrap">
        <svg className="jbp-route" viewBox="0 0 40 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <path
            d="M20 2 C34 20 6 30 20 50 C34 70 6 80 20 98"
            fill="none"
            stroke="#4f5c55"
            strokeOpacity=".45"
            strokeWidth="1.5"
            strokeDasharray="4 5"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <ol className="jbp-entries">
          {STEPS.map((step, i) => (
            <li key={step.stamp} className="jbp-entry">
              <span className="jbp-entry-stamp" aria-hidden="true">
                <Stamp
                  shape={step.shape}
                  color={step.ink}
                  lines={[`ENTRY 0${i + 1}`, step.stamp, today]}
                  applied={active}
                  style={{ transitionDelay: `${i * 140}ms` }}
                />
              </span>
              <p>
                <b>{step.title}</b> {step.text}
              </p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
