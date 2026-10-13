'use client';

import { useEffect, useId, useState } from 'react';
import ToolShell from '../components/kit/ToolShell';
import ToolHeader from '../components/kit/ToolHeader';
import PassportCard from '../components/kit/PassportCard';
import Chip from '../components/kit/Chip';
import Vignette from '../components/kit/Vignette';
import ChecklistPage from '../components/kit/ChecklistPage';
import ResultArrival from '../components/kit/ResultArrival';
import { CrossGlyph } from '../components/kit/Glyphs';
import { createLatest } from '../components/kit/createLatest';
import Btn from '../components/ui/Btn';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { friendlyError } from '../lib/friendlyError';
import { NATIONALITIES } from '../data/countries';
import { COUNTRIES_195 } from '../data/countries195';
import { visaPrefill } from '../components/passport/search';
import { readRoute } from '../components/passport/routeStore';
import { deviceStorage } from '../components/passport/useSavedRoute';
import OfficialSourcesBlock from '../components/OfficialSourcesBlock';
import { prefetchSources } from '../components/officialSourcesCache';
import VisaProbabilityMeter from '../components/VisaProbabilityMeter';
import DisclaimerBlock from '../components/DisclaimerBlock';
import LegalAckModal, { hasLegalAck } from '../components/LegalAckModal';
import IssuedVisa, { VISA_HEADING_ID } from './IssuedVisa';
import { checklistItems, docsKey, MISSING_FIELDS, visaSubmitStep } from './visaReport';
import './visa.css';

const COUNTRIES = [...COUNTRIES_195]
  .sort((x, y) => x.name.localeCompare(y.name))
  .map((c) => ({ code: c.code, label: `${c.name} ${c.flag}` }));

// The value is what the APIs receive (unchanged from before); the label is the chip.
const PURPOSES = [
  { value: 'work', label: 'Work' },
  { value: 'study', label: 'Study' },
  { value: 'tourist', label: 'Tourist' },
  { value: 'permanent residency', label: 'Permanent Residency' },
  { value: 'digital nomad', label: 'Digital Nomad' },
];

// Vignette tint per visa purpose (visa.css), so the visa types read as different stickers.
const VIGNETTE_TYPES = { work: 'V-WORK', study: 'V-STUDY', tourist: 'V-TOUR', 'permanent residency': 'V-PR', 'digital nomad': 'V-NOMAD' };

const IMPORTANCE = { critical: 'Critical', important: 'Important', helpful: 'Helpful' };

// table[key] for an own key only (AI text like "constructor" must not reach Object.prototype).
const lookup = (table, key) => (Object.hasOwn(table, key) ? table[key] : undefined);

// A trimmed string ('' for anything that is not a string or number) and an array ([] for
// anything that is not one): the AI's JSON may be partial or malformed, so nothing is trusted.
const text = (value) => (typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '');
const list = (value) => (Array.isArray(value) ? value : []);
const words = (value) => text(value).toLowerCase().replace(/\s+/g, ' ');
const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');

// POST JSON and resolve with the parsed body, or null when the call failed in any way (network
// error, non-JSON reply, non-2xx, or an { error } body). Never rejects.
async function postJson(url, body) {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    return res.ok && data && !data.error ? data : null;
  } catch {
    return null;
  }
}

// One report section on paper: a kicker, an h3 under the visa's h2, then its content.
function Section({ kicker, title, className = '', children }) {
  const id = useId();
  return (
    <PassportCard className={`visa-section ${className}`} aria-labelledby={id}>
      {kicker ? <p className="visa-kicker">{kicker}</p> : null}
      <h3 id={id} className="visa-h3">{title}</h3>
      {children}
    </PassportCard>
  );
}

function Fact({ term, children }) {
  if (!children) return null;
  return (
    <div>
      <dt>{term}</dt>
      <dd>{children}</dd>
    </div>
  );
}

