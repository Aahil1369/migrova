'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createClient } from '../../lib/supabase-browser';
import { NAV_LINKS, TOOL_LINKS } from '../lib/siteLinks';
import AuthModal from './AuthModal';
import ProfileModal from './ProfileModal';
import RoutePill from './RoutePill';
import Wordmark from './Wordmark';

// Colour roles per tone. 'paper' is the cream look used by every tool page;
// 'night' sits over the dark sky on the homepage (solid translucent colour, no blur).
const TONES = {
  paper: {
    header: 'bg-paper-bg border-paper-rule text-paper-ink',
    logo: 'text-paper-ink hover:text-accent',
    nav: 'text-paper-ink-dim',
    navActive: 'text-paper-ink',
    hover: 'hover:text-accent',
    active: 'text-accent',
    bar: 'bg-accent',
    track: 'bg-paper-rule',
    menu: 'bg-paper-bg-alt border-paper-rule',
    menuRule: 'border-paper-rule',
    divider: 'bg-paper-rule',
    item: 'text-paper-ink hover:bg-paper-bg',
    itemMuted: 'text-paper-ink-sub hover:bg-paper-bg',
    strong: 'text-paper-ink',
    sub: 'text-paper-ink-sub',
    signIn: 'border-paper-ink/30 text-paper-ink hover:border-accent hover:text-accent',
    cta: 'bg-paper-ink text-paper-bg hover:bg-[#2a3a2f]',
    avatar: 'bg-paper-ink text-paper-bg',
    burger: 'bg-paper-ink',
    scrim: 'bg-paper-ink/60',
    drawer: 'bg-paper-bg border-paper-rule text-paper-ink',
  },
  night: {
    header: 'bg-[rgba(11,19,15,.72)] border-[color:rgba(236,230,210,.08)] text-[#ece6d2]',
    logo: 'text-[#ece6d2] hover:text-lime',
    nav: 'text-[rgba(236,230,210,.78)]',
    navActive: 'text-[#ece6d2]',
    hover: 'hover:text-lime',
    active: 'text-lime',
    bar: 'bg-lime',
    track: 'bg-[rgba(236,230,210,.1)]',
    menu: 'bg-night-1 border-[color:rgba(236,230,210,.14)]',
    menuRule: 'border-[color:rgba(236,230,210,.1)]',
    divider: 'bg-[rgba(236,230,210,.1)]',
    item: 'text-[#ece6d2] hover:bg-[rgba(236,230,210,.08)]',
    itemMuted: 'text-[rgba(236,230,210,.72)] hover:bg-[rgba(236,230,210,.08)]',
    strong: 'text-[#ece6d2]',
    sub: 'text-[rgba(236,230,210,.62)]',
    signIn: 'border-[color:rgba(236,230,210,.3)] text-[#ece6d2] hover:border-lime hover:text-lime',
    cta: 'bg-lime text-night-1 shadow-[0_0_22px_rgba(184,207,93,.45)] hover:brightness-105',
    avatar: 'bg-[#ece6d2] text-night-0',
    burger: 'bg-[#ece6d2]',
    scrim: 'bg-night-0/70',
    drawer: 'bg-night-1 border-[color:rgba(236,230,210,.12)] text-[#ece6d2]',
  },
};

function UserAvatar({ user, size = 'sm', fallbackClass }) {
  const name = user.user_metadata?.full_name || user.user_metadata?.name || user.email || '?';
  const avatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const initials = name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const sz = size === 'lg' ? 'w-10 h-10 text-[12px]' : 'w-8 h-8 text-[11px]';
  if (avatar) return <img src={avatar} alt={name} className={`${sz} rounded-full object-cover`} />;
  return (
    <div className={`${sz} ${fallbackClass} rounded-full flex items-center justify-center font-mono tracking-[0.05em]`}>
      {initials}
    </div>
  );
}

