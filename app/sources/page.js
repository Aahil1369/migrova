import ToolShell from '../components/kit/ToolShell';
import ToolHeader from '../components/kit/ToolHeader';
import PassportCard from '../components/kit/PassportCard';
import SourcesIndex from './SourcesIndex';
import SealCount from './SealCount';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { COUNTRIES_195, REGIONS } from '../data/countries195';
import { LINK_TYPES, getSources, countVerified, formatVerified, SOURCES_VERIFIED_AT } from '../lib/officialSources';
import './sources.css';

export const metadata = {
  title: 'Official immigration websites for every country — Migrova',
  description: 'Verified official government links for 195 countries: immigration authorities, visa applications, embassies, work, study and citizenship. Checked and dated — never guessed.',
};

const CHECKS = [
  { n: '01', title: 'It loads securely', body: 'The page opens over HTTPS, and we record where it really lands after any redirects.' },
  { n: '02', title: 'It is on a government domain', body: "The final address sits on that country's official domain — a government-only ending like gov.uk, or an agency site confirmed by the national government or by two independent sources. Never a look-alike." },
  { n: '03', title: 'It is about the right thing', body: 'The page itself names the agency or topic — visas, embassies, work, study or citizenship.' },
  { n: '04', title: 'Someone else agrees', body: "An independent source backs it up: Wikidata lists the site, or another official government page links to it." },
];

// Server component: the sources table is read here, and only per-country counts reach the client.
export default function SourcesPage() {
  const rows = [...COUNTRIES_195]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ code: c.code, name: c.name, flag: c.flag, region: c.region, verified: countVerified(getSources(c.code)) }));
  const totalVerified = rows.reduce((n, r) => n + r.verified, 0);

  return (
    <ToolShell wide header={<ToolHeader {...HERO_COPY.sources} />}>
      <div className="src-page">
        <PassportCard className="src-tally" aria-labelledby="src-tally-h">
          <SealCount total={totalVerified} />
          <h2 id="src-tally-h" className="src-tally-h">{totalVerified} verified government links</h2>
          <p className="src-text">
            Across {COUNTRIES_195.length} countries, checked {formatVerified(SOURCES_VERIFIED_AT)}. Where we couldn&apos;t confirm a link, we leave it empty.
          </p>
        </PassportCard>

        <section aria-labelledby="src-find-h">
          <p className="src-kicker">The directory</p>
          <h2 id="src-find-h" className="src-h2">Find a country</h2>
          <SourcesIndex rows={rows} regions={REGIONS} of={LINK_TYPES.length} />
        </section>

        <section id="how-we-verify" className="src-how" aria-labelledby="src-how-h">
          <p className="src-kicker">How we verify</p>
          <h2 id="src-how-h" className="src-h2">Four checks. No exceptions.</h2>
          <p className="src-text">A link is marked Verified only when it passes every check. If it doesn&apos;t, we say so — we never fill the gap with a guess.</p>
          <ol className="src-checks">
            {CHECKS.map((c) => (
              <PassportCard as="li" key={c.n} className="src-check">
                <span className="src-check-n" aria-hidden="true">NO. {c.n}</span>
                <h3 className="src-check-title">{c.title}</h3>
                <p className="src-check-body">{c.body}</p>
              </PassportCard>
            ))}
          </ol>
          <p className="src-text src-note">
            A handful of genuine portals run on non-government addresses (for example, a tourism authority&apos;s e-visa site). We accept those only when an official government page links to them.
          </p>
        </section>

        <p className="src-footnote">
          <span className="src-footnote-mark" aria-hidden="true">*</span>
          {FOOTNOTES.sources}
        </p>
      </div>
    </ToolShell>
  );
}
