'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '../components/Navbar';
import Btn from '../components/ui/Btn';
import Footnote from '../components/ui/Footnote';
import { FOOTNOTES } from '../lib/pageCopy';
import { createClient } from '../../lib/supabase-browser';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) { router.push('/'); return; }
      setUser(data.user);
      try {
        const res = await fetch('/api/user-profile');
        const d = await res.json();
        if (d.profile) setProfile(d.profile);
      } catch {}
      setLoading(false);
    });
  }, [router]);

  if (loading) return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <div className="py-32 text-center font-mono text-[11px] tracking-[0.12em] text-paper-ink-sub">LOADING…</div>
    </div>
  );

  const name = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'You';
  const rows = [
    ['EMAIL', user?.email],
    ['NATIONALITY', profile?.nationality],
    ['CURRENT COUNTRY', profile?.currentCountry],
    ['INTERESTED IN', Array.isArray(profile?.jobTypes) ? profile.jobTypes.join(', ') : profile?.jobTypes],
    ['TARGET COUNTRIES', Array.isArray(profile?.preferredCountries) ? profile.preferredCountries.join(', ') : profile?.preferredCountries],
  ].filter(([, v]) => v);

  return (
    <div className="min-h-screen bg-paper-bg text-paper-ink">
      <Navbar />
      <section className="max-w-[1280px] mx-auto px-6 sm:px-10 py-12">
        <div className="font-mono text-[11px] tracking-[0.18em] uppercase text-paper-ink-sub mb-4 flex items-center gap-3">
          <span className="inline-block w-7 h-px bg-paper-ink-sub" /><span>§ PROFILE</span>
        </div>
        <h1 className="font-display text-[40px] sm:text-[56px] leading-[1.0] tracking-[-0.02em] text-paper-ink">{name}.</h1>
      </section>
      <main className="max-w-[1280px] mx-auto px-6 sm:px-10 pb-24 border-t border-paper-rule">
        <div className="py-12 max-w-[640px]">
          <div className="border border-paper-rule">
            {rows.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-6 px-5 py-4 border-b border-paper-rule last:border-b-0">
                <span className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub pt-1">{k}</span>
                <span className="text-[14px] text-paper-ink text-right">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-[13px] text-paper-ink-dim mt-6 leading-[1.55]">
            Edit your profile from the avatar menu in the top-right. Your profile powers Country Match and Visa Intelligence.
          </p>
          <div className="mt-8 flex gap-3">
            <Btn variant="primary" href="/match">Run Country Match →</Btn>
            <Btn variant="ghost" href="/visa">Check a visa</Btn>
          </div>
          <Footnote>{FOOTNOTES.profile}</Footnote>
        </div>
      </main>
    </div>
  );
}
