import { createBrowserClient } from '@supabase/ssr';

/**
 * The browser Supabase client, or null when it can't be built: with site storage / cookies
 * blocked, merely reading window.sessionStorage throws a SecurityError, and the realtime socket
 * reads it in its constructor. Sign-in can't work there anyway, so callers treat null as
 * "signed out, auth unavailable" instead of crashing every page (the Navbar builds it).
 */
export function createClient() {
  try {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    );
  } catch {
    return null;
  }
}

export const AUTH_UNAVAILABLE =
  'Sign-in needs cookies and site storage, which this browser is blocking for Migrova. Allow them and try again.';
