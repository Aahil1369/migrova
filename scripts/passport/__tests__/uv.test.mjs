import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fakeDomain, uvRevealLevel, uvFlickerStep } from '../../../app/components/passport/pages/uv.js';
import { flapStyle, inlineFlapStyle } from '../../../app/components/passport/stageStyle.js';

// ---- fakeDomain (the invented look-alike for the UV check; never a real scam domain) --------

test('fakeDomain: lowercased, hyphenated country name + -visa-fastpass.example', () => {
  assert.equal(fakeDomain('United Kingdom'), 'united-kingdom-visa-fastpass.example');
  assert.equal(fakeDomain('Canada'), 'canada-visa-fastpass.example');
});

test('fakeDomain: accents stripped (NFKD), punctuation -> dashes, dashes collapsed and trimmed', () => {
  assert.equal(fakeDomain("Côte d'Ivoire"), 'cote-d-ivoire-visa-fastpass.example');
  assert.equal(fakeDomain('  São Tomé and Príncipe  '), 'sao-tome-and-principe-visa-fastpass.example');
  assert.equal(fakeDomain('Guinea--Bissau!!'), 'guinea-bissau-visa-fastpass.example');
  assert.equal(fakeDomain('Saint Vincent and the Grenadines'), 'saint-vincent-and-the-grenadines-visa-fastpass.example');
});

test('fakeDomain: always the reserved .example TLD, even for empty / odd input', () => {
  for (const name of ['', null, undefined, '---', '🇨🇦', 42]) {
    const d = fakeDomain(name);
    assert.match(d, /^[a-z0-9]+(-[a-z0-9]+)*-visa-fastpass\.example$/, String(name));
  }
  assert.equal(fakeDomain(''), 'country-visa-fastpass.example');
});

// ---- uvRevealLevel: cards auto-reveal one after the other as the UV beat holds -------------

test('uvRevealLevel: 0 before/at the start of the beat, 1 then 2 while it holds', () => {
  assert.equal(uvRevealLevel(0), 0);
  assert.equal(uvRevealLevel(0.3), 0);
  assert.equal(uvRevealLevel(0.45), 1);
  assert.equal(uvRevealLevel(0.55), 1);
  assert.equal(uvRevealLevel(0.6), 2);
  assert.equal(uvRevealLevel(1), 2);
});

test('uvRevealLevel: NaN / out of range never reveal by accident', () => {
  assert.equal(uvRevealLevel(NaN), 0);
  assert.equal(uvRevealLevel(undefined), 0);
  assert.equal(uvRevealLevel(-1), 0);
  assert.equal(uvRevealLevel(7), 2);
});

// ---- uvFlickerStep: the warm flicker fires once per exit, never every frame -----------------

test('uvFlickerStep: arms once the dim is up, fires once as it falls past 0.5', () => {
  let armed = false;
  const fired = [];
  for (const dim of [0, 0.3, 0.7, 1, 1, 0.8, 0.55, 0.49, 0.3, 0.1, 0]) {
    const step = uvFlickerStep(armed, dim);
    armed = step.armed;
    fired.push(step.fire);
  }
  assert.deepEqual(fired.map((f, i) => (f ? i : -1)).filter((i) => i >= 0), [7]);
});

test('uvFlickerStep: jitter around 0.5 does not re-fire until the dim is up again', () => {
  let armed = false;
  let count = 0;
  for (const dim of [1, 0.45, 0.52, 0.48, 0.55, 0.4, 0.58, 0.2]) {
    const step = uvFlickerStep(armed, dim);
    armed = step.armed;
    if (step.fire) count++;
  }
  assert.equal(count, 1, 'hysteresis: re-arms only at >= 0.6');
  // A second full exit fires again.
  for (const dim of [0.9, 1, 0.3]) {
    const step = uvFlickerStep(armed, dim);
    armed = step.armed;
    if (step.fire) count++;
  }
  assert.equal(count, 2);
});

test('uvFlickerStep: never fires on the way in, nor with NaN', () => {
  let armed = false;
  for (const dim of [0, 0.2, 0.5, 0.9, NaN]) {
    const step = uvFlickerStep(armed, dim);
    assert.equal(step.fire, false, String(dim));
    armed = step.armed;
  }
});

// ---- flapStyle: no blank flap popping in; it fades in over the first 15% of the swing -------

test('flapStyle: opacity ramps over the first 15% of the swing', () => {
  assert.equal(flapStyle(0).opacity, 0);
  assert.equal(flapStyle(0.075).opacity, 0.5);
  assert.equal(flapStyle(0.15).opacity, 1);
  assert.equal(flapStyle(0.6).opacity, 1);
  assert.equal(flapStyle(NaN).opacity, 0);
});

// ---- inlineFlapStyle: phones / lite fold the UV check over the sources page body ------------

test('inlineFlapStyle: the page fades out first, then the UV check fades/slides in (never both half-shown)', () => {
  const at = (f) => inlineFlapStyle(f);
  assert.deepEqual(at(0), { pageOpacity: 1, opacity: 0, transform: 'translate3d(0, 24px, 0)', pointerEvents: 'none', pagePointerEvents: 'auto' });
  assert.equal(at(0.25).pageOpacity, 0.5);
  assert.equal(at(0.25).opacity, 0);
  assert.equal(at(0.5).pageOpacity, 0);
  assert.equal(at(0.5).opacity, 0);
  assert.equal(at(0.75).opacity, 0.5);
  assert.deepEqual(at(1), { pageOpacity: 0, opacity: 1, transform: 'translate3d(0, 0px, 0)', pointerEvents: 'auto', pagePointerEvents: 'none' });
  for (const f of [0, 0.1, 0.3, 0.5, 0.6, 0.9, 1]) {
    const s = at(f);
    assert.ok(s.pageOpacity === 0 || s.opacity === 0, `never both showing at ${f}`);
    assert.ok(!(s.pointerEvents === 'auto' && s.pagePointerEvents === 'auto'), `one layer takes taps at ${f}`);
  }
  assert.deepEqual(at(NaN), at(0));
});
