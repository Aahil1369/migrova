import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampStory, stampDate, STORY_MAX } from '../../../app/components/passport/pages/storyText.js';

test('clampStory: a 5000-char story is cut to 220 chars + "…"', () => {
  const out = clampStory('a'.repeat(5000));
  assert.equal(out.length, 221);
  assert.ok(out.endsWith('…'));
  assert.equal(STORY_MAX, 220);
});

test('clampStory: short text is unchanged', () => {
  assert.equal(clampStory('short'), 'short');
});

test('clampStory: exactly 220 chars is not cut', () => {
  const s = 'b'.repeat(220);
  assert.equal(clampStory(s), s);
});

test('clampStory: whitespace and newlines collapse; null/undefined -> empty string', () => {
  assert.equal(clampStory('  We moved\n\nin 2019.  '), 'We moved in 2019.');
  assert.equal(clampStory(null), '');
  assert.equal(clampStory(undefined), '');
});

test('clampStory: never splits an emoji / surrogate pair', () => {
  const out = clampStory('😀'.repeat(300));
  assert.equal(Array.from(out).length, 221);
  assert.ok(out.endsWith('😀…'));
});

test('stampDate: DD MMM YYYY in upper case', () => {
  assert.equal(stampDate(new Date(2026, 9, 9)), '09 OCT 2026');
  assert.equal(stampDate(new Date(2027, 0, 31)), '31 JAN 2027');
});
