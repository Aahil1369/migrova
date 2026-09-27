import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import SectionHead from '../components/ui/SectionHead';
import Footnote from '../components/ui/Footnote';
import SourcesIndex from './SourcesIndex';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { COUNTRIES_195, REGIONS } from '../data/countries195';
import { getSources, countVerified, formatVerified, SOURCES_VERIFIED_AT } from '../lib/officialSources';

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

export default function SourcesPage() {
  const hero = HERO_COPY.sources;
  const rows = [...COUNTRIES_195]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => ({ code: c.code, name: c.name, flag: c.flag, region: c.region, verified: countVerified(getSources(c.code)) }));
  const totalVerified = rows.reduce((n, r) => n + r.verified, 0);

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['195 COUNTRIES', `${totalVerified} VERIFIED LINKS`, `CHECKED ${formatVerified(SOURCES_VERIFIED_AT).toUpperCase()}`]}
      />

      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <section className="py-14">
          <SourcesIndex rows={rows} regions={REGIONS} />
        </section>

        <section className="py-14 border-t border-paper-rule">
          <SectionHead number={1} kicker="HOW WE VERIFY" title="Four checks. No exceptions." sub="A link is marked Verified only when it passes every check. If it doesn't, we say so — we never fill the gap with a guess." />
          <ol className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 border-t border-l border-paper-rule">
            {CHECKS.map((c) => (
              <li key={c.n} className="p-7 border-r border-b border-paper-rule">
                <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">№ {c.n}</div>
                <div className="font-display text-[22px] leading-[1.15] mb-2">{c.title}</div>
                <p className="text-[13px] leading-[1.55] text-paper-ink-dim">{c.body}</p>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-[13px] leading-[1.55] text-paper-ink-dim max-w-[70ch]">
            A handful of genuine portals run on non-government addresses (for example, a tourism authority&apos;s e-visa site). We accept those only when an official government page links to them.
          </p>
        </section>

        <Footnote>{FOOTNOTES.sources}</Footnote>
      </main>
    </div>
  );
}
