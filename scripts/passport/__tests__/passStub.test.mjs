import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stubState, NOTE_SAVED, NOTE_FAILED } from '../../../app/components/passport/passStub.js';

const KEY = 'PAK ✈ CAN';
const base = { key: KEY, remembered: false, routeComplete: true, reduced: false };

test('stubState: a fresh, complete route shows the tear stub (or the button in reduced motion)', () => {
  assert.deepEqual(stubState({ ...base, tear: null }), { view: 'stub', disabled: false, hint: false, note: '', noteOk: null });
  assert.equal(stubState({ ...base, tear: null, reduced: true }).view, 'button');
});

test('stubState: empty route -> stub disabled with the hint', () => {
  const s = stubState({ ...base, tear: null, routeComplete: false });
  assert.equal(s.view, 'stub');
  assert.equal(s.disabled, true);
  assert.equal(s.hint, true);
  assert.equal(stubState({ ...base, tear: null, routeComplete: false, reduced: true }).view, 'button');
});

test('stubState: while the stub flies, the note already says what happened', () => {
  const ok = stubState({ ...base, tear: { key: KEY, ok: true, done: false } });
  assert.equal(ok.view, 'flying');
  assert.equal(ok.note, NOTE_SAVED);
  assert.equal(ok.noteOk, true);
  const failed = stubState({ ...base, tear: { key: KEY, ok: false, done: false } });
  assert.equal(failed.view, 'flying');
  assert.equal(failed.note, NOTE_FAILED);
  assert.equal(failed.noteOk, false);
});

test('stubState: a finished successful tear shows "remembered" while the route is still saved', () => {
  const s = stubState({ ...base, remembered: true, tear: { key: KEY, ok: true, done: true } });
  assert.equal(s.view, 'remembered');
  assert.equal(s.note, NOTE_SAVED);
});

test('stubState: forgotten after the tear (pill ✕, another tab) -> back to "Tear to remember", no stale note', () => {
  const s = stubState({ ...base, remembered: false, tear: { key: KEY, ok: true, done: true } });
  assert.deepEqual(s, { view: 'stub', disabled: false, hint: false, note: '', noteOk: null });
  assert.equal(stubState({ ...base, remembered: false, reduced: true, tear: { key: KEY, ok: true, done: true } }).view, 'button');
});

test('stubState: failed save (storage blocked) -> no stub, the failure note stays', () => {
  const s = stubState({ ...base, tear: { key: KEY, ok: false, done: true } });
  assert.equal(s.view, 'failed');
  assert.equal(s.note, NOTE_FAILED);
  assert.equal(s.noteOk, false);
});

test('stubState: already remembered from an earlier visit -> "remembered", nothing announced', () => {
  const s = stubState({ ...base, remembered: true, tear: null });
  assert.equal(s.view, 'remembered');
  assert.equal(s.note, '');
});

test('stubState: a tear for another route is ignored (new search shows a fresh stub)', () => {
  const s = stubState({ ...base, tear: { key: 'NGA ✈ ANY', ok: true, done: true } });
  assert.equal(s.view, 'stub');
  assert.equal(s.note, '');
});
