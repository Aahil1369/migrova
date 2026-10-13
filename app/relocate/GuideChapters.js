'use client';

import { Children, isValidElement, useId, useRef, useState } from 'react';
import Link from 'next/link';
import PassportCard from '../components/kit/PassportCard';
import ChecklistPage from '../components/kit/ChecklistPage';
import { CheckGlyph, CrossGlyph } from '../components/kit/Glyphs';
import { beforeKey, budgetTiers, chaptersFor, lines, list, safeUrl, telHref, text, usd, visaLink } from '../lib/relocate';

const COSTS = [
  ['rent_1br_city_center', 'Rent · 1-bed, centre'],
  ['rent_1br_outside_center', 'Rent · 1-bed, outside the centre'],
  ['groceries', 'Groceries'],
  ['dining_out', 'Eating out'],
  ['public_transport', 'Public transport'],
  ['utilities', 'Utilities'],
  ['internet', 'Internet'],
  ['healthcare', 'Healthcare'],
  ['gym_entertainment', 'Gym and going out'],
];

const EMERGENCY = [
  ['police', 'Police'],
  ['ambulance', 'Ambulance'],
  ['fire', 'Fire'],
  ['generalEmergency', 'Any emergency'],
];

// Crime / language levels as a word in a stamp ink (plain text, never a stamp).
const LEVEL_INK = { none: 'good', low: 'good', medium: 'mid', high: 'bad', 'very high': 'bad' };

const obj = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : null);
const level = (value) => text(value).toLowerCase();
const capitalize = (value) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : '');

// One block of a chapter, on paper: a kicker, an h3 under the ticket's h2, then its content.
function Section({ kicker, title, children }) {
  const id = useId();
  return (
    <PassportCard className="rl-section" aria-labelledby={id}>
      <p className="rl-kicker">{kicker}</p>
      <h3 id={id} className="rl-h3">{title}</h3>
      {children}
    </PassportCard>
  );
}

function Text({ children }) {
  return children ? <p className="rl-text">{children}</p> : null;
}

