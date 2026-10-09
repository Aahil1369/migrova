import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  MRZ_LEN, MRZ_PLAIN, DECODE_FRAMES, buildMrz, decodeFrame,
} from '../../../app/components/passport/mrz.js';

const MRZ_RE = /^[A-Z0-9<]{44}$/;

test('constants', () => {
  assert.equal(MRZ_LEN, 44);
  assert.equal(DECODE_FRAMES, 59);
  assert.equal(MRZ_PLAIN.length, 2);
  for (const line of MRZ_PLAIN) assert.ok(line.length <= MRZ_LEN, line);
});

test('empty route yields defaults, never undefined/null', () => {
  const [l1, l2] = buildMrz({});
  assert.match(l1, MRZ_RE);
  assert.match(l2, MRZ_RE);
  assert.ok(l1.includes('YOUR<FAMILY'), l1);
  assert.ok(l2.includes('ANY'), l2);
  assert.ok(!/undefined|null/i.test(l1 + l2));
  assert.deepEqual(buildMrz(), buildMrz({}));
  assert.deepEqual(buildMrz({ fromIso3: null, toIso3: null }), buildMrz({}));
});

test('line construction matches the spec exactly', () => {
  const [l1, l2] = buildMrz({ fromIso3: 'PAK', toIso3: 'CAN', count: 418 });
  assert.equal(l1, 'P<MGVYOUR<FAMILY<<PAK'.padEnd(44, '<'));
  assert.equal(l2, '1950418MGV<<CAN<<NEXT<STOP'.padEnd(44, '<'));
});

test('the verified-link count is passed in, never hard-coded (4 digits, filler when unknown)', () => {
  const line2 = (count) => buildMrz({ toIso3: 'CAN', count })[1];
  assert.ok(line2(418).startsWith('1950418MGV'));
  assert.ok(line2(523).startsWith('1950523MGV'));
  assert.ok(line2(7).startsWith('1950007MGV'));
  assert.ok(line2(12345).startsWith('1959999MGV'), 'capped at 4 digits');
  assert.ok(line2(41.8).startsWith('1950041MGV'));
  for (const bad of [undefined, null, NaN, -3, 'abc', Infinity]) {
    assert.ok(line2(bad).startsWith('195<<<<MGV'), String(bad));
    assert.match(line2(bad), MRZ_RE);
  }
  assert.ok(!buildMrz({}).join('').includes('0418'), 'no count -> no made-up number');
});

test('route codes appear in the lines', () => {
  const [l1, l2] = buildMrz({ fromIso3: 'PAK', toIso3: 'CAN' });
  assert.ok(l1.includes('PAK'));
  assert.ok(l2.includes('CAN'));
});

test('overly long or messy inputs still produce 44 valid characters', () => {
  const [l1, l2] = buildMrz({ fromIso3: 'X'.repeat(80), toIso3: 'Y'.repeat(80) });
  assert.match(l1, MRZ_RE);
  assert.match(l2, MRZ_RE);
  const [m1, m2] = buildMrz({ fromIso3: 'saint vincent and the grenadines', toIso3: 'ca-n!' });
  assert.match(m1, MRZ_RE);
  assert.match(m2, MRZ_RE);
  assert.ok(m1.includes('SAINT<VINCENT'));
  assert.ok(m2.includes('CA<N<'));
});

test('decodeFrame: early frames return raw, final frame returns padded plain', () => {
  const raw = buildMrz({})[0];
  const plain = MRZ_PLAIN[0];
  for (let f = 0; f <= 6; f++) assert.equal(decodeFrame(raw, plain, f), raw);
  assert.equal(decodeFrame(raw, plain, DECODE_FRAMES), plain.padEnd(44));
  assert.equal(decodeFrame(raw, plain, DECODE_FRAMES + 40), plain.padEnd(44));
});

test('decodeFrame: deterministic, always MRZ_LEN, progressively reveals plain', () => {
  const raw = buildMrz({ fromIso3: 'PAK', toIso3: 'CAN' })[1];
  const plain = MRZ_PLAIN[1];
  const padded = plain.padEnd(44);
  for (let f = 0; f <= DECODE_FRAMES + 2; f++) {
    const a = decodeFrame(raw, plain, f);
    assert.equal(a.length, MRZ_LEN, `frame ${f}`);
    assert.equal(a, decodeFrame(raw, plain, f));
  }
  // Character i is revealed once frame >= 18 + floor(i * 0.9).
  const mid = decodeFrame(raw, plain, 30);
  for (let i = 0; i < MRZ_LEN; i++) {
    if (30 >= 18 + Math.floor(i * 0.9)) assert.equal(mid[i], padded[i], `revealed ${i}`);
    else assert.match(mid[i], /[A-Z0-9<]/, `scrambled ${i}`);
  }
  assert.notEqual(mid, padded);
});

test('decodeFrame tolerates short, long and missing lines', () => {
  assert.equal(decodeFrame('SHORT', 'ALSO SHORT', 0).length, MRZ_LEN);
  assert.equal(decodeFrame('X'.repeat(90), 'Y'.repeat(90), 10).length, MRZ_LEN);
  assert.equal(decodeFrame('X'.repeat(90), 'Y'.repeat(90), DECODE_FRAMES), 'Y'.repeat(44));
  assert.equal(decodeFrame(undefined, undefined, 20).length, MRZ_LEN);
});
