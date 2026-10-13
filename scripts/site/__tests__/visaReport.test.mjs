// Visa Intelligence (/visa): the issued visa's pure logic. Which entry stamp a report gets (never a
// negative word), the chance line, the raw and plain-English MRZ lines (always 2 x 44 characters,
// whatever the AI sends), the card's lead visa, and the documents checklist key and items.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  VISA_STAMPS, visaStamp, visaEntry, chanceLine, visaRawMrz, visaPlainMrz, leadVisa, docsKey, checklistItems,
  MISSING_FIELDS, visaSubmitStep,
} = await import(new URL('../../../app/visa/visaReport.js', import.meta.url));

const RAW = /^[A-Z0-9<]{44}$/;
const CHECK = { lines: ['CHECK'], ink: 'gold' };

test('visaStamp: one entry stamp per currentStatus, CHECK / gold for anything else', () => {
  assert.deepEqual(visaStamp('visa-free'), { lines: ['VISA FREE'], ink: 'green' });
  assert.deepEqual(visaStamp('e-visa'), { lines: ['E-VISA', 'APPLY ONLINE'], ink: 'blue' });
  assert.deepEqual(visaStamp('visa-on-arrival'), { lines: ['ON ARRIVAL'], ink: 'blue' });
  assert.deepEqual(visaStamp('visa-required'), { lines: ['APPLY FIRST'], ink: 'gold' });
  assert.deepEqual(visaStamp('citizen'), { lines: ['HOME'], ink: 'green' });
  // The AI's casing / spacing slips still land on the right stamp.
  assert.deepEqual(visaStamp(' Visa Required '), { lines: ['APPLY FIRST'], ink: 'gold' });
  assert.deepEqual(visaStamp('VISA_FREE'), { lines: ['VISA FREE'], ink: 'green' });
  for (const junk of ['banned', undefined, null, '', 42, {}, ['e-visa'], 'constructor', '__proto__', 'x'.repeat(300)]) {
    assert.deepEqual(visaStamp(junk), CHECK, String(junk));
  }
  // A copy: a caller changing it cannot change the next report's stamp.
  visaStamp('e-visa').lines.push('DENIED');
  assert.deepEqual(visaStamp('e-visa').lines, ['E-VISA', 'APPLY ONLINE']);
});

test('no stamp ever says DENIED / REFUSED / REJECTED; every line fits a stamp (<= 18 chars)', () => {
  const stamps = [...Object.values(VISA_STAMPS), visaStamp('anything else')];
  assert.deepEqual(Object.keys(VISA_STAMPS), ['visa-free', 'e-visa', 'visa-on-arrival', 'visa-required', 'citizen']);
  for (const { lines, ink } of stamps) {
    assert.ok(['green', 'blue', 'gold'].includes(ink), ink);
    for (const line of lines) {
      assert.doesNotMatch(line, /DENIED|REFUSED|REJECTED/);
      assert.ok(line.length <= 18, line);
    }
  }
});

test('visaEntry: the stamp as plain words for the card (status + next step)', () => {
  assert.deepEqual(visaEntry('visa-required'), { label: 'Visa required', step: 'Apply before you go' });
  assert.deepEqual(visaEntry('visa-free'), { label: 'Visa free', step: 'No visa needed for short stays' });
  assert.deepEqual(visaEntry('e-visa'), { label: 'E-visa', step: 'Apply online before you go' });
  assert.deepEqual(visaEntry('visa-on-arrival'), { label: 'Visa on arrival', step: 'Get it when you land' });
  assert.deepEqual(visaEntry('citizen'), { label: 'Citizen', step: 'You can live here' });
  assert.deepEqual(visaEntry('banned'), { label: 'Check the rules', step: 'Check the official site' });
  assert.deepEqual(visaEntry(undefined), { label: 'Check the rules', step: 'Check the official site' });
});

test('chanceLine: plain text, a Low chance is a caution (never a negative stamp)', () => {
  assert.deepEqual(chanceLine('Low'), { text: 'Chance: low', caution: true });
  assert.deepEqual(chanceLine('Medium'), { text: 'Chance: medium', caution: false });
  assert.deepEqual(chanceLine('High'), { text: 'Chance: high', caution: false });
  assert.deepEqual(chanceLine('Very High'), { text: 'Chance: very high', caution: false });
  assert.deepEqual(chanceLine(' very  high '), { text: 'Chance: very high', caution: false });
  for (const junk of [null, undefined, '', 'Certain', 'Denied', 0.4, {}, 'constructor']) {
    assert.deepEqual(chanceLine(junk), { text: 'Chance estimate unavailable', caution: false }, String(junk));
  }
});

