// The MRZ-style line under a tool page's headline (ToolHeader): the page's code letter and the
// route saved on this device. Pure and framework-free (scripts/kit/__tests__/foundation.test.mjs).
import { countryByCode } from '../../data/countries195.js';
import { MRZ_LEN } from './mrz.js';

// One country code (e.g. 'pk') as its ISO3 code; anything else ('any', junk, unset) -> 'XXX'.
const iso3 = (code) => (typeof code === 'string' && countryByCode(code)?.iso3) || 'XXX';

/**
 * `${letter}<MGV<<${from}<<${to}<<`, padded with '<' to exactly 44 characters ([A-Z0-9<] only).
 * `letter` is the page code's letter before the dash ('V-VISA' -> 'V', 'L-COUNSEL' -> 'L'; '<'
 * when it is not a letter or digit); `route` is { from, to } country codes (null / missing ->
 * 'XXX'), e.g. heroMrz('V-VISA', { from: 'pk', to: 'ca' }) -> 'V<MGV<<PAK<<CAN<<<<…'.
 */
export function heroMrz(code, route) {
  const first = String(code ?? '').charAt(0).toUpperCase();
  const letter = /^[A-Z0-9]$/.test(first) ? first : '<';
  const { from, to } = route && typeof route === 'object' ? route : {};
  return `${letter}<MGV<<${iso3(from)}<<${iso3(to)}<<`.slice(0, MRZ_LEN).padEnd(MRZ_LEN, '<');
}
