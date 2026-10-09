// Boarding-pass stub state. Pure and framework-free (unit-tested in passStub.test.mjs).

export const NOTE_SAVED = "Route saved. It's in the top bar on every page.";
export const NOTE_FAILED = "Couldn't save the route on this device: this browser is blocking storage.";

/**
 * What the stub slot shows.
 *   tear          { key, ok, done } of the last tear (or Remember click), or null
 *   key           routeLabel(current route): a tear only counts for the route it was made for
 *   remembered    the current route is the one saved on this device right now
 *   routeComplete there is something worth remembering (hasRoute)
 *   reduced       reduced motion: a "Remember this route" button instead of the tear stub
 * -> { view: 'stub' | 'button' | 'flying' | 'remembered' | 'failed', disabled, hint, note, noteOk }
 * A finished successful tear only counts while the route is still saved: once it is forgotten
 * (the pill's ✕, another tab) the stub comes back and the old "saved" note goes away.
 */
export function stubState({ tear, key, remembered = false, routeComplete = false, reduced = false } = {}) {
  let t = tear && tear.key === key ? tear : null;
  if (t && t.ok && t.done && !remembered) t = null;

  const note = t ? (t.ok ? NOTE_SAVED : NOTE_FAILED) : '';
  const noteOk = t ? Boolean(t.ok) : null;
  const shown = (view) => ({ view, disabled: false, hint: false, note, noteOk });

  if (t && !t.done) return shown('flying');
  if (t && t.ok) return shown('remembered');
  if (t) return shown('failed');
  if (remembered) return shown('remembered');
  return { view: reduced ? 'button' : 'stub', disabled: !routeComplete, hint: !routeComplete, note, noteOk };
}
