/**
 * window.localStorage, or null on the server and when the browser blocks it (Safari private
 * mode, storage policies), where even reading the property throws. Same semantics as the
 * homepage's passport/useSavedRoute deviceStorage(); the kit keeps its own copy because it may
 * not import the homepage passport code.
 */
export function deviceStorage() {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}