// [term, value] pairs; pairs without a value are left out.
function Facts({ items }) {
  const shown = items.filter(([, value]) => value);
  if (shown.length === 0) return null;
  return (
    <dl className="rl-facts">
      {shown.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Tags({ label, items }) {
  if (items.length === 0) return null;
  return (
    <>
      {label ? <h4 className="rl-h4">{label}</h4> : null}
      <ul className="rl-tags">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
    </>
  );
}

// A list; tone 'good' marks each item with a tick, 'bad' with a cross (decorative glyphs).
function Bullets({ label, items, tone }) {
  if (items.length === 0) return null;
  const Glyph = tone === 'good' ? CheckGlyph : tone === 'bad' ? CrossGlyph : null;
  return (
    <>
      {label ? <h4 className="rl-h4">{label}</h4> : null}
      <ul className={`rl-list${Glyph ? ` rl-list--${tone}` : ''}`}>
        {items.map((item, i) => (
          <li key={i}>
            {Glyph ? <Glyph className="rl-glyph" /> : null}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Level({ term, value }) {
  const word = level(value);
  if (!word) return null;
  return (
    <p className="rl-level">
      {term}: <strong data-ink={LEVEL_INK[word] ?? 'mid'}>{word}</strong>
    </p>
  );
}

// A chapter's sections. Its fields can be there but empty (the AI sent {}), which still opens the
// chapter (chaptersFor): then it says so instead of showing a blank panel.
function Blocks({ children }) {
  const shown = Children.toArray(children).filter(isValidElement);
  return shown.length > 0 ? shown : <p className="rl-text">The guide has no details for this chapter yet.</p>;
}

function Money({ guide }) {
  const tiers = budgetTiers(guide.monthlyBudget);
  const compared = text(guide.comparedToUS);
  const costs = obj(guide.costBreakdown);
  const rows = COSTS.map(([key, label]) => [label, obj(costs?.[key])]).filter(([, c]) => text(c?.amount));
  const bank = obj(guide.bankingSetup);
  const banks = lines(bank?.bestBanksForExpats);
  const apps = lines(bank?.alternativeApps);
  const tax = text(guide.taxInfo);
  return (
    <Blocks>
      {(tiers.length > 0 || compared !== '') && (
        <Section kicker="Fare table" title="Your monthly budget">
          <Facts items={tiers.map((t) => [t.label, t.amount])} />
          {compared && <p className="rl-text rl-gap">Compared with the US: {compared}</p>}
        </Section>
      )}
      {rows.length > 0 && (
        <Section kicker="Cost of living" title="What a month costs">
          <ul className="rl-costs">
            {rows.map(([label, c]) => (
              <li key={label}>
                <span className="rl-cost-label">{label}</span>
                <span className="rl-cost-amount">{usd(c.amount, 'mo')}</span>
                {text(c.note) && <span className="rl-cost-note">{text(c.note)}</span>}
              </li>
            ))}
          </ul>
        </Section>
      )}
      {bank && (text(bank.howToOpen) || banks.length > 0 || apps.length > 0 || text(bank.notes)) && (
        <Section kicker="Banking" title="Opening a bank account">
          <Text>{text(bank.howToOpen)}</Text>
          <Tags label="Banks newcomers use" items={banks} />
          <Tags label="Apps that bridge the gap" items={apps} />
          {text(bank.notes) && (
            <p className="rl-note">
              <strong>Watch out:</strong> {text(bank.notes)}
            </p>
          )}
        </Section>
      )}
      {tax && (
        <Section kicker="Tax" title="Tax for newcomers">
          <Text>{tax}</Text>
        </Section>
      )}
    </Blocks>
  );
}

function Living({ guide, city }) {
  const overview = text(guide.overview);
  const life = obj(guide.qualityOfLife);
  const score = Number(life?.score);
  const pros = lines(life?.pros);
  const cons = lines(life?.cons);
  const hoods = list(guide.neighborhoods).filter((n) => text(obj(n)?.name));
  const climate = obj(guide.climate);
  const pack = lines(climate?.whatToPack);
  const health = text(guide.healthcareInfo);
  const hasScore = Number.isFinite(score) && score >= 1 && score <= 10;
  return (
    <Blocks>
      {(overview || hasScore || pros.length > 0 || cons.length > 0) && (
        <Section kicker="Living" title={`Life in ${city}`}>
          {overview && <p className="rl-lead">{overview}</p>}
          {hasScore && <p className="rl-level">Quality of life: <strong>{Math.round(score)} / 10</strong></p>}
          <div className="rl-pair">
            <div><Bullets label="The good" items={pros} tone="good" /></div>
            <div><Bullets label="The hard parts" items={cons} tone="bad" /></div>
          </div>
        </Section>
      )}
      {hoods.length > 0 && (
        <Section kicker="Neighbourhoods" title="Where people live">
          <ul className="rl-cards">
            {hoods.map((n, i) => (
              <li key={i} className="rl-card">
                <h4 className="rl-card-h">{text(n.name)}</h4>
                <Text>{text(n.vibe)}</Text>
                {text(n.goodFor) && (
                  <p className="rl-text rl-gap">
                    <strong>Good for:</strong> {text(n.goodFor)}
                  </p>
                )}
                <Facts
                  items={[
                    ['Rent, 1-bed', usd(n.avgRent, 'mo')],
                    ['Safety', text(n.safetyRating) && `${text(n.safetyRating)} / 5`],
                  ]}
                />
              </li>
            ))}
          </ul>
        </Section>
      )}
      {climate && (text(climate.overview) || text(climate.bestTimeToArrive) || pack.length > 0) && (
        <Section kicker="Climate" title="Weather and what to pack">
          <Text>{text(climate.overview)}</Text>
          <Facts items={[['Best time to arrive', text(climate.bestTimeToArrive)]]} />
          <Tags label="Pack" items={pack} />
        </Section>
      )}
      {health && (
        <Section kicker="Healthcare" title="Seeing a doctor">
          <Text>{health}</Text>
        </Section>
      )}
    </Blocks>
  );
}

function Work({ guide }) {
  const jobs = obj(guide.jobMarket);
  const industries = lines(jobs?.topIndustries);
  const searchTips = lines(jobs?.jobSearchTips);
  const culture = obj(guide.workCulture);
  const cultureTips = lines(culture?.tips);
  return (
    <Blocks>
      {jobs && (text(jobs.overview) || text(jobs.averageSalary) || industries.length > 0 || searchTips.length > 0) && (
        <Section kicker="Jobs" title="The job market">
          <Text>{text(jobs.overview)}</Text>
          <Facts items={[['Typical skilled salary', usd(jobs.averageSalary, 'yr')]]} />
          <Tags label="Hiring industries" items={industries} />
          <Bullets label="Job-search tips" items={searchTips} />
        </Section>
      )}
      {culture && (text(culture.typicalHours) || text(culture.formality) || text(culture.expatTreatment) || cultureTips.length > 0) && (
        <Section kicker="At work" title="Work culture">
          <Facts items={[['Hours', text(culture.typicalHours)], ['Dress code', capitalize(text(culture.formality))]]} />
          <Text>{text(culture.expatTreatment)}</Text>
          <Bullets label="Tips" items={cultureTips} />
        </Section>
      )}
    </Blocks>
  );
}

function Safety({ guide }) {
  const safety = obj(guide.safetyInfo);
  const safe = lines(safety?.safeAreas);
  const avoid = lines(safety?.areasToAvoid);
  const numbers = obj(guide.emergencyNumbers);
  const calls = EMERGENCY.map(([key, label]) => [label, text(numbers?.[key])]).filter(([, n]) => n);
  return (
    <Blocks>
      {safety && (level(safety.crimeIndex) || text(safety.nightSafety) || safe.length > 0 || avoid.length > 0) && (
        <Section kicker="Safety" title="Staying safe">
          <Level term="Crime level" value={safety.crimeIndex} />
          <Text>{text(safety.nightSafety)}</Text>
          <div className="rl-pair">
            <div><Bullets label="Safer areas" items={safe} tone="good" /></div>
            <div><Bullets label="Take care in" items={avoid} tone="bad" /></div>
          </div>
        </Section>
      )}
      {calls.length > 0 && (
        <Section kicker="Emergency · tap to call" title="Emergency numbers">
          <ul className="rl-wallet">
            {calls.map(([label, number]) => {
              const href = telHref(number);
              const body = (
                <>
                  <span className="rl-call-label">{label}</span>
                  <span className="rl-call-no">{number}</span>
                </>
              );
              return <li key={label}>{href ? <a href={href} className="rl-call">{body}</a> : <span className="rl-call">{body}</span>}</li>;
            })}
          </ul>
        </Section>
      )}
    </Blocks>
  );
}

function Settling({ guide, query }) {
  const before = lines(guide.beforeYouMove);
  const firstMonth = lines(guide.firstMonthTips);
  const sim = obj(guide.simAndInternet);
  const providers = lines(sim?.bestProviders);
  const visaPath = text(guide.visaPathSummary);
  return (
    <Blocks>
      {before.length > 0 && <ChecklistPage storageKey={beforeKey(query.destination, before)} title="Before you move" items={before} />}
      {firstMonth.length > 0 && (
        <Section kicker="First month" title="Your first weeks">
          <Bullets items={firstMonth} />
        </Section>
      )}
      {sim && (text(sim.howToGetOnArrival) || text(sim.avgMonthlyCost) || text(sim.internetSpeed) || providers.length > 0) && (
        <Section kicker="Phone" title="SIM card and internet">
          <Text>{text(sim.howToGetOnArrival)}</Text>
          <Facts items={[['Monthly plan', usd(sim.avgMonthlyCost, 'mo')], ['Home internet', text(sim.internetSpeed)]]} />
          <Tags label="Providers" items={providers} />
        </Section>
      )}
      {visaPath && (
        <Section kicker="Visa path" title="How people get the right to stay">
          <Text>{visaPath}</Text>
          <Link href={visaLink(query)} className="rl-go">
            Check the visa for this move →
          </Link>
        </Section>
      )}
    </Blocks>
  );
}

function Culture({ guide }) {
  const culture = obj(guide.culturalTips);
  const dos = lines(culture?.dos);
  const donts = lines(culture?.donts);
  const language = obj(guide.languageBarrier);
  const groups = list(guide.expatCommunities).filter((c) => text(obj(c)?.name));
  return (
    <Blocks>
      {culture && (text(culture.etiquette) || dos.length > 0 || donts.length > 0) && (
        <Section kicker="Etiquette" title="Do’s and don’ts">
          <Text>{text(culture.etiquette)}</Text>
          <div className="rl-pair">
            <div><Bullets label="Do" items={dos} tone="good" /></div>
            <div><Bullets label="Don’t" items={donts} tone="bad" /></div>
          </div>
        </Section>
      )}
      {language && (level(language.level) || text(language.detail)) && (
        <Section kicker="Language" title="Getting by in the language">
          <Level term="Language barrier" value={language.level} />
          <Text>{text(language.detail)}</Text>
        </Section>
      )}
      {groups.length > 0 && (
        <Section kicker="Community" title="Expat communities">
          <ul className="rl-cards">
            {groups.map((c, i) => {
              const href = safeUrl(c.url);
              return (
                <li key={i} className="rl-card">
                  <h4 className="rl-card-h">{text(c.name)}</h4>
                  {text(c.type) && <p className="rl-badge">{text(c.type)}</p>}
                  <Text>{text(c.description)}</Text>
                  {href && (
                    <a href={href} className="rl-go" target="_blank" rel="noopener noreferrer">
                      Visit {new URL(href).hostname.replace(/^www\./, '')}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        </Section>
      )}
    </Blocks>
  );
}

const PANELS = { money: Money, living: Living, work: Work, safety: Safety, settling: Settling, culture: Culture };

/**
 * The guide below the boarding pass: its sections grouped into chapter tabs (only the chapters
 * the guide has, the first one open). A real tablist: arrow keys / Home / End move between tabs,
 * the strip scrolls sideways on phones, each panel is labelled by its tab.
 * `guide` is the API's answer, `query` the search ({ destination, origin }), `city` its name.
 */
export default function GuideChapters({ guide, query, city }) {
  const chapters = chaptersFor(guide);
  const [selected, setSelected] = useState(chapters[0]?.id);
  const tabs = useRef({});
  const base = useId();
  if (chapters.length === 0) return null;
  const current = chapters.some((c) => c.id === selected) ? selected : chapters[0].id;

  const onKeyDown = (event) => {
    const at = chapters.findIndex((c) => c.id === current);
    const last = chapters.length - 1;
    const to = { ArrowRight: at === last ? 0 : at + 1, ArrowLeft: at === 0 ? last : at - 1, Home: 0, End: last }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    const id = chapters[to].id;
    setSelected(id);
    tabs.current[id]?.focus();
  };

  return (
    <div className="rl-chapters">
      <div className="rl-tabs" role="tablist" aria-label="Guide chapters" onKeyDown={onKeyDown}>
        {chapters.map((c) => (
          <button
            key={c.id}
            ref={(el) => {
              tabs.current[c.id] = el;
            }}
            type="button"
            role="tab"
            id={`${base}-tab-${c.id}`}
            aria-selected={c.id === current}
            aria-controls={`${base}-panel-${c.id}`}
            tabIndex={c.id === current ? 0 : -1}
            className="rl-tab"
            onClick={() => setSelected(c.id)}
          >
            {c.label}
          </button>
        ))}
      </div>
      {chapters.map((c) => {
        const Panel = PANELS[c.id];
        return (
          <div
            key={c.id}
            role="tabpanel"
            id={`${base}-panel-${c.id}`}
            aria-labelledby={`${base}-tab-${c.id}`}
            tabIndex={0}
            hidden={c.id !== current}
            className="rl-panel"
          >
            <Panel guide={guide} query={query} city={city} />
          </div>
        );
      })}
    </div>
  );
}