export default function Navbar({ tone = 'paper' }) {
  const t = TONES[tone] || TONES.paper;
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [profileSetupData, setProfileSetupData] = useState(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [toolsUsed, setToolsUsed] = useState(0);
  const toolsRef = useRef(null);
  const userMenuRef = useRef(null);
  const prevUserRef = useRef(null);
  const supabase = createClient();

  useEffect(() => {
    if (!supabase) return undefined; // storage blocked: stay signed out, never crash the page
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      prevUserRef.current = data.user;
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const newUser = session?.user ?? null;
      const prevUser = prevUserRef.current;
      prevUserRef.current = newUser;
      setUser(newUser);
      if (newUser && !prevUser) {
        try {
          const res = await fetch('/api/user-profile');
          const { profile } = await res.json();
          if (!profile) {
            const name = newUser.user_metadata?.full_name || newUser.user_metadata?.name || '';
            setProfileSetupData({ name, nationality: '', currentCountry: '', experience: '', jobTypes: [], skills: '', preferredCountries: [] });
            setShowProfileSetup(true);
          }
        } catch {}
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) { setToolsUsed(0); return; }
    fetch('/api/tool-usage').then((r) => r.ok ? r.json() : { count: 0 }).then((d) => setToolsUsed(d.count || 0)).catch(() => {});
  }, [user, pathname]);

  useEffect(() => {
    const handler = (e) => {
      if (toolsRef.current && !toolsRef.current.contains(e.target)) setToolsOpen(false);
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const handleSignOut = async () => {
    if (supabase) await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/');
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Account';
  const progressPct = Math.min(100, (toolsUsed / TOOL_LINKS.length) * 100);
  const isToolActive = TOOL_LINKS.some((x) => pathname === x.href);
  // The route saved by tearing the homepage boarding-pass stub (renders nothing until read).
  const routeSlot = <RoutePill tone={tone === 'night' ? 'night' : 'paper'} />;

  return (
    <>
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={() => setShowAuth(false)} />}
      {showProfileSetup && (
        <ProfileModal
          initialProfile={profileSetupData}
          onClose={() => setShowProfileSetup(false)}
          onSave={async (profile, rememberOnDevice) => {
            try {
              await fetch('/api/user-profile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ profile_data: profile }),
              });
            } catch {}
            try {
              if (rememberOnDevice) localStorage.setItem('opportumap_profile', JSON.stringify(profile));
              else localStorage.removeItem('opportumap_profile');
            } catch {
              /* storage blocked: nothing is remembered on this device */
            }
            setShowProfileSetup(false);
          }}
        />
      )}

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className={`absolute inset-0 ${t.scrim}`} onClick={() => setMobileOpen(false)} />
          <div className={`absolute top-0 right-0 h-full w-[280px] max-w-[85vw] border-l flex flex-col ${t.drawer}`}>
            <div className={`flex items-center justify-between px-5 py-4 border-b ${t.menuRule}`}>
              <Wordmark className="text-[22px]" />
              <button onClick={() => setMobileOpen(false)}
                className={`min-h-11 px-2 -mr-2 text-[14px] font-medium ${t.sub} ${t.hover}`}>
                Close
              </button>
            </div>
            <div className={`flex-1 overflow-y-auto px-5 py-4 text-[16px] font-medium ${t.nav}`}>
              {NAV_LINKS.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`block py-2.5 ${pathname === l.href ? t.active : t.hover}`}>{l.label}</Link>
              ))}
              <div className={`pt-5 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${t.sub}`}>Tools</div>
              {TOOL_LINKS.map((l) => (
                <Link key={l.href} href={l.href}
                  className={`block py-2.5 ${pathname === l.href ? t.active : t.hover}`}>{l.label}</Link>
              ))}
              <RoutePill tone={tone === 'night' ? 'night' : 'paper'} variant="drawer" />
            </div>
            <div className={`px-5 py-4 border-t ${t.menuRule}`}>
              {user ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar user={user} size="lg" fallbackClass={t.avatar} />
                    <div className="min-w-0">
                      <p className={`text-[16px] font-semibold leading-tight truncate ${t.strong}`}>{userName}</p>
                      <p className={`text-[12px] truncate ${t.sub}`}>{user.email}</p>
                    </div>
                  </div>
                  <Link href="/profile" className={`block py-1.5 text-[15px] font-medium ${t.nav} ${t.hover}`}>Profile</Link>
                  <button onClick={handleSignOut} className={`block py-1.5 text-[15px] font-medium ${t.sub} ${t.hover}`}>Sign out</button>
                </div>
              ) : (
                <button onClick={() => { setMobileOpen(false); setShowAuth(true); }}
                  className={`w-full rounded-full text-[15px] font-semibold px-[22px] py-3 transition-colors ${t.cta}`}>
                  Sign in
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <header className={`sticky top-0 z-30 border-b ${t.header}`}>
        <div className="max-w-[1280px] mx-auto px-6 sm:px-10 py-3.5 flex items-center justify-between gap-4 min-[400px]:gap-6">
          <Link href="/" className={`transition-colors ${t.logo}`}>
            <Wordmark className="text-[22px]" />
          </Link>

          <nav className={`hidden md:flex items-center gap-8 text-[14px] font-medium ${t.nav}`}>
            {NAV_LINKS.map((l) => (
              <Link key={l.href} href={l.href}
                className={`relative transition-colors ${pathname === l.href ? t.navActive : t.hover}`}>
                {l.label}
                {pathname === l.href && <span className={`absolute -bottom-1.5 left-0 right-0 h-[2px] rounded-full ${t.bar}`} />}
              </Link>
            ))}
            <div className="relative" ref={toolsRef}>
              <button onClick={() => setToolsOpen(!toolsOpen)}
                aria-expanded={toolsOpen} aria-haspopup="true"
                className={`relative inline-flex items-center gap-1 transition-colors ${isToolActive ? t.navActive : t.hover}`}>
                Tools
                <svg aria-hidden="true" viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${toolsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 4.5 6 8l3.5-3.5" />
                </svg>
                {isToolActive && <span className={`absolute -bottom-1.5 left-0 right-0 h-[2px] rounded-full ${t.bar}`} />}
              </button>
              {toolsOpen && (
                <div className={`absolute top-full right-0 mt-4 w-[240px] rounded-2xl border py-2 shadow-[0_14px_40px_rgba(0,0,0,.18)] ${t.menu}`}>
                  {TOOL_LINKS.map((x) => (
                    <Link key={x.href} href={x.href} onClick={() => setToolsOpen(false)}
                      className={`block px-4 py-2 text-[14px] transition-colors ${pathname === x.href ? t.active : t.item}`}>
                      {x.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="flex items-center gap-2 min-[400px]:gap-3 text-[14px] font-medium">
            {routeSlot}
            {user ? (
              <div className="relative hidden md:block" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  aria-expanded={userMenuOpen} aria-haspopup="true"
                  className={`flex items-center gap-2 transition-colors ${t.strong} ${t.hover}`}>
                  <UserAvatar user={user} fallbackClass={t.avatar} />
                  <span className="max-w-[90px] truncate">{userName}</span>
                </button>
                {userMenuOpen && (
                  <div className={`absolute right-0 top-full mt-4 w-[220px] rounded-2xl border shadow-[0_14px_40px_rgba(0,0,0,.18)] ${t.menu}`}>
                    <div className={`px-4 py-3 border-b ${t.menuRule}`}>
                      <p className={`text-[14px] font-semibold leading-tight truncate ${t.strong}`}>{userName}</p>
                      <p className={`text-[12px] truncate mt-1 font-normal ${t.sub}`}>{user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link href="/profile" onClick={() => setUserMenuOpen(false)} className={`block px-4 py-2 text-[14px] ${t.item}`}>Profile</Link>
                      <div className={`my-1 h-px ${t.divider}`} />
                      <button onClick={handleSignOut} className={`block w-full text-left px-4 py-2 text-[14px] ${t.itemMuted}`}>Sign out</button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => setShowAuth(true)}
                className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-1.5 text-[14px] font-medium transition-colors ${t.signIn}`}>
                Sign in
              </button>
            )}
            <button onClick={() => setMobileOpen(true)} aria-label="Open menu"
              className="md:hidden -mr-2 w-11 h-11 flex flex-col items-center justify-center gap-[5px]">
              <span className={`block w-5 h-[2px] rounded-full ${t.burger}`} />
              <span className={`block w-5 h-[2px] rounded-full ${t.burger}`} />
              <span className={`block w-5 h-[2px] rounded-full ${t.burger}`} />
            </button>
          </div>
        </div>

        {user && toolsUsed > 0 && (
          <div className={`h-[2px] ${t.track}`}>
            <div className={`h-full transition-all duration-300 ${t.bar}`} style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </header>
    </>
  );
}
