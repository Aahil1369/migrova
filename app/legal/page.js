import Link from 'next/link';
import Navbar from '../components/Navbar';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';

export const metadata = { title: 'Legal — Migrova' };

const SECTIONS = [
  ['Not legal advice', 'Everything on Migrova — including AI-generated reports — is general information about immigration processes. It is not legal advice and is not a substitute for advice from a licensed immigration attorney who knows your specific situation.'],
  ['No attorney–client relationship', 'Using Migrova does not create an attorney–client relationship with anyone. Migrova is not a law firm and does not employ, list, recommend, or endorse specific lawyers.'],
  ['Accuracy', 'Immigration rules change frequently and vary by case. We work to keep information current, but we cannot guarantee accuracy, completeness, or that information applies to your circumstances. Verify anything important with official government sources or a licensed attorney.'],
  ['AI-generated content', 'Migrova uses AI to summarize publicly available information. AI output can be wrong. Treat every report as a starting point for your own verification, never as a final answer.'],
  ['When to get a lawyer', 'If your case involves prior visa denials, criminal history, deportation or removal proceedings, asylum claims, or anything time-sensitive, talk to a licensed immigration attorney or a DOJ-accredited representative before acting. Our Lawyer Guide links to real directories where you can find one.'],
  ['Contact', 'Questions about this disclaimer? Reach us via the contact page.'],
];

export default function LegalPage() {
  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" /><span>§ LEGAL</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">The fine print, in plain English.</h1>
      </section>
      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-12 max-w-[720px] space-y-10">
          {SECTIONS.map(([title, body]) => (
            <section key={title}>
              <h2 className="font-display text-[24px] mb-2">{title}</h2>
              <p className="text-[14px] text-paper-ink-dim leading-[1.6]">{body}</p>
            </section>
          ))}
          <p className="text-[13px] text-paper-ink-sub">
            Back to <Link href="/" className="underline hover:text-accent">Migrova</Link>.
          </p>
          <Footnote>{FOOTNOTES.legal}</Footnote>
        </div>
      </main>
    </div>
  );
}
