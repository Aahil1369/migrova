'use client';

import { useRouter } from 'next/navigation';
import { COUNTRIES_195 } from '../../data/countries195';
import { usePassport } from './PassportContext';
import { exploreHref } from './search';
import './stage.css';

// Deterministic A-Z (accents folded) so server and browser render the same option order.
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const OPTIONS = [...COUNTRIES_195].sort((a, b) => (fold(a.name) < fold(b.name) ? -1 : fold(a.name) > fold(b.name) ? 1 : 0));

/**
 * From / To / "Explore →" (hero and finale). Reads and writes the shared route in
 * PassportContext, so the data page and the real-site card follow it live. Nothing is saved
 * to storage here. Explore: To = Anywhere (or unset) -> /match; else /visa?from=&to=.
 */
export default function JourneySearch({ variant = 'hero' }) {
  const { route, setRoute } = usePassport();
  const router = useRouter();
  const id = `js-${variant}`;

  const onSubmit = (e) => {
    e.preventDefault();
    router.push(exploreHref(route));
  };

  return (
    <form
      className={`js js--${variant}`}
      role="search"
      aria-label={variant === 'finale' ? 'Plan your move again' : 'Plan your move'}
      onSubmit={onSubmit}
    >
      <div className="js-field">
        <label htmlFor={`${id}-from`}>From</label>
        <select
          id={`${id}-from`}
          value={route.from || ''}
          onChange={(e) => setRoute((prev) => ({ ...prev, from: e.target.value || null }))}
        >
          <option value="">Choose country</option>
          {OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="js-field">
        <label htmlFor={`${id}-to`}>To</label>
        <select
          id={`${id}-to`}
          value={route.to || 'any'}
          onChange={(e) => setRoute((prev) => ({ ...prev, to: e.target.value || null }))}
        >
          <option value="any">Anywhere</option>
          {OPTIONS.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className="js-go">
        Explore →
      </button>
    </form>
  );
}
