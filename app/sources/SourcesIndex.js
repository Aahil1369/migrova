'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import Chip from '../components/kit/Chip';

/**
 * The /sources directory: a search box, the regions as passport tab dividers (Chips: buttons with
 * aria-pressed) and one paper row per country with its "n / 6 VERIFIED" seal.
 * rows: [{ code, name, flag, region, verified }] and `of` (link types per country) are computed on
 * the server, so the sources table itself never reaches the browser.
 */
export default function SourcesIndex({ rows, regions, of }) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (region === 'All' || r.region === region) && (!q || r.name.toLowerCase().includes(q)));
  }, [rows, query, region]);

  return (
    <div className="src-index">
      <label htmlFor="src-search" className="src-kicker src-search-label">Search a country</label>
      <input
        id="src-search"
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Country name…"
        autoComplete="off"
        className="kit-input src-search"
      />

      <div className="src-tabs" role="group" aria-label="Filter by region">
        {['All', ...regions].map((r) => (
          <Chip key={r} pressed={region === r} onClick={() => setRegion(r)}>
            {r}
          </Chip>
        ))}
      </div>

      <p className="src-count" role="status">
        {shown.length} {shown.length === 1 ? 'country' : 'countries'}
      </p>
      {shown.length === 0 ? (
        <p className="src-empty">No country matches “{query.trim()}”{region === 'All' ? '' : ` in ${region}`}.</p>
      ) : (
        <ul className="src-rows">
          {shown.map((r) => (
            <li key={r.code}>
              {/* No viewport prefetch: scrolling 195 rows would fetch every country page that
                  passes by (several requests each, on phone data). A tap fetches the one it needs. */}
              <Link href={`/sources/${r.code}`} prefetch={false} className="src-row">
                <span className="src-row-flag" aria-hidden="true">{r.flag}</span>
                <span className="src-row-name">{r.name}</span>
                <span className="src-row-seal" data-none={r.verified ? undefined : ''} aria-hidden="true">
                  {r.verified} / {of} VERIFIED
                </span>
                <span className="sr-only">{`, ${r.verified} of ${of} official links verified`}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
