import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activePages, padShown } from '../../../app/components/passport/activePages.js';
import { initialRoute, exploreHref, countryParam } from '../../../app/components/passport/search.js';
import { countVerifiedLinks, verifiedAuthorities } from '../../../app/components/passport/sourcesSummary.js';
import { buildTimeline, progressForPage, PAGES } from '../../../app/components/passport/timeline.js';
import { desktopPose, notepadPose } from '../../../app/components/passport/pose.js';

const sorted = (set) => [...set].sort();

// ---- activePages ---------------------------------------------------------------------------

test('activePages spread: closed book shows only the cover', () => {
  assert.deepEqual(sorted(activePages('spread', { leaves: [0, 0, 0, 0] })), ['cover']);
});

test('activePages spread: open spreads show their two pages', () => {
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, 0, 0, 0] })), ['data', 'notice']);
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, -180, 0, 0] })), ['visas1', 'visas2']);
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, -180, -180, 0] })), ['entries', 'sources']);
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, -180, -180, -180] })), ['observations', 'travellers']);
});

test('activePages spread: a turning leaf shows the side facing the viewer (switches at -90deg)', () => {
  // ...and both stacks stay showing until covered: notice (left) and visas2 (revealed on the right).
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, -60, 0, 0] })), ['data', 'notice', 'visas2']);
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, -120, 0, 0] })), ['notice', 'visas1', 'visas2']);
  // Entries stays showing under the last leaf until it lands; observations shows as soon as it lifts.
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, -180, -180, -90] })), ['entries', 'observations', 'travellers']);
  // Closing fan: leaf 3 on its way back.
  assert.deepEqual(sorted(activePages('spread', { leaves: [-180, -180, -180, -40] })), ['entries', 'observations', 'sources']);
});

test('activePages spread: the cover lifting reveals the data page', () => {
  assert.deepEqual(sorted(activePages('spread', { leaves: [-20, 0, 0, 0] })), ['cover', 'data']);
  assert.deepEqual(sorted(activePages('spread', { leaves: [-150, 0, 0, 0] })), ['data', 'notice']);
});

test('activePages notepad/lite: the showing page; the one underneath joins as it lifts, then takes over', () => {
  assert.deepEqual(sorted(activePages('notepad', { page: 2, flip: 0 })), ['data']);
  assert.deepEqual(sorted(activePages('notepad', { page: 2, flip: 0.3 })), ['data', 'visas1']);
  assert.deepEqual(sorted(activePages('lite', { page: 2, flip: 0.5 })), ['visas1']);
  assert.deepEqual(sorted(activePages('notepad', { page: 8, flip: 0.8 })), ['cover']);
});

test('activePages: progressForPage lands each page in the active set (spread and notepad)', () => {
  const t = buildTimeline();
  for (const page of PAGES) {
    const p = progressForPage(t, page);
    assert.ok(activePages('spread', desktopPose(t, p)).has(page), `spread ${page} @ ${p}`);
    assert.ok(activePages('notepad', notepadPose(t, p)).has(page), `notepad ${page} @ ${p}`);
  }
});

test('activePages: unknown layouts and missing poses never throw', () => {
  assert.deepEqual(sorted(activePages('stack', {})), [...PAGES].sort());
  assert.deepEqual(sorted(activePages('spread', null)), ['cover']);
  assert.deepEqual(sorted(activePages('notepad', undefined)), ['cover']);
});

test('padShown: the one-page book is hidden behind the hero and the finale, shown in between', () => {
  const t = buildTimeline();
  assert.equal(padShown(notepadPose(t, 0)), 0, 'hero showing');
  assert.ok(padShown(notepadPose(t, 0.06)) < 0.5, 'hero still mostly showing');
  assert.ok(padShown(notepadPose(t, 0.98)) < 0.5, 'finale showing');
  assert.equal(padShown(notepadPose(t, 1)), 0, 'finale fully in');
  for (const page of PAGES.filter((id) => id !== 'cover')) {
    assert.equal(padShown(notepadPose(t, progressForPage(t, page))), 1, page);
  }
  assert.equal(padShown(notepadPose(t, t.ranges.open[0])), 1, 'cover target (start of open)');
  assert.equal(padShown(null), 1);
  assert.equal(padShown({ heroOpacity: NaN, finaleOpacity: 2 }), 0);
});

