import Link from 'next/link';
import { notFound } from 'next/navigation';
import ToolShell from '../../components/kit/ToolShell';
import ToolHeader from '../../components/kit/ToolHeader';
import VerifiedLinkCard from '../../components/kit/VerifiedLinkCard';
import Btn from '../../components/ui/Btn';
import UvCheck from '../UvCheck';
import { uvPair } from '../uvPair';
import { FOOTNOTES } from '../../lib/pageCopy';
import { COUNTRIES_195, countryByCode } from '../../data/countries195';
import { LINK_TYPES, getSources, countVerified, domainOf, domainList, formatVerified, SOURCES_VERIFIED_AT } from '../../lib/officialSources';
import '../sources.css';

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

// One link type as a card: verified links are real links (VerifiedLinkCard); the rest stay dashed
// and are never clickable.
function SourceCard({ type, link }) {
  if (link?.status === 'verified' && link.url) {
    return <VerifiedLinkCard href={link.url} title={type.label} domain={domainOf(link.url)} note={link.name} verifiedAt={link.verifiedAt} />;
  }
  if (link?.status === 'not_applicable') {
    return <VerifiedLinkCard verified={false} title={`${type.label} — not applicable`} note={link.note} />;
  }
  return <VerifiedLinkCard verified={false} title={type.label} />;
}

// Server component: the sources table is read here; the client UvCheck only gets the pair.
export default async function CountrySourcesPage({ params }) {
  const { code } = await params;
  const country = countryByCode(code);
  const entry = getSources(code);
  const pair = uvPair(code);
  if (!country || !entry || !pair) notFound();
  const verified = countVerified(entry);
  const checked = formatVerified(SOURCES_VERIFIED_AT);

  const header = (
    <ToolHeader
      code="S-SOURCES"
      name={`OFFICIAL SOURCES · ${country.region}`}
      title={
        <>
          <span aria-hidden="true">{country.flag}</span> Official sites for
        </>
      }
      accent={`${country.name}.`}
      sub={
        verified > 0
          ? `${verified} of ${LINK_TYPES.length} official government links verified on ${checked}.`
          : `We haven't been able to verify official links for ${country.name} yet. We'd rather show nothing than a guess.`
      }
    />
  );

  return (
    <ToolShell wide header={header}>
      <div className="src-page">
        <Link href="/sources" className="src-back">← All countries</Link>

        <section aria-labelledby="src-uv-h">
          <p className="src-kicker">UV check</p>
          <h2 id="src-uv-h" className="src-h2">Real site or look-alike?</h2>
          <p className="src-text">
            Look-alike &quot;visa service&quot; sites copy the official design and charge extra fees. Under the lamp, only one of these is the real thing.
          </p>
          <UvCheck real={pair.real} fake={pair.fake} name={country.name} />
          {entry.govDomains.length > 0 && (
            <p className="src-spot">
              Official {country.name} government sites end in <strong>{domainList(entry.govDomains)}</strong>. If the address
              doesn&apos;t match, don&apos;t pay.
            </p>
          )}
        </section>

        <section aria-labelledby="src-links-h">
          <p className="src-kicker">{`${verified} of ${LINK_TYPES.length} verified · checked ${checked}`}</p>
          <h2 id="src-links-h" className="src-h2">All official links</h2>
          <ul className="src-links">
            {LINK_TYPES.map((t) => (
              <li key={t.key}>
                <SourceCard type={t} link={entry.links[t.key]} />
              </li>
            ))}
          </ul>
          <Link href="/sources#how-we-verify" className="src-more">How we verify a link →</Link>
        </section>

        <div className="src-ctas">
          <Btn href={`/visa?to=${country.code}`} variant="primary">Check a visa for {country.name} →</Btn>
          <Btn href={`/relocate?dest=${encodeURIComponent(country.name)}`} variant="secondary">Relocation guide</Btn>
        </div>

        <p className="src-footnote">
          <span className="src-footnote-mark" aria-hidden="true">*</span>
          {FOOTNOTES.sources}
        </p>
      </div>
    </ToolShell>
  );
}
