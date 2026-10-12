import { createClient } from '../../../lib/supabase-server.js';
import { supabase, hasSupabase } from '../../../lib/supabase.js';

export async function GET() {
  if (!hasSupabase) return Response.json({ profile: null });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ profile: null });

  const { data } = await supabase
    .from('user_profiles')
    .select('profile_data')
    .eq('user_id', user.id)
    .single();

  return Response.json({ profile: data?.profile_data || null });
}

export async function POST(request) {
  if (!hasSupabase) return Response.json({ error: 'Database unavailable' }, { status: 503 });

  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return Response.json({ error: 'Not authenticated' }, { status: 401 });

  // { profile } is the shape every caller sends; profile_data is accepted too (older Navbar builds).
  const body = await request.json();
  const profile = body.profile ?? body.profile_data;

  await supabase
    .from('user_profiles')
    .upsert({ user_id: user.id, profile_data: profile, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });

  return Response.json({ ok: true });
}
