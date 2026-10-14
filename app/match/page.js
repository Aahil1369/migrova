'use client';

import { useEffect, useRef, useState } from 'react';
import ToolShell from '../components/kit/ToolShell';
import ToolHeader from '../components/kit/ToolHeader';
import PassportCard from '../components/kit/PassportCard';
import ResultArrival from '../components/kit/ResultArrival';
import { createLatest } from '../components/kit/createLatest';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import CountryMatchCard from '../components/CountryMatchCard';
import DisclaimerBlock from '../components/DisclaimerBlock';
import { readRoute } from '../components/passport/routeStore';
import { announceRouteChange, deviceStorage, useSavedRoute } from '../components/passport/useSavedRoute';
import { countryByCode } from '../data/countries195';
import { HERO_COPY, FOOTNOTES } from '../lib/pageCopy';
import {
  fetchMatches, lateProfileFills, matchCountLabel, matchKeptText, matchPrefill, matchReadyLabel, profileKey, readLastMatch,
  readMatchCache, requestProfile, setDestination, writeMatchCache,
} from '../lib/match';
import MatchForm, { EMPTY_FORM } from './MatchForm';
import MatchRoute, { PendingRoute } from './MatchRoute';
import './match.css';

const RESULTS_HEADING_ID = 'match-results-h';
const NO_NATIONALITY = 'Choose the country of your passport.';

// The profile saved on this device by the profile pop-up (when "remember" was ticked), or null.
function deviceProfile() {
  try {
    return JSON.parse(deviceStorage()?.getItem('opportumap_profile') ?? 'null');
  } catch {
    return null;
  }
}

// A result restored from this device on load: the same section, without the arrival's focus move
// and announcement (nobody asked for it just now); its stamps land when the route comes on screen.
function Restored({ id, children }) {
  return (
    <section className="mt-arrival" aria-labelledby={id}>
      {children}
    </section>
  );
}

/**
 * Country Match (/match). Everyone gets the passport data-page form (no signed-out dead end):
 * the passport country comes from the saved route's From, else the profile, which also fills the
 * rest. The AI runs only on submit and on "Refresh matches": the last result is kept on this
 * device for 24 hours (app/lib/match.js), so a reload shows it again with no request, and a submit
 * of the same details reuses it. A result lands as stamps along a dashed route (MatchRoute), then
 * five detail cards; tapping a stamp or "Set as destination" saves it as the route's To, which the
 * navbar's route pill follows.
 */
