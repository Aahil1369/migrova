'use client';

import { useState } from 'react';
import Navbar from '../components/Navbar';
import EditorialHero from '../components/ui/EditorialHero';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import DisclaimerBlock from '../components/DisclaimerBlock';
import LegalAckModal, { hasLegalAck } from '../components/LegalAckModal';
import { useScrollReveal } from '../components/ui/hooks/useScrollReveal';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { LAWYER_DIRECTORIES } from '../lib/lawyerDirectories';

const CASE_TYPES = ['Work visa', 'Family reunification', 'Green card', 'Asylum', 'Citizenship', 'Student visa'];
const BUDGETS = ['Need free help', 'Low', 'Medium', 'High'];

export default function LawyerPage() {
  useScrollReveal();
  const [caseType, setCaseType] = useState(CASE_TYPES[0]);
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState('');
  const [language, setLanguage] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAck, setShowAck] = useState(false);

  async function runGuide() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch('/api/lawyer-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caseType, destination, budget, language }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!destination.trim()) return;
    if (!hasLegalAck()) { setShowAck(true); return; }
    runGuide();
  }

  const hero = HERO_COPY.lawyer;
  const inputCls = 'bg-paper-bg border border-paper-rule text-paper-ink text-[14px] px-4 py-3 focus:border-accent outline-none w-full';

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <EditorialHero
        kicker={hero.kicker} title={hero.title} titleItalic={hero.italic} titleTail={hero.tail} sub={hero.sub}
        meta={['TYPICAL FEES BY CASE TYPE', 'RED FLAGS + CONSULT QUESTIONS', 'REAL DIRECTORIES ONLY']}
      />
      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-14 grid grid-cols-1 lg:grid-cols-[0.9fr_1.3fr] gap-12">
          <form onSubmit={handleSubmit} className="space-y-6 max-w-[440px]">
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">CASE TYPE</label>
              <div className="flex flex-wrap gap-2">
                {CASE_TYPES.map((c) => (
                  <button type="button" key={c} onClick={() => setCaseType(c)}
                    className={`px-3 py-1.5 font-mono text-[11px] transition-colors ${caseType === c ? 'bg-paper-ink text-paper-bg' : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'}`}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">DESTINATION (STATE OR COUNTRY)</label>
              <input className={inputCls} value={destination} onChange={(e) => setDestination(e.target.value)} placeholder="e.g. Texas, USA" />
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">BUDGET (OPTIONAL)</label>
              <div className="flex flex-wrap gap-2">
                {BUDGETS.map((b) => (
                  <button type="button" key={b} onClick={() => setBudget(budget === b ? '' : b)}
                    className={`px-3 py-1.5 font-mono text-[11px] transition-colors ${budget === b ? 'bg-paper-ink text-paper-bg' : 'border border-paper-rule text-paper-ink hover:bg-paper-bg-alt'}`}>
                    {b}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub block mb-2">PREFERRED LANGUAGE (OPTIONAL)</label>
              <input className={inputCls} value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="e.g. Urdu" />
            </div>
            <Btn as="button" type="submit" variant="primary" disabled={loading || !destination.trim()} className="disabled:opacity-40">
              {loading ? 'Building your guide…' : 'Build my guide →'}
            </Btn>
          </form>

          <div>
            {loading && (
              <div className="py-20 text-center font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub animate-pulse">
                GATHERING GENERAL FEE + LEGAL AID INFORMATION…
              </div>
            )}
            {error && (
              <div className="border border-accent/40 bg-paper-bg-alt p-6 max-w-[520px]">
                <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-2">// ERROR</div>
                <p className="text-[14px] text-paper-ink-dim mb-4">{error}</p>
                <Btn as="button" variant="secondary" onClick={runGuide}>Try again</Btn>
              </div>
            )}
            {result && (
              <div className="space-y-10">
                <DisclaimerBlock />
                {result.process_overview && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// HOW IT USUALLY WORKS</div>
                    <p className="text-[15px] text-paper-ink leading-[1.6] max-w-[60ch]">{result.process_overview}</p>
                  </section>
                )}
                {result.fee_ranges.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// TYPICAL FEES</div>
                    <div className="border border-paper-rule">
                      {result.fee_ranges.map((f, i) => (
                        <div key={i} className="grid grid-cols-[1fr_auto] gap-4 px-5 py-4 border-b border-paper-rule last:border-b-0">
                          <div>
                            <div className="text-[14px] font-medium text-paper-ink">{f.stage}</div>
                            {f.notes && <div className="text-[12px] text-paper-ink-dim mt-1">{f.notes}</div>}
                          </div>
                          <div className="font-display text-[18px] text-accent whitespace-nowrap">{f.range}</div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {result.consult_questions.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// ASK IN THE FIRST CONSULT</div>
                    <ul className="space-y-2">
                      {result.consult_questions.map((q, i) => (
                        <li key={i} className="text-[14px] text-paper-ink-dim leading-[1.5] pl-5 relative">
                          <span className="absolute left-0 text-accent">→</span>{q}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.red_flags.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-3">// RED FLAGS — WALK AWAY</div>
                    <ul className="space-y-2">
                      {result.red_flags.map((r, i) => (
                        <li key={i} className="text-[14px] text-paper-ink-dim leading-[1.5] pl-5 relative">
                          <span className="absolute left-0 text-accent">✗</span>{r}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                {result.low_cost_options.length > 0 && (
                  <section>
                    <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-3">// FREE + LOW-COST ROUTES</div>
                    <ul className="space-y-2">
                      {result.low_cost_options.map((o, i) => (
                        <li key={i} className="text-[14px] text-paper-ink-dim leading-[1.5] pl-5 relative">
                          <span className="absolute left-0 text-accent">→</span>{o}
                        </li>
                      ))}
                    </ul>
                  </section>
                )}
                <p className="text-[12px] text-paper-ink-sub italic">{result.disclaimer}</p>
              </div>
            )}
          </div>
        </div>

        <section className="border-t border-paper-rule pt-12">
          <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-6">// FIND A REAL LAWYER — TRUSTED DIRECTORIES</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-0 border-t border-l border-paper-rule">
            {LAWYER_DIRECTORIES.map((d) => (
              <a key={d.url} href={d.url} target="_blank" rel="noopener noreferrer"
                className="block p-6 border-r border-b border-paper-rule hover:bg-paper-bg-alt transition-colors">
                <div className="font-display text-[18px] mb-1">{d.name} ↗</div>
                <div className="text-[13px] text-paper-ink-dim leading-[1.5]">{d.desc}</div>
              </a>
            ))}
          </div>
        </section>

        <Footnote>{FOOTNOTES.lawyer}</Footnote>
      </main>
      <LegalAckModal open={showAck} onAccept={() => { setShowAck(false); runGuide(); }} onClose={() => setShowAck(false)} />
    </div>
  );
}
