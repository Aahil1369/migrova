import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STAMP_INKS, DEFAULT_STAMP_INK, PAGE_PAPER, contrastRatio,
} from '../../../app/components/passport/parts/stampInks.js';

test('contrastRatio matches known WCAG values', () => {
  assert.equal(contrastRatio('#000000', '#ffffff'), 21);
  assert.equal(contrastRatio('#777777', '#777777'), 1);
  assert.ok(Math.abs(contrastRatio('#2f8a5a', PAGE_PAPER) - 4.04) < 0.01, 'old default ink failed');
});

test('every stamp ink is >= 4.5:1 on passport paper', () => {
  assert.equal(PAGE_PAPER, '#fbf8f2');
  for (const [name, hex] of Object.entries(STAMP_INKS)) {
    const ratio = contrastRatio(hex, PAGE_PAPER);
    assert.ok(ratio >= 4.5, `${name} ${hex} is ${ratio.toFixed(2)}:1`);
  }
  assert.ok(Object.values(STAMP_INKS).includes(DEFAULT_STAMP_INK));
});
