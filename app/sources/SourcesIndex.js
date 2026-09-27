'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';

// rows: [{ code, name, flag, region, verified }] — computed on the server so
// the full sources dataset isn't shipped to the browser.
export default function SourcesIndex({ rows, regions }) {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('All');

  const shown = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => (region === 'All' || r.region === region) && (!q || r.name.toLowerCase().includes(q)));
  }, [rows, query, region]);

  const pill = (active) => `px-3 py-1.5 font-mono text-[10px] tracking-[0.1em] uppercase border transition-colors ${
    active ? 'bg-paper-ink text-paper-bg border-paper-ink' : 'border-paper-rule text-paper-ink-sub hover:border-paper-ink hover:text-paper-ink'}`;

  return (
    <div>
      <div className="flex flex-col lg:flex-row lg:items-center gap-4 mb-8">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a country…"
          aria-label="Search a country"
          className="w-full lg:max-w-[360px] px-4 py-3 bg-paper-bg border border-paper-rule text-paper-ink text-[14px] outline-none focus:border-accent"
        />
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by region">
          {['All', ...regions].map((r) => (
            <button key={r} type="button" onClick={() => setRegion(r)} className={pill(region === r)} aria-pressed={region === r}>{r}</button>
          ))}
        </div>
      </div>

      <p className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-3">{shown.length} {shown.length === 1 ? 'country' : 'countries'}</p>
      {shown.length === 0 ? (
        <p className="py-10 text-[14px] text-paper-ink-dim">No country matches “{query}”.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-t border-l border-paper-rule">
          {shown.map((r) => (
            <li key={r.code} className="border-r border-b border-paper-rule">
              <Link href={`/sources/${r.code}`} className="group flex items-center justify-between gap-3 px-5 py-4 bg-paper-bg hover:bg-paper-bg-alt transition-colors">
                <span className="flex items-center gap-3 min-w-0">
                  <span className="text-[20px]" aria-hidden>{r.flag}</span>
                  <span className="text-[15px] text-paper-ink group-hover:text-accent truncate">{r.name}</span>
                </span>
                <span className={`font-mono text-[10px] tracking-[0.08em] flex-shrink-0 ${r.verified ? 'text-[#5a7d3f]' : 'text-paper-ink-sub'}`}>
                  {r.verified}/6 VERIFIED
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
