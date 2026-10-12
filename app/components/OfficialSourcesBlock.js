'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { linkTypeMeta, domainOf, domainList } from '../lib/sourcesFormat';

// Verified official links for one country, shown inside Visa / Relocate results.
// The links come from /api/sources/<code> (one country, about 1 KB) instead of the bundled
// 195-country table. Renders nothing while loading, for an unknown country, or if the fetch fails.
export default function OfficialSourcesBlock({ code, types }) {
  // { code, payload } for the last fetch, so a payload for an old code is never shown for a new one.
  const [loaded, setLoaded] = useState(null);

  useEffect(() => {
    if (!code) return undefined;
    let live = true;
    fetch(`/api/sources/${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((payload) => { if (live) setLoaded({ code, payload }); });
    return () => { live = false; };
  }, [code]);

  const entry = loaded && loaded.code === code ? loaded.payload : null;
  if (!entry) return null;
  const rows = types.map((t) => [t, entry.links?.[t]]).filter(([, l]) => l?.status === 'verified' && l.url);

  return (
    <div className="border border-paper-rule bg-paper-bg-alt p-5">
      <h3 className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">{`// OFFICIAL SOURCES — ${entry.name.toUpperCase()}`}</h3>
      {rows.length > 0 ? (
        <ul className="divide-y divide-paper-rule border-y border-paper-rule">
          {rows.map(([t, l]) => (
            <li key={t}>
              <a href={l.url} target="_blank" rel="noopener noreferrer" className="group flex items-center justify-between gap-4 py-3">
                <span>
                  <span className="block font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub">{linkTypeMeta(t).label}</span>
                  <span className="text-[14px] text-paper-ink group-hover:text-accent break-all">{domainOf(l.url)}</span>
                </span>
                <span className="text-[12px] text-paper-ink-sub group-hover:text-accent flex-shrink-0">Open ↗</span>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[12px] text-paper-ink-dim">We haven&apos;t been able to verify official links for these topics yet.</p>
      )}
      {entry.domains.length > 0 && (
        <p className="mt-3 text-[12px] leading-[1.5] text-paper-ink-dim">
          Official government domains: <span className="font-medium text-paper-ink">{domainList(entry.domains)}</span>. Look-alike agent sites often charge extra fees.
        </p>
      )}
      <Link href={`/sources/${entry.code}`} className="mt-3 inline-block text-[12px] font-medium text-paper-ink hover:text-accent">
        All official links for {entry.name} →
      </Link>
    </div>
  );
}
