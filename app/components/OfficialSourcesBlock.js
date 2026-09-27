import Link from 'next/link';
import { getSources, linkTypeMeta, domainOf, domainList } from '../lib/officialSources';
import { countryByCode } from '../data/countries195';

// Verified official links for one country, shown inside Visa / Relocate results.
// Renders nothing if we have no entry for the country.
export default function OfficialSourcesBlock({ code, types }) {
  const entry = getSources(code);
  const country = countryByCode(code);
  if (!entry || !country) return null;
  const rows = types.map((t) => [t, entry.links[t]]).filter(([, l]) => l?.status === 'verified');

  return (
    <div className="border border-paper-rule bg-paper-bg-alt p-5">
      <h3 className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">// OFFICIAL SOURCES — {country.name.toUpperCase()}</h3>
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
      {entry.govDomains.length > 0 && (
        <p className="mt-3 text-[12px] leading-[1.5] text-paper-ink-dim">
          Official government domains: <span className="font-medium text-paper-ink">{domainList(entry.govDomains)}</span>. Look-alike agent sites often charge extra fees.
        </p>
      )}
      <Link href={`/sources/${country.code}`} className="mt-3 inline-block text-[12px] font-medium text-paper-ink hover:text-accent">
        All official links for {country.name} →
      </Link>
    </div>
  );
}
