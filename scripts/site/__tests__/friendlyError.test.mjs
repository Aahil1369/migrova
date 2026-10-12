// What a visitor reads when an AI call fails: plain, calm, never the raw error text.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { friendlyError } = await import(new URL('../../../app/lib/friendlyError.js', import.meta.url));

test('friendlyError: the exact sentence for each kind', () => {
  assert.equal(friendlyError('visa'), "We couldn't build your visa report right now. Please try again in a minute.");
  assert.equal(friendlyError('probability'), 'Chance estimate unavailable right now.');
  assert.equal(friendlyError('relocation'), "We couldn't build your relocation guide right now. Please try again in a minute.");
  assert.equal(friendlyError('match'), "We couldn't find your matches right now. Please try again in a minute.");
});

test('friendlyError: anything else gets the generic sentence', () => {
  const generic = 'Something went wrong. Please try again in a minute.';
  assert.equal(friendlyError('unknown'), generic);
  assert.equal(friendlyError('nope'), generic);
  assert.equal(friendlyError(), generic);
  assert.equal(friendlyError(null), generic);
  assert.equal(friendlyError('constructor'), generic);
  assert.equal(friendlyError('__proto__'), generic);
});

test('friendlyError: no message leaks technical words', () => {
  for (const kind of ['visa', 'probability', 'relocation', 'match', 'unknown', 'nope']) {
    const text = friendlyError(kind);
    assert.ok(!/error|json|token|exception|groq|undefined|null/i.test(text), `${kind}: ${text}`);
    assert.ok(text.length > 0 && text.length < 120, kind);
  }
});
