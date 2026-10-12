'use client';

import { useCallback, useState, useSyncExternalStore } from 'react';

const noop = () => {};
const hasObserver = () => typeof IntersectionObserver === 'function';

/**
 * Whether the element in `ref` is on screen. `once` (default): turns true the first time the
 * element scrolls into view and stays true (start a signature moment once). `once: false`:
 * follows the element in and out (pause an ambient loop while it is off screen). The default
 * `rootMargin` waits until the element is 10% of the viewport above the bottom edge.
 * False on the server and during hydration; true at once where IntersectionObserver is missing.
 * The ref must point at an element rendered by the same component (it is read once, on mount).
 */
export function useInView(ref, { once = true, rootMargin = '0px 0px -10% 0px' } = {}) {
  // Per-instance store the observer writes and React reads (useSyncExternalStore).
  const [store] = useState(() => ({ inView: false }));

  const subscribe = useCallback(
    (onChange) => {
      const el = ref.current;
      if (!el || !hasObserver() || (once && store.inView)) return noop;
      const io = new IntersectionObserver(
        (entries) => {
          const visible = entries[entries.length - 1].isIntersecting;
          if (visible === store.inView) return;
          store.inView = visible;
          if (visible && once) io.disconnect();
          onChange();
        },
        { rootMargin },
      );
      io.observe(el);
      return () => io.disconnect();
    },
    [ref, store, once, rootMargin],
  );

  return useSyncExternalStore(
    subscribe,
    () => store.inView || !hasObserver(),
    () => false,
  );
}

export default useInView;