export default function MatchPage() {
  const [form, setForm] = useState(EMPTY_FORM);
  // Where the passport country came from: 'route' | 'profile' | 'saved' (the restored last search).
  const [note, setNote] = useState(null);
  // A request in flight: 'search' (the form; the result makes way for a blank route) or 'refresh'.
  const [busy, setBusy] = useState(null);
  const [error, setError] = useState('');
  const [refreshError, setRefreshError] = useState('');
  // The result shown: { id, matches, profile (what was sent), fresh (arrived on a submit / refresh,
  // not restored on load), source ('ai': the AI just answered; 'device': an earlier answer kept on
  // this device, restored or reused), kept (it is saved on this device) }.
  const [result, setResult] = useState(null);
  const [pickNote, setPickNote] = useState('');
  // One guard per page: a newer search (a resubmit, a refresh) makes older answers stale.
  const [latest] = useState(createLatest);
  // The saved profile (its job types join the request); `edited`: the person has changed the form
  // or searched, so a late account profile no longer fills it (lateProfileFills).
  const saved = useRef(null);
  const edited = useRef(false);
  const route = useSavedRoute();

  // On load: the last result kept on this device (with the details it ran for), else the prefill
  // (matchPrefill) from the saved route and the profile on this device, then the account's profile
  // once it arrives, unless the form was changed meanwhile. Nothing here asks the AI.
  useEffect(() => {
    const storage = deviceStorage();
    const last = readLastMatch(storage, Date.now());
    // The device's storage exists only in the browser: the server renders the empty form, and it
    // is filled once, right after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (last) {
      saved.current = last.profile;
      setForm(matchPrefill({ profile: last.profile }).value);
      setNote('saved');
      setResult({ id: latest.next(), matches: last.matches, profile: last.profile, fresh: false, source: 'device', kept: true });
      return undefined;
    }
    const savedRoute = readRoute(storage);
    const fill = (profile) => {
      saved.current = profile;
      const prefill = matchPrefill({ route: savedRoute, profile });
      setForm(prefill.value);
      setNote(prefill.nationalityFrom);
    };
    fill(deviceProfile());
    /* eslint-enable react-hooks/set-state-in-effect */
    let cancelled = false;
    fetch('/api/user-profile')
      .then((res) => res.json())
      .then(({ profile }) => {
        if (!cancelled && lateProfileFills(profile, edited.current)) fill(profile);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [latest]);

  const changeForm = (next) => {
    edited.current = true;
    if (next.nationality !== form.nationality) setNote(null);
    setForm(next);
  };

  // A search for `profile`: the result kept on this device for it when fresh (no request), unless
  // `refresh`; otherwise the AI, under the stale guard, and the answer is kept for 24 hours. A
  // refresh keeps the current result on screen until the new one arrives (or fails).
  const run = async (profile, { refresh = false } = {}) => {
    const key = profileKey(profile);
    setError('');
    setRefreshError('');
    setPickNote('');
    const kept = refresh ? null : readMatchCache(deviceStorage(), key, Date.now());
    if (kept) {
      // A new id: an answer still on its way (if any) is now stale.
      setResult({ id: latest.next(), matches: kept, profile, fresh: true, source: 'device', kept: true });
      return;
    }
    setBusy(refresh ? 'refresh' : 'search');
    if (!refresh) setResult(null);
    const outcome = await fetchMatches(latest, profile, { refresh });
    if (!outcome) return; // a newer search started meanwhile: its answer is the one shown
    setBusy(null);
    if (outcome.error) {
      if (refresh) setRefreshError(outcome.error);
      else setError(outcome.error);
      return;
    }
    const keptNow = writeMatchCache(deviceStorage(), key, outcome.matches, Date.now(), profile);
    setResult({ id: outcome.id, matches: outcome.matches, profile, fresh: true, source: 'ai', kept: keptNow });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (busy) return;
    // From now on the form (and the result under it) is the person's: a late profile leaves it be.
    edited.current = true;
    if (!countryByCode(form.nationality)) {
      setError(NO_NATIONALITY);
      return;
    }
    run(requestProfile(form, saved.current));
  };

  const refresh = () => {
    if (!busy && result) run(result.profile, { refresh: true });
  };

  // A tap on a stamp or "Set as destination": the route From (the passport searched) -> this
  // country, saved on this device; the navbar's route pill follows (announceRouteChange).
  const pick = (match) => {
    const ok = setDestination(deviceStorage(), { from: result?.profile.nationality, to: match.country_code }, announceRouteChange);
    setPickNote(
      ok
        ? `${match.country_name} is now your destination.`
        : `Couldn’t save ${match.country_name} as your destination: this browser is blocking storage.`,
    );
  };

  const picked = route?.to ?? null;
  const fromName = result ? countryByCode(result.profile.nationality)?.name : '';
  const Wrap = result?.fresh ? ResultArrival : Restored;

  return (
    <ToolShell header={<ToolHeader {...HERO_COPY.match} />}>
      <div className="mt-page">
        <MatchForm
          value={form}
          onChange={changeForm}
          onSubmit={handleSubmit}
          loading={Boolean(busy)}
          error={error}
          note={note}
        />

        <div className="mt-results">
          {busy === 'search' && (
            <PassportCard as="div" className="mt-routecard mt-routecard--pending">
              <p className="mt-kicker" aria-hidden="true">
                Plotting your route…
              </p>
              <PendingRoute />
            </PassportCard>
          )}
          {result && (
            <Wrap key={result.id} id={RESULTS_HEADING_ID} label={matchReadyLabel(result.matches.length)}>
              <PassportCard as="div" className="mt-routecard">
                <h2 id={RESULTS_HEADING_ID} className="mt-h2">
                  {matchCountLabel(result.matches.length)}
                </h2>
                <p className="mt-hint">
                  {fromName ? `For a passport from ${fromName}. ` : ''}Tap a stamp to set it as your destination.
                </p>
                <MatchRoute matches={result.matches} onPick={pick} picked={picked} />
                <p className="mt-picked" role="status">
                  {pickNote}
                </p>
              </PassportCard>
              <ol className="mt-cards">
                {result.matches.map((match, i) => (
                  <li key={match.country_code}>
                    <CountryMatchCard
                      match={match}
                      rank={i + 1}
                      from={result.profile.nationality}
                      picked={picked === match.country_code}
                      onPick={pick}
                    />
                  </li>
                ))}
              </ol>
              <div className="mt-again">
                <p className="mt-saved">{matchKeptText(result)}</p>
                <p className="mt-error" role="alert">
                  {refreshError}
                </p>
                <Btn variant="secondary" as="button" type="button" onClick={refresh} aria-disabled={Boolean(busy)} className="mt-refresh">
                  {busy === 'refresh' ? 'Asking again…' : 'Refresh matches'}
                </Btn>
              </div>
              <DisclaimerBlock tone="paper" />
            </Wrap>
          )}
        </div>

        <Footnote tone="paper">{FOOTNOTES.match}</Footnote>
      </div>
    </ToolShell>
  );
}
