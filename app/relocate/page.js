'use client';

import { useEffect, useState } from 'react';
import ToolShell from '../components/kit/ToolShell';
import ToolHeader from '../components/kit/ToolHeader';
import PassportCard from '../components/kit/PassportCard';
import Chip from '../components/kit/Chip';
import ResultArrival from '../components/kit/ResultArrival';
import Ticket from '../components/kit/Ticket';
import { PlaneGlyph } from '../components/kit/Glyphs';
import { createLatest } from '../components/kit/createLatest';
import { deviceStorage } from '../components/kit/deviceStorage';
import Btn from '../components/ui/Btn';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import { admittedStamp, budgetTiers, cityName, fetchGuide, relocatePrefill, saveWeekPlan, savedWeekPlan, ticketCode, weekPlan } from '../lib/relocate';
import { countryByCode, findCountryInText } from '../data/countries195';
import { readRoute } from '../components/passport/routeStore';
import OfficialSourcesBlock from '../components/OfficialSourcesBlock';
import { prefetchSources } from '../components/officialSourcesCache';
import DisclaimerBlock from '../components/DisclaimerBlock';
import GuideChapters from './GuideChapters';
import './relocate.css';

const POPULAR_DESTINATIONS = [
  'Toronto, Canada',
  'London, UK',
  'Berlin, Germany',
  'Dubai, UAE',
  'Singapore',
  'Amsterdam, Netherlands',
  'Sydney, Australia',
  'Tokyo, Japan',
  'New York, USA',
  'Lisbon, Portugal',
  'Stockholm, Sweden',
  'Nairobi, Kenya',
];

const GUIDE_HEADING_ID = 'relocate-guide-h';
const NO_DESTINATION = 'Please enter a destination.';

// The saved route's From country as a name ('Pakistan'), or ''.
const routeFromName = () => countryByCode(readRoute(deviceStorage())?.from)?.name ?? '';

const sameList = (a, b) => Array.isArray(a) && a.length === b.length && a.every((item, i) => item === b[i]);

// The boarding pass for a search: { fromCode, toCode, from, city, tiers, stamp, stubItems } (the
// origin as typed, else the saved route's From country; no origin at all reads ANY, as on the
// homepage pass).
function passFor(query, guide) {
  const toCode = ticketCode(query.destination);
  const city = cityName(query.destination) || query.destination;
  return {
    fromCode: query.from ? ticketCode(query.from) : 'ANY',
    toCode,
    from: cityName(query.from),
    city,
    tiers: budgetTiers(guide.monthlyBudget),
    stamp: admittedStamp(city, toCode),
    stubItems: weekPlan(guide),
  };
}

