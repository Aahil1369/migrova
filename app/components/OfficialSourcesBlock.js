'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import VerifiedLinkCard from './kit/VerifiedLinkCard';
import { linkTypeMeta, domainOf, domainList } from '../lib/sourcesFormat';
import { cachedSources, watchSources } from './officialSourcesCache';

/**
 * Verified official links for one country (`code`), shown inside Visa / Relocate results: one
 * VerifiedLinkCard per link type in `types` that we have verified, the official government
 * domains, and a link to the country's sources page. The links come from /api/sources/<code>
 * (prefetchSources), never from the bundled 195-country table. Renders nothing until they are
 * loaded, for an unknown country, or if the request fails.
 */
export default function OfficialSourcesBlock({ code, types }) {
  const headingId = useId();
  // { code, payload } for the last fetch, so a payload for an old code is never shown for a new one.
  const [fetched, setFetched] = useState(null);

  // Always subscribed, even when the payload is already cached (see watchSources).
  useEffect(() => watchSources(code, (payload) => setFetched({ code, payload })), [code]);

  const entry = cachedSources(code) || (fetched && fetched.code === code ? fetched.payload : null);
  if (!code || !entry) return null;
  const rows = types.map((t) => [t, entry.links?.[t]]).filter(([, l]) => l?.status === 'verified' && l.url);

  return (
    <section className="flex flex-col gap-3" aria-labelledby={headingId}>
      <h3 id={headingId} className="m-0 text-[22px] font-extrabold leading-[1.2] tracking-[-0.01em] text-page-ink">
        {`Official links · ${entry.name}`}
      </h3>
      {rows.length > 0 ? (
        <ul className="m-0 grid list-none gap-3 p-0">
          {rows.map(([t, l]) => (
            <li key={t}>
              <VerifiedLinkCard
                href={l.url}
                title={linkTypeMeta(t)?.label ?? t}
                domain={domainOf(l.url)}
                note={l.title}
                verifiedAt={entry.verifiedAt}
              />
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-[16px] leading-[1.55] text-paper-ink-dim">We haven&apos;t been able to verify official links for these topics yet.</p>
      )}
      {entry.domains?.length > 0 && (
        <p className="m-0 text-[16px] leading-[1.55] text-paper-ink-dim">
          Official government domains: <strong className="font-bold text-page-ink">{domainList(entry.domains)}</strong>. Look-alike agent sites often charge extra fees.
        </p>
      )}
      <Link href={`/sources/${entry.code}`} className="self-start rounded-sm text-[16px] font-bold text-page-ink underline decoration-[1.5px] underline-offset-4 hover:decoration-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-page-ink">
        All official links for {entry.name} →
      </Link>
    </section>
  );
}