test('visaRawMrz: V<{to}{purpose}<<{from}<<… and a filler line, both 44 x [A-Z0-9<]', () => {
  const [l1, l2] = visaRawMrz({ fromIso3: 'PAK', toIso3: 'CAN', purpose: 'Study' });
  assert.equal(l1.length, 44);
  assert.equal(l2.length, 44);
  assert.ok(l1.startsWith('V<CANSTUDY<<PAK<<'), l1);
  assert.match(l1, RAW);
  assert.match(l2, RAW);
  // Deterministic: the same visa prints the same lines.
  assert.deepEqual(visaRawMrz({ fromIso3: 'PAK', toIso3: 'CAN', purpose: 'Study' }), [l1, l2]);

  for (const [purpose, code] of [
    ['Work', 'WORK'], ['Study', 'STUDY'], ['Tourist', 'TOUR'], ['Permanent Residency', 'PR'], ['Digital Nomad', 'NOMAD'],
    ['work', 'WORK'], ['permanent residency', 'PR'], ['digital nomad', 'NOMAD'],
  ]) {
    const [line] = visaRawMrz({ fromIso3: 'GBR', toIso3: 'DEU', purpose });
    assert.ok(line.startsWith(`V<DEU${code}<<GBR<<`), `${purpose}: ${line}`);
  }

  const noFrom = visaRawMrz({ fromIso3: undefined, toIso3: 'CAN', purpose: 'Study' });
  assert.ok(noFrom[0].includes('XXX'), noFrom[0]);
  assert.ok(noFrom[0].startsWith('V<CANSTUDY<<XXX<<'), noFrom[0]);
  for (const args of [{}, undefined, { fromIso3: 'pk', toIso3: 'C@N', purpose: 'x'.repeat(300) }, { fromIso3: 7, toIso3: null }]) {
    const lines = visaRawMrz(args);
    assert.equal(lines.length, 2);
    for (const line of lines) assert.match(line, RAW, JSON.stringify(args));
  }
  assert.ok(visaRawMrz({ fromIso3: 'pk', toIso3: 'C@N' })[0].startsWith('V<XXX'), 'junk ISO3 codes read as XXX');
});

test('visaPlainMrz: ✓ + the stamp words, then the next step and the chance, 44 chars each', () => {
  const [l1, l2] = visaPlainMrz({ currentStatus: 'visa-required', probability: 'Medium' });
  assert.equal(l1, '✓ APPLY FIRST'.padEnd(44, ' '));
  assert.equal(l1.length, 44);
  assert.equal(l2.length, 44);
  assert.ok(l2.startsWith('APPLY BEFORE YOU GO · CHANCE: MEDIUM'), l2);

  assert.equal(visaPlainMrz({ currentStatus: 'e-visa', probability: 'High' })[0].trimEnd(), '✓ E-VISA · APPLY ONLINE');
  assert.equal(visaPlainMrz({ currentStatus: 'citizen', probability: 'Low' })[1].trimEnd(), 'YOU CAN LIVE HERE · CHANCE: LOW');
  assert.equal(visaPlainMrz({ currentStatus: 'weird', probability: 'High' })[1].trimEnd(), 'CHECK THE OFFICIAL SITE · CHANCE: HIGH');

  const long = visaPlainMrz({ currentStatus: 'x'.repeat(300), probability: 'y'.repeat(300) });
  assert.equal(long[0].length, 44);
  assert.equal(long[1].length, 44);
  assert.equal(long[0].trimEnd(), '✓ CHECK');
});

test('visaPlainMrz: the chance is left off rather than cut mid-word when it does not fit', () => {
  const steps = {
    'visa-free': 'NO VISA NEEDED FOR SHORT STAYS',
    'e-visa': 'APPLY ONLINE BEFORE YOU GO',
    'visa-on-arrival': 'GET IT WHEN YOU LAND',
    'visa-required': 'APPLY BEFORE YOU GO',
    citizen: 'YOU CAN LIVE HERE',
    unknown: 'CHECK THE OFFICIAL SITE',
  };
  for (const [status, step] of Object.entries(steps)) {
    for (const probability of ['Low', 'Medium', 'High', 'Very High', null, undefined, 'junk']) {
      const [l1, l2] = visaPlainMrz({ currentStatus: status, probability });
      assert.equal(l1.length, 44);
      assert.equal(l2.length, 44);
      const chance = chanceLine(probability).text.toUpperCase();
      const full = `${step} · ${chance}`;
      assert.equal(l2.trimEnd(), full.length <= 44 ? full : step, `${status} / ${probability}`);
    }
  }
  // A missing or failed estimate never fits, so the line is just the next step.
  assert.equal(visaPlainMrz({ currentStatus: 'visa-required' })[1].trimEnd(), 'APPLY BEFORE YOU GO');
});

