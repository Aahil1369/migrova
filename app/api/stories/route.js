import { createClient } from '../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../lib/supabase.js';

// Admin identity lives in an env var (falls back to the known owner email).
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'aahilakbar567@gmail.com';

const clamp = (v, n) => String(v ?? '').trim().slice(0, n);

export async function GET(request) {
  if (!hasSupabase) return Response.json({ stories: [] });

  const { searchParams } = new URL(request.url);
  const all = searchParams.get('all') === 'true';

  // Admin "view all" path: use the cookie-aware client so the request carries
  // the admin's JWT. RLS (not just this code) decides what's visible.
  if (all) {
    const db = await createClient();
    const { data: { user } } = await db.auth.getUser();
    if (user?.email === ADMIN_EMAIL) {
      const { data } = await db
        .from('user_stories')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      return Response.json({ stories: data || [] });
    }
  }

  // Public path: anon client, approved-only. RLS also enforces approved-only.
  const { data } = await supabase
    .from('user_stories')
    .select('*')
    .eq('approved', true)
    .order('created_at', { ascending: false })
    .limit(50);
  return Response.json({ stories: data || [] });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return Response.json({ error: 'Sign in to share your story' }, { status: 401 });

  const body = await request.json();
  const from_country = clamp(body.from_country, 80);
  const current_country = clamp(body.current_country, 80);
  const story_text = clamp(body.story_text, 5000);
  let rating = Number(body.rating);
  rating = Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : null;

  if (!from_country || !current_country || !story_text) {
    return Response.json({ error: 'All fields required' }, { status: 400 });
  }

  // Insert via the authenticated client so RLS check (auth.uid() = user_id) passes.
  const { error } = await db.from('user_stories').insert({
    user_id: user.id,
    from_country,
    current_country,
    story_text,
    rating,
  });

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}

export async function PATCH(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const db = await createClient();
  const { data: { user } } = await db.auth.getUser();
  if (user?.email !== ADMIN_EMAIL) {
    return Response.json({ error: 'Not authorized' }, { status: 403 });
  }

  const { id, approved } = await request.json();
  // Update via authenticated client; RLS update policy requires admin JWT email.
  const { error } = await db.from('user_stories').update({ approved: !!approved }).eq('id', id);

  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true });
}
