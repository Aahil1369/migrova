'use client';

import { useState } from 'react';
import PassportCard from '../components/kit/PassportCard';
import Chip from '../components/kit/Chip';
import Guilloche from '../components/kit/Guilloche';
import { heroMrz } from '../components/kit/heroMrz';
import Btn from '../components/ui/Btn';
import { COUNTRIES_195, REGIONS, countryByCode } from '../data/countries195';
import { EXPERIENCE_LEVELS } from '../lib/match';

const COUNTRIES = [...COUNTRIES_195].sort((x, y) => x.name.localeCompare(y.name));

/** An empty form (the five fields matchPrefill fills). */
export const EMPTY_FORM = Object.freeze({ nationality: '', currentCountry: '', experience: '', skills: '', preferredCountries: [] });

const NOTES = {
  route: 'From your saved route',
  profile: 'From your profile',
  saved: 'From your last search on this device',
};

// A label in the passport's two languages; the French half is decoration.
function Label({ htmlFor, en, fr, as: Tag = 'label' }) {
  return (
    <Tag htmlFor={htmlFor} className="mt-label">
      {en}
      <span className="mt-fr" aria-hidden="true">
        {' '}/ {fr}
      </span>
    </Tag>
  );
}

/**
 * The search as a passport data page (a real <form>; Enter submits): passport country (required),
 * where you live now, experience, skills, and preferred regions as chips (any preferred countries
 * from the profile join them). Controlled: `value` (EMPTY_FORM's shape), `onChange(next)`,
 * `onSubmit(event)`. `note`: where the passport country came from ('route' | 'profile' | 'saved').
 * `loading`: the button reads busy (aria-disabled, so keyboard focus stays on it) and a status line
 * tells screen readers. `error`: the alert line. The MRZ strip at the foot is decoration.
 */
export default function MatchForm({ value, onChange, onSubmit, loading = false, error = '', note = null }) {
  const set = (field) => (event) => onChange({ ...value, [field]: event.target.value });
  // Preferred places beyond the six regions (countries from the profile) keep their chip once
  // shown, so un-pressing one never removes the button that has keyboard focus.
  const [extras, setExtras] = useState([]);
  const unseen = value.preferredCountries.filter((p) => !REGIONS.includes(p) && !extras.includes(p));
  if (unseen.length) setExtras([...extras, ...unseen]);
  const places = [...REGIONS, ...extras, ...unseen];
  const toggle = (place) =>
    onChange({
      ...value,
      preferredCountries: value.preferredCountries.includes(place)
        ? value.preferredCountries.filter((p) => p !== place)
        : [...value.preferredCountries, place],
    });

  return (
    <PassportCard as="form" className="mt-form" onSubmit={onSubmit} aria-labelledby="mt-form-h">
      <Guilloche seed="match-data-page" className="mt-form-guilloche" />
      <p className="mt-kicker mt-form-kicker" aria-hidden="true">
        <span>Passport · data page</span>
        <span>M-1</span>
      </p>
      <h2 id="mt-form-h" className="mt-form-h">
        Your details
      </h2>
      <p className="mt-form-sub">No sign-in needed. Only your passport country is required.</p>

      <div className="mt-fields">
        <div>
          <Label htmlFor="match-nationality" en="Passport country" fr="Nationalité" />
          <select
            id="match-nationality"
            value={value.nationality}
            onChange={set('nationality')}
            aria-required="true"
            aria-describedby={note ? 'match-note' : undefined}
            className="kit-select"
          >
            <option value="">Select your passport’s country</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
          {note ? (
            <p id="match-note" className="mt-prefilled">
              {NOTES[note]}
            </p>
          ) : null}
        </div>
        <div>
          <Label htmlFor="match-current" en="Where you live now" fr="Résidence" />
          <select id="match-current" value={value.currentCountry} onChange={set('currentCountry')} className="kit-select">
            <option value="">Not given</option>
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="match-experience" en="Work experience" fr="Expérience" />
          <select id="match-experience" value={value.experience} onChange={set('experience')} className="kit-select">
            <option value="">Not given</option>
            {EXPERIENCE_LEVELS.map((level) => (
              <option key={level.value} value={level.value}>
                {level.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="match-skills" en="Skills or field" fr="Compétences" />
          <input
            id="match-skills"
            value={value.skills}
            onChange={set('skills')}
            placeholder="e.g. Nursing, Python, Welding"
            autoComplete="off"
            maxLength={300}
            className="kit-input"
          />
        </div>
      </div>

      <fieldset className="mt-regions">
        <Label as="legend" en="Preferred regions" fr="Régions" />
        <div className="mt-chips">
          {places.map((place) => (
            <Chip key={place} pressed={value.preferredCountries.includes(place)} onClick={() => toggle(place)}>
              {countryByCode(place)?.name ?? place}
            </Chip>
          ))}
        </div>
      </fieldset>

      <p className="mt-error" role="alert">
        {error}
      </p>
      <p className="sr-only" role="status">
        {loading ? 'Finding your top 5 countries…' : ''}
      </p>
      <Btn variant="primary" as="button" type="submit" aria-disabled={loading} className="mt-submit">
        {loading ? 'Plotting your route…' : 'Find my top 5 countries'}
      </Btn>
      <p className="mt-form-mrz" aria-hidden="true">
        {heroMrz('P', { from: value.nationality })}
      </p>
    </PassportCard>
  );
}
