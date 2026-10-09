import Link from 'next/link';
import Stamp from '../parts/Stamp';
import { STAMP_INKS } from '../parts/stampInks';
import { clampStory } from './storyText';
import './pages.css';

const place = (value) => String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, 32) || 'Somewhere';

/**
 * p7, fellow travellers: up to two approved stories as EXIT / ENTRY stamp pairs with the quote
 * as a margin note (clamped to 220 characters). No stories -> an invite to share one.
 * `stories`: [{ id, from_country, current_country, story_text }] (fetched on the server).
 */
export default function Travellers({ active = false, stories = [] }) {
  const list = (Array.isArray(stories) ? stories : []).filter((s) => s && clampStory(s.story_text)).slice(0, 2);

  if (!list.length) {
    return (
      <section id="travellers" aria-labelledby="travellers-h" tabIndex={-1} className="jbp jbp-travellers">
        <h2 id="travellers-h" className="jbp-title">Your story could be the next stamp</h2>
        <span className="jbp-blank-stamp" aria-hidden="true">
          <span>ENTRY</span>
          <b>YOUR STORY</b>
          <span>· · ·</span>
        </span>
        <p className="jbp-text">
          Families who made the move tell the next family what it was really like. Yours could help someone pack.
        </p>
        <Link href="/stories" className="jbp-cta">
          Share your story →
        </Link>
      </section>
    );
  }

  return (
    <section id="travellers" aria-labelledby="travellers-h" tabIndex={-1} className="jbp jbp-travellers">
      <h2 id="travellers-h" className="jbp-title jbp-title--sm">Fellow travellers</h2>
      <ul className="jbp-stories">
        {list.map((story, i) => (
          <li key={story.id ?? i} className="jbp-story">
            <span className="jbp-story-stamps">
              <Stamp shape="rect" color={STAMP_INKS.terracotta} lines={['EXIT', place(story.from_country)]} rotate={-5} applied={active} />
              <Stamp shape="rect" color={STAMP_INKS.green} lines={['ENTRY', place(story.current_country)]} rotate={4} applied={active} />
            </span>
            <blockquote className="jbp-story-quote">
              <p>&ldquo;{clampStory(story.story_text)}&rdquo;</p>
            </blockquote>
          </li>
        ))}
      </ul>
      <Link href="/stories" className="jbp-more">
        All stories →
      </Link>
    </section>
  );
}
