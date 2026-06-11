'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Navbar from './components/Navbar';
import EditorialHero from './components/ui/EditorialHero';
import SectionHead from './components/ui/SectionHead';
import Btn from './components/ui/Btn';
import Glyph from './components/ui/Glyph';
import Footnote from './components/ui/Footnote';
import { useScrollReveal } from './components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from './lib/pageCopy';

const TOOLS = [
  { n: '01', tag: 'MATCH', href: '/match',    glyph: 'compass',  name: 'Country Match',     desc: 'Top 5 countries where you actually have a shot.' },
  { n: '02', tag: 'VISA',  href: '/visa',     glyph: 'passport', name: 'Visa Intelligence', desc: 'Checklists, timelines, embassy tips — by country.' },
  { n: '03', tag: 'RLC',   href: '/relocate', glyph: 'suitcase', name: 'Relocation Guide',  desc: 'Cost, housing, SIM, expat community, step-by-step.' },
  { n: '04', tag: 'LAW',   href: '/lawyer',   glyph: 'document', name: 'Lawyer Guide',      desc: 'Fees, questions, red flags, free legal aid — and real directories.' },
];

const HOW_IT_WORKS = [
  { n: '01', title: 'Tell us about you',  body: 'Nationality, family, where you want to go. 60 seconds.' },
  { n: '02', title: 'See your options',   body: 'Countries ranked by your real visa access.' },
  { n: '03', title: 'Understand the path', body: 'Documents, timelines, costs — in plain English.' },
  { n: '04', title: 'Get real help',      body: 'Know what lawyers cost, what to ask, and where to find free aid.' },
];

export default function Home() {
  useScrollReveal();
  const [stories, setStories] = useState([]);

  useEffect(() => {
    fetch('/api/stories')
      .then((r) => r.json())
      .then((d) => setStories((d.stories || []).slice(0, 3)))
      .catch(() => {});
  }, []);

  const hero = HERO_COPY.home;

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />

      <EditorialHero
        kicker={hero.kicker}
        title={hero.title}
        titleItalic={hero.italic}
        titleTail={hero.tail}
        sub={hero.sub}
        meta={['MIGROVA · EST. 2026', '100 COUNTRIES', 'INFORMATION, NOT LEGAL ADVICE']}
        cta={<Btn variant="primary" href="/match" magnetic>Find my countries →</Btn>}
        secondaryCta={<Btn variant="secondary" href="/lawyer">Lawyer guide</Btn>}
      />

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead
          number={1}
          kicker="TOOLS"
          title="Your move, mapped."
          sub="Four tools. Each one answers a question families ask before they move."
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-0 mt-14 border-t border-l border-paper-rule">
          {TOOLS.map((t) => (
            <Link key={t.href} href={t.href}
              className="group block p-8 border-r border-b border-paper-rule bg-paper-bg hover:bg-paper-bg-alt transition-colors">
              <div className="text-paper-ink mb-6"><Glyph name={t.glyph} size={36} /></div>
              <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-2">№ {t.n} — {t.tag}</div>
              <div className="font-display text-[22px] leading-[1.15] mb-2">{t.name}</div>
              <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{t.desc}</div>
            </Link>
          ))}
        </div>
      </section>

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
        <SectionHead number={2} kicker="HOW IT WORKS" title="Four steps, no guesswork." />
        <ol className="mt-14 grid grid-cols-1 md:grid-cols-4 gap-0 border-t border-l border-paper-rule">
          {HOW_IT_WORKS.map((s) => (
            <li key={s.n} className="p-8 border-r border-b border-paper-rule">
              <div className="font-display italic text-[32px] text-accent mb-3">№{s.n}</div>
              <div className="font-display text-[20px] mb-2">{s.title}</div>
              <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{s.body}</div>
            </li>
          ))}
        </ol>
      </section>

      {stories.length > 0 && (
        <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-20 border-t border-paper-rule">
          <SectionHead number={3} kicker="FIELD REPORTS" title="People who made the move." />
          <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-0 border-t border-l border-paper-rule">
            {stories.map((s) => (
              <figure key={s.id} className="p-8 border-r border-b border-paper-rule">
                <blockquote className="font-display text-[18px] leading-[1.4] text-paper-ink mb-6">
                  &ldquo;{(s.story_text || '').slice(0, 160)}{(s.story_text || '').length > 160 ? '…' : ''}&rdquo;
                </blockquote>
                <figcaption className="font-mono text-[11px] tracking-[0.08em] text-paper-ink-sub">
                  {s.from_country} <span className="text-accent">→</span> {s.current_country}
                </figcaption>
              </figure>
            ))}
          </div>
          <div className="mt-8"><Btn variant="ghost" href="/stories">All stories →</Btn></div>
        </section>
      )}

      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-28 border-t border-paper-rule">
        <div className="max-w-[780px]">
          <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-6">§ BEGIN</div>
          <h2 className="font-display text-[48px] sm:text-[64px] leading-[1.02] tracking-[-0.015em] mb-8">
            60 seconds from here to <em className="italic text-accent">somewhere new</em>.
          </h2>
          <div className="flex flex-wrap gap-3">
            <Btn variant="primary" href="/match" magnetic>Find my countries →</Btn>
            <Btn variant="ghost" href="/visa">Check a visa</Btn>
          </div>
          <Footnote>{FOOTNOTES.home}</Footnote>
        </div>
      </section>

      <footer className="border-t border-paper-rule px-6 sm:px-10 py-10 font-mono text-[10px] tracking-[0.1em] uppercase text-paper-ink-sub max-w-[1280px] mx-auto">
        <div className="flex flex-wrap justify-between gap-4 mb-4">
          <span>© Migrova 2026</span>
          <span>A sibling of <a href="https://opportumap.netlify.app" className="hover:text-accent underline">OpportuMap</a></span>
          <span><Link href="/contact" className="hover:text-accent">Contact</Link> · <Link href="/stories" className="hover:text-accent">Stories</Link> · <Link href="/legal" className="hover:text-accent">Legal</Link></span>
        </div>
      </footer>
      {/* site-wide legal one-liner comes from LegalFooter in layout.js (Task 7) */}
    </div>
  );
}
