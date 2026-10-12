'use client';

import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import VerifiedLinkCard from './kit/VerifiedLinkCard';
import { linkTypeMeta, domainOf, domainList } from '../lib/sourcesFormat';

// Payloads of /api/sources/<code> already fetched in this tab (one country, about 1 KB each).
const loaded = new Map();
const inFlight = new Map();

/**
 * Fetch one country's official links (/api/sources/<code>) into this tab's cache, once; resolves
 * with the payload, or null for an unknown country or a failed request (not cached, so a later
 * call tries again). Pages call it when a search starts, so the block below the AI result is
 * ready when the result renders instead of popping in (and pushing the report down) after it.
 */
export function prefetchSources(code) {
  if (!code) return Promise.resolve(null);
  if (loaded.has(code)) return Promise.resolve(loaded.get(code));
  if (!inFlight.has(code)) {
    const request = fetch(`/api/sources/${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((payload) => {
        inFlight.delete(code);
        if (payload) loaded.set(code, payload);
        return payload;
      });
    inFlight.set(code, request);
  }
  return inFlight.get(code);
}

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

  useEffect(() => {
    if (!code || loaded.has(code)) return undefined;
    let live = true;
    prefetchSources(code).then((payload) => {
      if (live) setFetched({ code, payload });
    });
    return () => {
      live = false;
    };
  }, [code]);

  const entry = loaded.get(code) || (fetched && fetched.code === code ? fetched.payload : null);
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