export default function RelocatePage() {
  const [destination, setDestination] = useState('');
  const [origin, setOrigin] = useState('');
  const [field, setField] = useState('');
  // Where the origin came from: 'route' (the saved route's From) or 'profile', for the note.
  const [prefilled, setPrefilled] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  // The search in flight (its query: destination, origin, field, from) and the guide that arrived
  // ({ id, data, query, saved: its first-week plan is already kept on this device }).
  const [pending, setPending] = useState(null);
  const [guide, setGuide] = useState(null);
  // One guard per page: a newer search (a second city chip, a resubmit) makes older answers stale.
  const [latest] = useState(createLatest);

  // Prefill (relocatePrefill). Destination: /relocate?dest=Portugal (from /sources/[code] and
  // /match), else the To country of the route saved on this device. Origin: the saved route's
  // From country, else the saved profile's current country. Field: the profile's first job type.
  useEffect(() => {
    let profile = null;
    try {
      profile = JSON.parse(deviceStorage()?.getItem('opportumap_profile') ?? 'null');
    } catch {}
    const fill = relocatePrefill({ dest: new URLSearchParams(window.location.search).get('dest'), route: readRoute(deviceStorage()), profile });
    // The URL and this device's storage exist only in the browser: the server renders an empty
    // form and it is filled once, right after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (fill.destination) setDestination(fill.destination);
    if (fill.origin) {
      setOrigin(fill.origin);
      setPrefilled(fill.originFrom);
    }
    if (fill.field) setField(fill.field);
  }, []);

  const runSearch = async (dest) => {
    const d = dest.trim();
    if (!d) {
      setError(NO_DESTINATION);
      return;
    }
    const query = { destination: d, origin: origin.trim(), field: field.trim() };
    query.from = query.origin || routeFromName();
    setPending(query);
    setLoading(true);
    setError('');
    setGuide(null);
    prefetchSources(findCountryInText(d)?.code);
    const result = await fetchGuide(latest, { destination: d, origin: query.origin || undefined, field: query.field || undefined });
    if (!result) return; // a newer search started meanwhile: its answer is the one shown
    if (result.error) setError(result.error);
    else {
      const saved = sameList(savedWeekPlan(deviceStorage(), d), weekPlan(result.data));
      setGuide({ id: result.id, data: result.data, query, saved });
    }
    setLoading(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!loading) runSearch(destination);
  };

  // A chip rests while a search runs (aria-disabled, so it keeps keyboard focus): a tap starts nothing.
  const pickCity = (name) => {
    if (loading) return;
    setDestination(name);
    runSearch(name);
  };

  const pass = guide ? passFor(guide.query, guide.data) : null;
  // While the guide is written: a blank pass for the same route.
  const pendingPass = loading && pending ? passFor(pending, {}) : null;

  return (
    <ToolShell header={<ToolHeader {...HERO_COPY.relocate} />}>
      <div className="rl-page">
        <PassportCard as="form" className="rl-form" onSubmit={handleSubmit} aria-labelledby="rl-form-h">
          <h2 id="rl-form-h" className="rl-kicker rl-form-h">Check-in · form R-1</h2>
          <div className="rl-fields">
            <div className="rl-field--wide">
              <label htmlFor="relocate-destination" className="rl-label">Destination city or country</label>
              <input
                id="relocate-destination"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="e.g. Berlin, Germany"
                autoComplete="off"
                className="kit-input"
              />
            </div>
            <div>
              <label htmlFor="relocate-origin" className="rl-label">Where you’re from (optional)</label>
              <input
                id="relocate-origin"
                value={origin}
                onChange={(e) => {
                  setOrigin(e.target.value);
                  setPrefilled(null);
                }}
                placeholder="e.g. Lagos, Nigeria"
                aria-describedby={prefilled ? 'relocate-origin-note' : undefined}
                className="kit-input"
              />
              {prefilled && (
                <p id="relocate-origin-note" className="rl-prefilled">
                  {prefilled === 'route' ? 'From your saved route' : 'From your profile'}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="relocate-field" className="rl-label">Your field (optional)</label>
              <input
                id="relocate-field"
                value={field}
                onChange={(e) => setField(e.target.value)}
                placeholder="e.g. Software Engineering"
                className="kit-input"
              />
            </div>
          </div>

          <fieldset className="rl-popular">
            <legend className="rl-label">Popular destinations</legend>
            <div className="rl-chips">
              {POPULAR_DESTINATIONS.map((name) => (
                <Chip key={name} pressed={destination === name} disabled={loading} onClick={() => pickCity(name)}>
                  {cityName(name)}
                </Chip>
              ))}
            </div>
          </fieldset>

          <p className="rl-error" role="alert">{error}</p>
          <p className="sr-only" role="status">
            {pendingPass ? `Building your relocation guide for ${pendingPass.city}…` : ''}
          </p>
          <Btn variant="primary" as="button" type="submit" aria-disabled={loading} className="rl-submit">
            {loading ? 'Printing your boarding pass…' : 'Build my relocation guide'}
          </Btn>
        </PassportCard>

        <div className="rl-results">
          {pendingPass && (
            <div className="rl-pending" aria-hidden="true">
              <p className="rl-kicker">Boarding pass · printing</p>
              <p className="rl-pending-codes">
                {pendingPass.fromCode}
                <PlaneGlyph className="rl-pending-plane" />
                {pendingPass.toCode}
              </p>
              <p className="rl-pending-city">{pendingPass.city}</p>
              <span className="rl-skel" />
              <span className="rl-skel rl-skel--short" />
            </div>
          )}
          {guide && pass && (
            <ResultArrival key={guide.id} id={GUIDE_HEADING_ID} label={`Your relocation guide for ${pass.city} is ready`}>
              <Ticket
                headingId={GUIDE_HEADING_ID}
                {...pass}
                stubTitle="Stub · week 1"
                torn={guide.saved}
                onTear={() => saveWeekPlan(deviceStorage(), guide.query.destination, pass.stubItems)}
              />
              <GuideChapters guide={guide.data} query={guide.query} city={pass.city} />
              <OfficialSourcesBlock code={findCountryInText(guide.query.destination)?.code} types={['authority', 'work', 'study', 'citizenship']} />
              <DisclaimerBlock tone="paper" />
              <p className="rl-closing">
                <strong>About the numbers:</strong> cost estimates are AI-generated and change often. Check current
                prices on Numbeo, Expatistan or local listings before you decide.
              </p>
            </ResultArrival>
          )}
        </div>

        <p className="rl-footnote">
          <span className="rl-footnote-mark" aria-hidden="true">*</span>
          {FOOTNOTES.relocate}
        </p>
      </div>
    </ToolShell>
  );
}
