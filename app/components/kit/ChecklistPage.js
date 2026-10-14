'use client';

import { useEffect, useId, useMemo, useState, useSyncExternalStore } from 'react';
import { checklistProgress, packedStamp, readChecklist, writeChecklist } from './checklistStore';
import { deviceStorage } from './deviceStorage';
import PassportCard from './PassportCard';
import { Stamp } from './Stamp';
import { STAMP_INKS } from './stampInks';
import './kit.css';

// Window event fired after a checklist is saved on this page (other tabs get 'storage').
const CHECK_EVENT = 'migrova:checklist';

function subscribe(onChange) {
  window.addEventListener(CHECK_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CHECK_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

// The raw saved string is the snapshot (stable between reads); blocked storage -> null.
function rawSaved(key) {
  try {
    return deviceStorage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

const PACKED_LINES = ['ALL ITEMS', 'PACKED', 'MGV'];

// The PACKED stamp, mounted when a tick here completes the list: it renders un-applied, then lands
// on the second frame (once the browser has styled it), so the thunk plays once per completion.
// Reduced motion: kit.css shows a stamp's final state, no motion.
function LandingStamp() {
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(() => setApplied(true));
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
    };
  }, []);
  return <Stamp shape="rect" color={STAMP_INKS.green} lines={PACKED_LINES} applied={applied} rotate={-6} />;
}

/**
 * A tickable checklist on a paper card, saved on this device under `storageKey` (checklistKey()).
 * Each item is a real checkbox with a bound label; the header counts "n / m packed"; when a tick
 * here completes the list a green PACKED stamp lands (decorative, aria-hidden) and "All items
 * packed" is announced. A list that is already complete when it appears (restored from this
 * device) shows the stamp at rest: no thunk, no announcement (packedStamp). Nothing ticked on
 * the server; the saved ticks appear once the page has hydrated.
 * Where storage is blocked the ticks still work, they just are not kept.
 */
export function ChecklistPage({ storageKey, title, items = [] }) {
  const uid = useId();
  const raw = useSyncExternalStore(subscribe, () => rawSaved(storageKey), () => null);
  const saved = useMemo(() => readChecklist({ getItem: () => raw }, storageKey), [raw, storageKey]);
  // Ticks kept in memory only, after the storage refused a write ({ key, checked }).
  const [unsaved, setUnsaved] = useState(null);
  const checked = unsaved && unsaved.key === storageKey ? unsaved.checked : saved;
  const { done, total, complete } = checklistProgress(items.length, checked);
  // The key of the list a tick here last completed (null: none), so only a completion made in
  // this session lands the stamp and is announced.
  const [packedKey, setPackedKey] = useState(null);
  const stamp = packedStamp(complete, packedKey, storageKey);

  const toggle = (index) => {
    const next = checked.includes(index) ? checked.filter((n) => n !== index) : [...checked, index];
    setPackedKey(checklistProgress(items.length, next).complete ? storageKey : null);
    if (writeChecklist(deviceStorage(), storageKey, next)) {
      setUnsaved(null);
      window.dispatchEvent(new Event(CHECK_EVENT));
    } else {
      setUnsaved({ key: storageKey, checked: next });
    }
  };

  const headingId = `${uid}-h`;
  return (
    <PassportCard className="kit-check" aria-labelledby={headingId}>
      <div className="kit-check-head">
        <div>
          <h3 id={headingId} className="kit-check-title">
            {title}
          </h3>
          <p className="kit-check-count">
            {done} / {total} packed
          </p>
        </div>
        <span className="kit-check-stamp" aria-hidden="true">
          {stamp === 'land' ? <LandingStamp /> : null}
          {stamp === 'rest' ? <Stamp shape="rect" color={STAMP_INKS.green} lines={PACKED_LINES} still rotate={-6} /> : null}
        </span>
      </div>
      <ul className="kit-check-list">
        {items.map((item, index) => {
          const id = `${uid}-${index}`;
          return (
            <li key={index} className="kit-check-item">
              <input
                id={id}
                type="checkbox"
                className="kit-check-box"
                checked={checked.includes(index)}
                onChange={() => toggle(index)}
              />
              <label htmlFor={id}>{item}</label>
            </li>
          );
        })}
      </ul>
      <p className="sr-only" aria-live="polite">
        {stamp === 'land' ? 'All items packed' : ''}
      </p>
    </PassportCard>
  );
}

export default ChecklistPage;
