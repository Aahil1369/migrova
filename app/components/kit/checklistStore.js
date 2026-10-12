// Tickable checklists saved on this device (ChecklistPage). Pure and framework-free; storage is
// injected (window.localStorage in the page, a fake in tests), so a blocked or throwing storage
// (Safari private mode, cookies off) never crashes the page: reads come back empty, writes false.
// A list is saved as a JSON array of the ticked item indexes, e.g. "[0,2]".

const PREFIX = 'migrova_check:';
const PART_MAX = 40;

// 'Permanent Residency' -> 'permanent-residency': lowercase, every run of other characters one
// dash, no dash at either end, at most 40 characters.
function slug(part) {
  return String(part ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, PART_MAX)
    .replace(/-+$/, '');
}

/** The storage key of one checklist: checklistKey(['visa', 'pk', 'ca', 'Study']) -> 'migrova_check:visa:pk:ca:study'. */
export function checklistKey(parts) {
  return PREFIX + (Array.isArray(parts) ? parts : [parts]).map(slug).join(':');
}

// Sorted, unique, whole non-negative numbers; anything else is dropped.
function normalize(indexes) {
  if (!Array.isArray(indexes)) return [];
  const valid = indexes.filter((n) => Number.isInteger(n) && n >= 0);
  return [...new Set(valid)].sort((a, b) => a - b);
}

/** The ticked indexes saved under `key` (sorted, unique); [] when nothing is saved, the value is junk, or storage is missing or throws. */
export function readChecklist(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw === null || raw === undefined) return [];
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

/** Save the ticked indexes under `key`. Returns false (and never throws) when storage is missing or refuses the write. */
export function writeChecklist(storage, key, checked) {
  try {
    storage.setItem(key, JSON.stringify(normalize(checked)));
    return true;
  } catch {
    return false;
  }
}

/** { done, total, complete } for a list of `total` items: only ticked indexes below `total` count, each once. */
export function checklistProgress(total, checked) {
  const done = normalize(checked).filter((n) => n < total).length;
  return { done, total, complete: total > 0 && done === total };
}
