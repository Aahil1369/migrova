import Navbar from './components/Navbar';
import PassportStage, { SkipToTools } from './components/passport/PassportStage';
import { countVerifiedLinks, verifiedAuthorities } from './components/passport/sourcesSummary';
import { clampStory } from './components/passport/pages/storyText';
import { OFFICIAL_SOURCES } from './data/officialSources';
import { FOUNDER_NOTE } from './lib/pageCopy';
import { supabase, hasSupabase } from '../lib/supabase';

// Server-only: the full Official Sources table never reaches the browser; the page gets the
// verified-link count and the verified immigration-authority links (for the real-site card).
const VERIFIED_COUNT = countVerifiedLinks(OFFICIAL_SOURCES);
const AUTHORITIES = verifiedAuthorities(OFFICIAL_SOURCES);

export const revalidate = 600;

export const metadata = {
  title: "Migrova — your family's next country, made simple",
  description: `Free · 195 countries · ${VERIFIED_COUNT} verified official links · information, not legal advice`,
};

// Up to two approved stories for the "Fellow travellers" page; any failure -> none (invite page).
async function getStories() {
  if (!hasSupabase || !supabase) return [];
  try {
    const { data, error } = await supabase
      .from('user_stories')
      .select('id, from_country, current_country, story_text')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(2);
    if (error || !Array.isArray(data)) return [];
    return data.map((s) => ({
      id: s.id,
      from_country: s.from_country ?? '',
      current_country: s.current_country ?? '',
      story_text: clampStory(s.story_text), // only the margin note ships to the page
    }));
  } catch {
    return [];
  }
}

export default async function Home() {
  const stories = await getStories();
  return (
    <div className="relative bg-night-0">
      <SkipToTools />
      <Navbar tone="night" />
      <main>
        <PassportStage
          stories={stories}
          verifiedCount={VERIFIED_COUNT}
          authorities={AUTHORITIES}
          note={FOUNDER_NOTE}
        />
      </main>
    </div>
  );
}
