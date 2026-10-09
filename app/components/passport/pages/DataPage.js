'use client';

import Link from 'next/link';
import { countryByCode } from '../../../data/countries195';
import { buildMrz, MRZ_PLAIN } from '../mrz';
import { usePassport } from '../PassportContext';
import './pages.css';

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
 * "Your 5 best matches"), a line-art family photo, "Find my countries →" and the two static
 * MRZ lines built from the route (ANY when unset).
 */
export default function DataPage() {
  const { route } = usePassport();
  const from = countryByCode(route?.from);
  const to = route?.to && route.to !== 'any' ? countryByCode(route.to) : null;
  const [line1, line2] = buildMrz({ fromIso3: from?.iso3, toIso3: to?.iso3 });

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
      <div className="jbp-mrz" role="img" aria-label={`Machine-readable zone: ${MRZ_PLAIN.join(' ')}`}>
        <span>{line1}</span>
        <span>{line2}</span>
      </div>
    </section>
  );
}