test('leadVisa: the first visa type for the card header, with fallbacks for partial AI JSON', () => {
  const report = {
    visaTypes: [
      { name: 'Study Permit', processingTime: '4-8 weeks', cost: '≈ USD 150' },
      { name: 'Visitor Visa', processingTime: '2 weeks', cost: '$100' },
    ],
  };
  assert.deepEqual(leadVisa(report), { name: 'Study Permit', processing: '4-8 weeks', fee: '≈ USD 150' });
  assert.deepEqual(leadVisa({ visaTypes: [{ name: '  Work Permit ', processingTime: '', cost: null }] }), {
    name: 'Work Permit', processing: '', fee: '',
  });
  const fallback = { name: 'Visa options below', processing: '', fee: '' };
  for (const partial of [null, undefined, {}, { visaTypes: [] }, { visaTypes: 'Study' }, { visaTypes: [null] },
    { visaTypes: ['Study'] }, { visaTypes: [{ name: 42 }] }, { visaTypes: [{ name: '' }] }]) {
    assert.deepEqual(leadVisa(partial), fallback, JSON.stringify(partial));
  }
});

test('docsKey: the checklist is saved per route and purpose', () => {
  assert.equal(docsKey({ from: 'pk', to: 'ca', purpose: 'Study' }), 'migrova_check:visa:pk:ca:study');
  assert.equal(docsKey({ from: 'pk', to: 'ca', purpose: 'permanent residency' }), 'migrova_check:visa:pk:ca:permanent-residency');
});

test('docsKey with items: a different document list never inherits another list\'s ticks', () => {
  const items = ['Valid passport (original)', 'Letter of acceptance', 'Proof of funds'];
  const key = docsKey({ from: 'pk', to: 'ca', purpose: 'Study', items });
  assert.match(key, /^migrova_check:visa:pk:ca:study:[a-z0-9]+$/);
  assert.equal(docsKey({ from: 'pk', to: 'ca', purpose: 'Study', items: [...items] }), key, 'same list, same key');
  assert.notEqual(docsKey({ from: 'pk', to: 'ca', purpose: 'Study', items: [items[1], items[0], items[2]] }), key, 'reordered');
  assert.notEqual(docsKey({ from: 'pk', to: 'ca', purpose: 'Study', items: [...items, 'Photos'] }), key, 'longer');
  assert.notEqual(docsKey({ from: 'pk', to: 'ca', purpose: 'Study', items: ['Valid passport', ...items.slice(1)] }), key, 'renamed');
  assert.notEqual(docsKey({ from: 'pk', to: 'gb', purpose: 'Study', items }), key, 'other route');
});

test('checklistItems: one label per document, as the report lists them', () => {
  assert.deepEqual(
    checklistItems([
      { document: 'Valid passport', format: 'original', notes: 'Valid for 6 months' },
      { document: 'Bank statements', format: 'certified copy' },
      { document: ' Photos ', notes: '' },
      'Police certificate',
      { format: 'original' },
      null,
      42,
      { document: { name: 'x' } },
    ]),
    [
      'Valid passport (original) — Valid for 6 months',
      'Bank statements (certified copy)',
      'Photos',
      'Police certificate',
    ],
  );
  for (const junk of [undefined, null, 'passport', {}, 3]) assert.deepEqual(checklistItems(junk), []);
});

test('visaSubmitStep: the form is checked before the legal notice opens', () => {
  const filled = { nationality: 'pk', targetCountry: 'ca' };
  // A first visit (no legal-ack yet) with an empty or half-filled form gets the message, not the notice.
  for (const fields of [{ nationality: '', targetCountry: '' }, { nationality: 'pk', targetCountry: '' }, { nationality: '', targetCountry: 'ca' }]) {
    assert.equal(visaSubmitStep({ loading: false, acked: false, ...fields }), 'missing', JSON.stringify(fields));
    assert.equal(visaSubmitStep({ loading: false, acked: true, ...fields }), 'missing', JSON.stringify(fields));
  }
  assert.equal(visaSubmitStep({ loading: false, acked: false, ...filled }), 'ack', 'a complete form opens the notice once');
  assert.equal(visaSubmitStep({ loading: false, acked: true, ...filled }), 'search');
  // A submit while a search is loading does nothing at all.
  assert.equal(visaSubmitStep({ loading: true, acked: false, nationality: '', targetCountry: '' }), 'busy');
  assert.equal(visaSubmitStep({ loading: true, acked: true, ...filled }), 'busy');
  assert.equal(MISSING_FIELDS, 'Please select both your nationality and destination country.');
});
