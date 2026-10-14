// The tickable checklists (visa documents, relocation "before you move", ...) are saved on the
// device per key. Storage is injected, so a blocked or broken localStorage (Safari private mode,
// cookies off, junk left by an older version) never throws: the list just starts empty.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const { checklistKey, readChecklist, writeChecklist, checklistProgress, packedStamp } = await import(
  new URL('../../../app/components/kit/checklistStore.js', import.meta.url)
);

// An in-memory Storage with the two methods the store uses.
function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    raw: data,
  };
}

const throwing = {
  getItem() {
    throw new Error('blocked');
  },
  setItem() {
    throw new Error('blocked');
  },
};

test('checklistKey: migrova_check: + one slug per part', () => {
  assert.equal(checklistKey(['pk', 'ca', 'Study']), 'migrova_check:pk:ca:study');
  assert.equal(checklistKey(['visa', 'pk', 'ca', 'Permanent Residency']), 'migrova_check:visa:pk:ca:permanent-residency');
  // lowercase, every run of other characters becomes one dash, no dash at either end
  assert.equal(checklistKey(['  Toronto, Canada!! ']), 'migrova_check:toronto-canada');
  assert.equal(checklistKey(['relocate-week1', 'Toronto']), 'migrova_check:relocate-week1:toronto');
  // at most 40 characters per part, still without a trailing dash after the cut
  const long = checklistKey(['x'.repeat(39) + ' tail', 'a'.repeat(80)]);
  const [, first, second] = long.split(':');
  assert.equal(first, 'x'.repeat(39));
  assert.equal(second, 'a'.repeat(40));
  // missing parts are empty, never "undefined" / "null"
  assert.equal(checklistKey(['visa', undefined, null, 'ca']), 'migrova_check:visa:::ca');
});

test('writeChecklist / readChecklist: round trip as sorted unique indexes', () => {
  const storage = memoryStorage();
  const key = checklistKey(['pk', 'ca', 'study']);
  assert.equal(writeChecklist(storage, key, [2, 0, 2]), true);
  assert.deepEqual(readChecklist(storage, key), [0, 2]);
  assert.equal(storage.raw.get(key), '[0,2]');
  // nothing saved under another key
  assert.deepEqual(readChecklist(storage, checklistKey(['pk', 'ca', 'work'])), []);
  // unticking everything saves an empty list
  assert.equal(writeChecklist(storage, key, []), true);
  assert.deepEqual(readChecklist(storage, key), []);
});

test('readChecklist: [] for junk JSON, a non-array, or missing storage; junk entries dropped', () => {
  const key = 'migrova_check:pk:ca:study';
  assert.deepEqual(readChecklist({ getItem: () => '{bad' }, key), []);
  assert.deepEqual(readChecklist({ getItem: () => '{"0":true}' }, key), []);
  assert.deepEqual(readChecklist({ getItem: () => 'null' }, key), []);
  assert.deepEqual(readChecklist({ getItem: () => '3' }, key), []);
  assert.deepEqual(readChecklist(null, key), []);
  assert.deepEqual(readChecklist(undefined, key), []);
  // only whole, non-negative numbers are indexes
  assert.deepEqual(readChecklist({ getItem: () => '[3,"1",-1,1.5,null,0,3]' }, key), [0, 3]);
});

test('blocked storage: read gives [], write gives false, neither throws', () => {
  const key = 'migrova_check:pk:ca:study';
  assert.doesNotThrow(() => readChecklist(throwing, key));
  assert.deepEqual(readChecklist(throwing, key), []);
  assert.doesNotThrow(() => writeChecklist(throwing, key, [1]));
  assert.equal(writeChecklist(throwing, key, [1]), false);
  assert.equal(writeChecklist(null, key, [1]), false);
});

test('checklistProgress: done counts ticked items that exist; complete only when all are', () => {
  assert.deepEqual(checklistProgress(3, [0, 1, 2]), { done: 3, total: 3, complete: true });
  assert.deepEqual(checklistProgress(3, [0, 5]), { done: 1, total: 3, complete: false });
  assert.equal(checklistProgress(0, []).complete, false);
  assert.deepEqual(checklistProgress(0, []), { done: 0, total: 0, complete: false });
  // a duplicate or a stale index from a longer list never completes a shorter one
  assert.deepEqual(checklistProgress(2, [1, 1, 7]), { done: 1, total: 2, complete: false });
  assert.deepEqual(checklistProgress(2, [-1, 0, 1]), { done: 2, total: 2, complete: true });
});

test('packedStamp: the stamp lands only for a list completed by a tick here; a restored one rests', () => {
  const key = checklistKey(['visa', 'pk', 'ca', 'study']);
  const other = checklistKey(['visa', 'pk', 'de', 'study']);
  assert.equal(packedStamp(false, null, key), null, 'not complete: no stamp');
  assert.equal(packedStamp(false, key, key), null, 'unticked again: no stamp');
  // Restored already complete from this device (no tick on this page yet): still, and silent.
  assert.equal(packedStamp(true, null, key), 'rest');
  assert.equal(packedStamp(true, undefined, key), 'rest');
  // A tick on this page completed it: the thunk and the announcement.
  assert.equal(packedStamp(true, key, key), 'land');
  // A tick here completed another list (the page now shows a different one): this one rests.
  assert.equal(packedStamp(true, other, key), 'rest');
});