// A visa type as a vignette sticker that opens for its details (the whole sticker is the toggle).
function VisaTypeCard({ visa }) {
  const name = text(visa?.name) || 'Visa';
  const purpose = words(visa?.purpose);
  const requirements = list(visa?.requirements).map(text).filter(Boolean);
  const difficulty = words(visa?.difficulty);
  return (
    <details className="visa-type">
      <summary className="visa-type-summary">
        <Vignette
          as="div"
          type={lookup(VIGNETTE_TYPES, purpose) ?? 'V-VISA'}
          title={name}
          desc={[capitalize(purpose), text(visa?.duration)].filter(Boolean).join(' · ')}
        />
        <span className="visa-type-more" aria-hidden="true" />
      </summary>
      <div className="visa-type-body">
        <dl className="visa-facts">
          <Fact term="Fee">{text(visa?.cost)}</Fact>
          <Fact term="Processing">{text(visa?.processingTime)}</Fact>
          <Fact term="Valid for">{text(visa?.validity)}</Fact>
          <Fact term="Difficulty">{capitalize(difficulty)}</Fact>
        </dl>
        {requirements.length > 0 && (
          <>
            <h4 className="visa-h4">Requirements</h4>
            <ul className="visa-list">
              {requirements.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </>
        )}
        {text(visa?.where_to_apply) && (
          <>
            <h4 className="visa-h4">Where to apply</h4>
            <p className="visa-text">{text(visa.where_to_apply)}</p>
          </>
        )}
        {text(visa?.notes) && <p className="visa-text visa-text--note">{text(visa.notes)}</p>}
      </div>
    </details>
  );
}

// Everything below the issued visa, in reading order: the disclaimer and official links first,
// then the visa types, the route, the documents, money and time, how to strengthen it, and the
// rest; the disclaimer again at the end.
function VisaReportBody({ report, query, chance }) {
  const visaTypes = list(report.visaTypes).filter((v) => v && typeof v === 'object');
  const steps = list(report.applicationSteps)
    .map((s) => (typeof s === 'string' ? { title: s.trim(), detail: '' } : { title: text(s?.title), detail: text(s?.detail) }))
    .filter((s) => s.title);
  const documents = checklistItems(report.documentChecklist);
  const timeline = report.timeline && typeof report.timeline === 'object' ? report.timeline : null;
  const money = report.financialRequirements && typeof report.financialRequirements === 'object' ? report.financialRequirements : null;
  const timelineFacts = timeline && [text(timeline.applyHowFarInAdvance), text(timeline.typicalApprovalTime)].some(Boolean);
  const moneyFacts = money && [text(money.minimumBankBalance), text(money.proofFormat), text(money.notes)].some(Boolean);
  const tips = list(report.guaranteeTips)
    .map((t) => {
      if (typeof t === 'string') return { tip: t.trim(), importance: '', label: '' };
      const importance = words(t?.importance);
      return { tip: text(t?.tip), importance, label: lookup(IMPORTANCE, importance) };
    })
    .filter((t) => t.tip);
  const reasons = list(report.commonRejectionReasons).map(text).filter(Boolean);
  const language = report.languageRequirements && typeof report.languageRequirements === 'object' ? report.languageRequirements : null;
  const tests = list(language?.tests).map(text).filter(Boolean);
  const interview = list(report.interviewTips).map(text).filter(Boolean);
  const factors = list(report.successRateFactors).map(text).filter(Boolean);
  const residency = text(report.pathToResidency);
  const policy = list(report.recentPolicyChanges).map(text).filter(Boolean);
  const notes = list(report.importantNotes).map(text).filter(Boolean);
  const overview = text(report.overview);

  return (
    <>
      <DisclaimerBlock tone="paper" />
      {overview && <p className="visa-overview">{overview}</p>}
      <OfficialSourcesBlock code={query.to} types={['authority', 'apply', 'embassies']} />

      {visaTypes.length > 0 && (
        <Section kicker="Visa types" title="Your options for this route">
          <ul className="visa-types">
            {visaTypes.map((v, i) => (
              <li key={i}>
                <VisaTypeCard visa={v} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      {steps.length > 0 && (
        <Section kicker="Itinerary" title="How to apply, step by step">
          <ol className="visa-itinerary">
            {steps.map((s, i) => (
              <li key={i} className="visa-stop">
                <span className="visa-stop-no" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <div className="visa-stop-text">
                  <p className="visa-stop-title">{s.title}</p>
                  {s.detail && <p className="visa-text">{s.detail}</p>}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {documents.length > 0 && (
        <ChecklistPage storageKey={docsKey({ ...query, items: documents })} title="Documents to pack" items={documents} />
      )}

      {(timelineFacts || moneyFacts) && (
        <Section kicker="Fare box" title="Time and money" className="visa-fare">
          <div className="visa-fare-grid">
            {timelineFacts && (
              <div className="visa-fare-col">
                <h4 className="visa-h4">Timeline</h4>
                <dl className="visa-facts visa-facts--rows">
                  <Fact term="Apply ahead">{text(timeline.applyHowFarInAdvance)}</Fact>
                  <Fact term="Typical approval">{text(timeline.typicalApprovalTime)}</Fact>
                  {typeof timeline.urgentOptionAvailable === 'boolean' && (
                    <Fact term="Urgent processing">{timeline.urgentOptionAvailable ? 'Available' : 'Not available'}</Fact>
                  )}
                </dl>
              </div>
            )}
            {moneyFacts && (
              <div className="visa-fare-col">
                <h4 className="visa-h4">Money</h4>
                <dl className="visa-facts visa-facts--rows">
                  <Fact term="Minimum balance">{text(money.minimumBankBalance)}</Fact>
                  <Fact term="Proof">{text(money.proofFormat)}</Fact>
                </dl>
                {text(money.notes) && <p className="visa-text">{text(money.notes)}</p>}
              </div>
            )}
          </div>
        </Section>
      )}

      {chance.state === 'done' && <VisaProbabilityMeter data={chance.data} />}

      {(tips.length > 0 || reasons.length > 0) && (
        <div className="visa-pair">
          {tips.length > 0 && (
            <Section kicker="Strengthen" title="How to strengthen your application">
              <ul className="visa-list visa-list--tips">
                {tips.map((t, i) => (
                  <li key={i}>
                    {t.label && <span className={`visa-imp visa-imp--${t.importance}`}>{t.label}</span>}
                    {t.tip}
                  </li>
                ))}
              </ul>
            </Section>
          )}
          {reasons.length > 0 && (
            <Section kicker="Watch out" title="Common rejection reasons">
              <ul className="visa-list visa-list--reasons">
                {reasons.map((r, i) => (
                  <li key={i}>
                    <CrossGlyph className="visa-cross" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      )}

      {language?.required && (tests.length > 0 || text(language.notes)) && (
        <Section kicker="Language" title="Language tests">
          {tests.length > 0 && (
            <ul className="visa-tags">
              {tests.map((t, i) => <li key={i}>{t}</li>)}
            </ul>
          )}
          {text(language.notes) && <p className="visa-text">{text(language.notes)}</p>}
        </Section>
      )}

      {interview.length > 0 && (
        <Section kicker="Interview" title="Consulate interview tips">
          <ul className="visa-list">
            {interview.map((t, i) => <li key={i}>{t}</li>)}
          </ul>
        </Section>
      )}

      {factors.length > 0 && (
        <Section kicker="Approval" title="What actually gets you approved">
          <ul className="visa-list visa-list--good">
            {factors.map((f, i) => <li key={i}>{f}</li>)}
          </ul>
        </Section>
      )}

      {residency && (
        <Section kicker="Longer term" title="Path to permanent residency">
          <p className="visa-text">{residency}</p>
        </Section>
      )}

      {policy.length > 0 && (
        <Section kicker="Notice" title="Recent policy changes">
          <ul className="visa-list visa-list--gold">
            {policy.map((c, i) => <li key={i}>{c}</li>)}
          </ul>
        </Section>
      )}

      {notes.length > 0 && (
        <Section kicker="Notes" title="Important notes">
          <ul className="visa-list visa-list--gold">
            {notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </Section>
      )}

      <p className="visa-closing">
        <strong>Disclaimer:</strong> This information is AI-generated for guidance only. Always verify with official
        government sources and consult a licensed immigration attorney for your specific situation. Visa rules change
        frequently.
      </p>
    </>
  );
}

export default function VisaPage() {
  const [nationality, setNationality] = useState('');
  const [targetCountry, setTargetCountry] = useState('');
  const [purpose, setPurpose] = useState('work');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showAck, setShowAck] = useState(false);
  // The searched route ({ from, to, purpose }) and its report ({ id, data, issuedAt }).
  const [query, setQuery] = useState(null);
  const [report, setReport] = useState(null);
  // The chance estimate: { state: 'pending' | 'done' | 'failed', data }.
  const [chance, setChance] = useState({ state: 'pending', data: null });
  // One guard for both calls of a search: a newer search makes every response of an older one stale.
  const [latest] = useState(createLatest);

  // Deep links: /visa?to=ca (from /sources/[code]) pre-selects the destination;
  // /visa?from=pk&to=ca (homepage search) also sets the nationality. Whatever the link leaves
  // empty comes from the route saved on this device (the homepage boarding-pass stub; To only
  // when it is a country, not "anywhere"). Both win over the saved profile, which only fills a
  // still-empty nationality and never overwrites them.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const { nationality: from, destination: to } = visaPrefill(
      { from: params.get('from'), to: params.get('to') },
      readRoute(deviceStorage()),
    );
    if (to) setTargetCountry(to);
    if (from) { setNationality(from); return; }

    // Pre-fill nationality from saved profile
    let cancelled = false;
    const loadProfile = async () => {
      try {
        const res = await fetch('/api/user-profile');
        const { profile } = await res.json();
        if (cancelled) return;
        if (profile?.nationality) { setNationality(profile.nationality); setProfileLoaded(true); return; }
      } catch {}
      if (cancelled) return;
      try {
        const saved = localStorage.getItem('opportumap_profile');
        if (saved) {
          const p = JSON.parse(saved);
          if (p.nationality) { setNationality(p.nationality); setProfileLoaded(true); }
        }
      } catch {}
    };
    loadProfile();
    return () => { cancelled = true; };
  }, []);

  // The report (/api/visa-intel) and the chance estimate (/api/visa-probability) are independent
  // calls started together, with the country's official links: the visa card fills in when the
  // report arrives (with "checking…" until the chance is in), and a failed estimate says so.
  const handleSearch = () => {
    if (!nationality || !targetCountry) { setError(MISSING_FIELDS); return; }
    const id = latest.next();
    const searched = { from: nationality, to: targetCountry, purpose };
    setQuery(searched);
    setLoading(true);
    setError('');
    setReport(null);
    setChance({ state: 'pending', data: null });
    prefetchSources(targetCountry);

    const savedProfile = (() => { try { const p = localStorage.getItem('opportumap_profile'); return p ? JSON.parse(p) : null; } catch { return null; } })();

    postJson('/api/visa-intel', { nationality, targetCountry, purpose }).then((data) => {
      if (!latest.isCurrent(id)) return;
      if (data) setReport({ id, data, issuedAt: Date.now() }); else setError(friendlyError('visa'));
      setLoading(false);
    });

    postJson('/api/visa-probability', { nationality, destination: targetCountry, purpose, profile: savedProfile }).then((data) => {
      if (!latest.isCurrent(id)) return;
      setChance(data ? { state: 'done', data } : { state: 'failed', data: null });
    });
  };

  // The fields are checked before the one-time legal notice (visaSubmitStep).
  const handleSubmit = (event) => {
    event.preventDefault();
    const step = visaSubmitStep({ loading, nationality, targetCountry, acked: hasLegalAck() });
    if (step === 'missing') setError(MISSING_FIELDS);
    else if (step === 'ack') { setError(''); setShowAck(true); }
    else if (step === 'search') handleSearch();
  };

  return (
    <ToolShell header={<ToolHeader {...HERO_COPY.visa} />}>
      <div className="visa-page">
        {profileLoaded && (
          <p className="visa-prefilled">
            <span className="visa-prefilled-dot" aria-hidden="true" />
            Nationality pre-filled from your profile
          </p>
        )}

        <PassportCard as="form" className="visa-form" onSubmit={handleSubmit} aria-labelledby="visa-form-h">
          <h2 id="visa-form-h" className="visa-kicker visa-form-h">Visa application · form V-1</h2>
          <div className="visa-fields">
            <div>
              <label htmlFor="visa-nationality" className="visa-label">Your passport / nationality</label>
              <select id="visa-nationality" value={nationality} onChange={(e) => setNationality(e.target.value)} className="kit-select">
                <option value="">Select your nationality</option>
                {NATIONALITIES.map((n) => <option key={n.code} value={n.code}>{n.label}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="visa-destination" className="visa-label">Destination country</label>
              <select id="visa-destination" value={targetCountry} onChange={(e) => setTargetCountry(e.target.value)} className="kit-select">
                <option value="">Select destination</option>
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
              </select>
            </div>
          </div>
          <fieldset className="visa-purpose">
            <legend className="visa-label">Purpose of travel</legend>
            <div className="visa-chips">
              {PURPOSES.map((p) => (
                <Chip key={p.value} pressed={purpose === p.value} onClick={() => setPurpose(p.value)}>
                  {p.label}
                </Chip>
              ))}
            </div>
          </fieldset>
          <p className="visa-error" role="alert">{error}</p>
          <Btn variant="primary" as="button" type="submit" aria-disabled={loading} className="visa-submit">
            {loading ? 'Issuing your visa report…' : 'Issue my visa report'}
          </Btn>
        </PassportCard>

        <div className="visa-results">
          {loading && !report && query && <IssuedVisa loading {...query} />}
          {report && query && (
            <ResultArrival key={report.id} id={VISA_HEADING_ID} label="Your visa report is ready">
              <IssuedVisa
                report={report.data}
                issuedAt={report.issuedAt}
                probability={chance.data?.probability}
                chancePending={chance.state === 'pending'}
                {...query}
              />
              <VisaReportBody report={report.data} query={query} chance={chance} />
            </ResultArrival>
          )}
        </div>

        <p className="visa-footnote">
          <span className="visa-footnote-mark" aria-hidden="true">*</span>
          {FOOTNOTES.visa}
        </p>
      </div>

      <LegalAckModal
        open={showAck}
        onAccept={() => { setShowAck(false); handleSearch(); }}
        onClose={() => setShowAck(false)}
      />
    </ToolShell>
  );
}
