// Stale-request guard: take an id per request with next(), and before using a response check
// isCurrent(id). Every next() makes the earlier ids stale, so the newest request always wins
// (a double submit, a second chip tapped before the first answer arrived). Pure; one guard per page.

/** A new guard: { next() -> id, isCurrent(id) -> boolean }. */
export function createLatest() {
  let latest = 0;
  return {
    next() {
      latest += 1;
      return latest;
    },
    isCurrent(id) {
      return latest > 0 && id === latest;
    },
  };
}
