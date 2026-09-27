import Link from 'next/link';
import { notFound } from 'next/navigation';
import Navbar from '../../components/Navbar';
import Btn from '../../components/ui/Btn';
import Footnote from '../../components/ui/Footnote';
import SourceLinkCard from '../../components/SourceLinkCard';
import { FOOTNOTES } from '../../lib/pageCopy';
import { COUNTRIES_195, countryByCode } from '../../data/countries195';
import { LINK_TYPES, getSources, countVerified, domainList, formatVerified, SOURCES_VERIFIED_AT } from '../../lib/officialSources';

export const dynamicParams = false;

export function generateStaticParams() {
  return COUNTRIES_195.map((c) => ({ code: c.code }));
}

export async function generateMetadata({ params }) {
  const { code } = await params;
  const c = countryByCode(code);
  if (!c) return {};
  return {
    title: `Official ${c.name} immigration & visa websites — Migrova`,
    description: `Verified official government links for ${c.name}: immigration authority, visa application, embassies, work, study and citizenship. Checked and dated by Migrova.`,
  };
}

export default async function CountrySourcesPage({ params }) {
  const { code } = await params;
  const country = countryByCode(code);
  const entry = getSources(code);
  if (!country || !entry) notFound();
  const verified = countVerified(entry);

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <header className="max-w-[1280px] mx-auto px-6 sm:px-10 pt-14 pb-12">
        <Link href="/sources" className="font-mono text-[11px] tracking-[0.12em] uppercase text-paper-ink-sub hover:text-accent">← All countries</Link>
        <div className="mt-8 font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" />
          <span>§ Official Sources · {country.region}</span>
        </div>
        <h1 className="mt-5 font-display text-[48px] sm:text-[64px] leading-[1] tracking-[-0.02em] font-normal">
          <span aria-hidden className="mr-3">{country.flag}</span>{country.name}
        </h1>
        <p className="mt-5 text-[16px] leading-[1.55] text-paper-ink-dim max-w-[60ch]">
          {verified > 0
            ? `${verified} of 6 official government links verified on ${formatVerified(SOURCES_VERIFIED_AT)}.`
            : `We haven't been able to verify official links for ${country.name} yet. We'd rather show nothing than a guess.`}
        </p>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        {entry.govDomains.length > 0 && (
          <div className="mt-12 border border-accent/40 bg-paper-bg-alt px-6 py-5 max-w-[820px]">
            <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-2">// HOW TO SPOT THE REAL SITE</div>
            <p className="text-[14px] leading-[1.55] text-paper-ink">
              Official {country.name} government sites end in <span className="font-medium">{domainList(entry.govDomains)}</span>.
            </p>
            <p className="mt-1.5 text-[13px] leading-[1.55] text-paper-ink-dim">
              Look-alike &quot;visa service&quot; sites copy official designs and charge extra fees. If the address doesn&apos;t match, don&apos;t pay.
            </p>
          </div>
        )}

        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {LINK_TYPES.map((t) => <SourceLinkCard key={t.key} type={t.key} link={entry.links[t.key]} />)}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Btn href={`/visa?to=${country.code}`} variant="primary">Check a visa for {country.name} →</Btn>
          <Btn href={`/relocate?dest=${encodeURIComponent(country.name)}`} variant="secondary">Relocation guide</Btn>
        </div>

        <Footnote>{FOOTNOTES.sources}</Footnote>
      </main>
    </div>
  );
}