// ---- search: initial route, Explore href, ?from= ----------------------------------------------

function fakeStorage(data = {}) {
  return { getItem: (k) => (k in data ? data[k] : null) };
}
const throwing = { getItem: () => { throw new Error('SecurityError'); } };

test('initialRoute: saved route wins', () => {
  const s = fakeStorage({
    migrova_route: JSON.stringify({ from: 'pk', to: 'ca', savedAt: 1 }),
    opportumap_profile: JSON.stringify({ nationality: 'in' }),
  });
  assert.deepEqual(initialRoute(s), { from: 'pk', to: 'ca' });
});

test('initialRoute: profile nationality fills an empty From', () => {
  assert.deepEqual(initialRoute(fakeStorage({ opportumap_profile: JSON.stringify({ nationality: 'NG' }) })), { from: 'ng', to: null });
  const s = fakeStorage({
    migrova_route: JSON.stringify({ from: null, to: 'any' }),
    opportumap_profile: JSON.stringify({ nationality: 'ng' }),
  });
  assert.deepEqual(initialRoute(s), { from: 'ng', to: 'any' });
});

test('initialRoute: nothing saved, junk, invalid codes or throwing storage -> empty', () => {
  const empty = { from: null, to: null };
  assert.deepEqual(initialRoute(fakeStorage()), empty);
  assert.deepEqual(initialRoute(fakeStorage({ opportumap_profile: '{not json' })), empty);
  assert.deepEqual(initialRoute(fakeStorage({ opportumap_profile: JSON.stringify({ nationality: 'other' }) })), empty);
  assert.deepEqual(initialRoute(throwing), empty);
  assert.deepEqual(initialRoute(null), empty);
});

test('exploreHref: Anywhere / no destination -> /match; else /visa with from + to', () => {
  assert.equal(exploreHref({ from: 'pk', to: 'any' }), '/match');
  assert.equal(exploreHref({ from: 'pk', to: null }), '/match');
  assert.equal(exploreHref({}), '/match');
  assert.equal(exploreHref({ from: 'pk', to: 'ca' }), '/visa?from=pk&to=ca');
  assert.equal(exploreHref({ from: null, to: 'ca' }), '/visa?to=ca');
  assert.equal(exploreHref({ from: 'zz', to: 'CA' }), '/visa?to=ca');
});

test('countryParam: valid code -> lower-case code, else null', () => {
  assert.equal(countryParam('PK'), 'pk');
  assert.equal(countryParam('ca'), 'ca');
  assert.equal(countryParam('xx'), null);
  assert.equal(countryParam(''), null);
  assert.equal(countryParam(null), null);
  assert.equal(countryParam('other'), null);
});

// ---- Official Sources summary ---------------------------------------------------------------

const SOURCES = {
  ca: {
    links: {
      authority: { status: 'verified', name: 'IRCC', url: 'https://www.canada.ca/en/ircc.html' },
      apply: { status: 'verified', name: 'Apply', url: 'https://www.canada.ca/apply' },
      work: { status: 'not_verified' },
    },
  },
  dz: { links: { authority: { status: 'not_verified' }, apply: { status: 'not_applicable' } } },
  gb: { links: { authority: { status: 'verified', name: 'UKVI', url: 'https://www.gov.uk/ukvi' } } },
};

test('countVerifiedLinks: counts every verified link across countries', () => {
  assert.equal(countVerifiedLinks(SOURCES), 3);
  assert.equal(countVerifiedLinks({}), 0);
  assert.equal(countVerifiedLinks(null), 0);
});

test('verifiedAuthorities: verified authority links only, with the bare domain', () => {
  assert.deepEqual(verifiedAuthorities(SOURCES), {
    ca: { name: 'IRCC', url: 'https://www.canada.ca/en/ircc.html', domain: 'canada.ca' },
    gb: { name: 'UKVI', url: 'https://www.gov.uk/ukvi', domain: 'gov.uk' },
  });
});
