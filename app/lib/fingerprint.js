// A short, stable fingerprint of a string: FNV-1a as 7 base-36 characters [0-9A-Z]. The same in
// every browser and run; not a security hash. Used for the visa MRZ's document number and for the
// list fingerprint in checklist keys (ticks are saved by position, so another list needs another key).

/** fingerprint('PAK<<CAN') -> e.g. '0Q3ZK1B'. */
export function fingerprint(value) {
  const text = String(value ?? '');
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36).toUpperCase().padStart(7, '0');
}
