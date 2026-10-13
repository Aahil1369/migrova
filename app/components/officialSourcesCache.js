// This tab's cache of /api/sources/<code> payloads (one country's official links, about 1 KB
// each), shared by OfficialSourcesBlock and the pages that prefetch it when a search starts.
// Framework-free (unit-tested in scripts/site/__tests__/officialSourcesCache.test.mjs).

const loaded = new Map();
const inFlight = new Map();

/** The payload already fetched for `code` in this tab, or null. */
export function cachedSources(code) {
  return (code && loaded.get(code)) || null;
}

/**
 * Fetch one country's official links (/api/sources/<code>) into this tab's cache, once; resolves
 * with the payload, or null for an unknown country or a failed request (not cached, so a later
 * call tries again). Pages call it when a search starts, so the block below the AI result is
 * ready when the result renders instead of popping in (and pushing the report down) after it.
 */
export function prefetchSources(code) {
  if (!code) return Promise.resolve(null);
  if (loaded.has(code)) return Promise.resolve(loaded.get(code));
  if (!inFlight.has(code)) {
    const request = fetch(`/api/sources/${encodeURIComponent(code)}`)
      .then((res) => (res.ok ? res.json() : null))
      .catch(() => null)
      .then((payload) => {
        inFlight.delete(code);
        if (payload) loaded.set(code, payload);
        return payload;
      });
    inFlight.set(code, request);
  }
  return inFlight.get(code);
}

/**
 * A useEffect body: calls `onPayload(payload)` once `code`'s links are in (null when they cannot
 * be fetched) and returns the cleanup that cancels it. It always waits on prefetchSources, even
 * when the payload is already cached: a prefetch started with the search can land between the
 * render that found the cache empty and this effect, and skipping the call then would leave the
 * block hidden until some unrelated re-render.
 */
export function watchSources(code, onPayload) {
  if (!code) return () => {};
  let live = true;
  prefetchSources(code).then((payload) => {
    if (live) onPayload(payload);
  });
  return () => {
    live = false;
  };
}
