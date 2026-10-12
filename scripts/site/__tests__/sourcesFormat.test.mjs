// One "Verified <date>" format site-wide: the sources pages and the kit's VerifiedLinkCard both
// print dates through lib/sourcesFormat's formatVerified (dataset-free, so the client may import it).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../../../', import.meta.url);
const { formatVerified } = await import(new URL('app/lib/sourcesFormat.js', ROOT));

test('formatVerified: an ISO date as the sources pages print it', () => {
  assert.equal(formatVerified('2026-09-27'), 'Sep 27, 2026');
  assert.equal(formatVerified('2026-01-05'), 'Jan 5, 2026');
});

test('formatVerified: anything that is not an ISO date is shown as given, never "Invalid Date"', () => {
  for (const odd of ['Sept 2026', '27/09/2026', '2026-9-27', '2026-13-45', 'soon']) {
    assert.equal(formatVerified(odd), odd);
  }
  assert.equal(formatVerified(undefined), '');
  assert.equal(formatVerified(null), '');
});

test('VerifiedLinkCard prints its date with the shared formatVerified', () => {
  const src = readFileSync(new URL('app/components/kit/VerifiedLinkCard.js', ROOT), 'utf8');
  assert.match(src, /import \{ formatVerified \} from '\.\.\/\.\.\/lib\/sourcesFormat\.js';/);
  assert.doesNotMatch(src, /toLocaleDateString/, 'no second date formatter in the kit');
});
