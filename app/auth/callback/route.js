import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  // The provider (or Supabase) can bounce back with an error instead of a code —
  // surface it rather than silently landing on the homepage, which is
  // indistinguishable from "nothing happened".
  const providerError = searchParams.get('error_description') || searchParams.get('error');
  if (providerError) {
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(providerError)}`);
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
    return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/?auth_error=${encodeURIComponent('No sign-in code was returned. Check that this app\'s callback URL is allowlisted in Supabase.')}`);
}
