'use client';

import { createRef, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Book from './Book';
import NightSky from './NightSky';
import JourneySearch from './JourneySearch';
import { PassportProvider, usePassport } from './PassportContext';
import { ANCHORS, PAGES, buildTimeline, progressForPage } from './timeline';
import { desktopPose, notepadPose, easeInOutCubic } from './pose';
import { bookTransform, closedShiftPx, leafStyle, litePageStyle, notepadPageStyle, skyLayers } from './stageStyle';
import { scrollTarget, useScrollProgress } from './useScrollProgress';
import { useLayoutMode } from './useLayoutMode';
import { activeKey, activePages } from './activePages';
import { initialRoute } from './search';
import Cover from './pages/Cover';
import Notice from './pages/Notice';
import DataPage from './pages/DataPage';
import VisasOne from './pages/VisasOne';
import VisasTwo from './pages/VisasTwo';
import Entries from './pages/Entries';
import UvSources from './pages/UvSources';
import Travellers from './pages/Travellers';
import Observations from './pages/Observations';
import './stage.css';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const TIMELINE = buildTimeline();
const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0

/** reduced -> stack (no stage); lite -> lite; phone -> notepad; otherwise the 3D spread. */
function layoutFor({ motion, phone }) {
  if (motion === 'reduced') return 'stack';
  if (motion === 'lite') return 'lite';
  return phone ? 'notepad' : 'spread';
}

const poseFor = (layout, p) => (layout === 'spread' ? desktopPose(TIMELINE, p) : notepadPose(TIMELINE, p));

// Programmatic jumps (anchors, focus) are instant: the eased book animates the change itself.
function scrollInstant(top) {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo(0, Math.max(0, Math.round(top)));
  root.style.scrollBehavior = previous;
}

function sectionTop(section) {
  return section.getBoundingClientRect().top + window.scrollY;
}
const topForProgress = (section, p) =>
  sectionTop(section) + clamp01(p) * Math.max(0, section.offsetHeight - window.innerHeight);
const progressNow = (section) =>
  scrollTarget({
    scrollY: window.scrollY,
    sectionTop: sectionTop(section),
    sectionHeight: section.offsetHeight,
    viewportHeight: window.innerHeight,
  });

/** Hash anchors (#tools, #how-it-works, #sources, #stories): on load once, then on hashchange. */
function useAnchors(goToPage) {
  const goRef = useRef(goToPage);
  useIsoLayoutEffect(() => {
    goRef.current = goToPage;
  }, [goToPage]);

  useEffect(() => {
    const go = (focus) => {
      let key = '';
      try {
        key = decodeURIComponent(window.location.hash.slice(1));
      } catch {
        return;
      }
      const page = ANCHORS[key];
      if (!page) return;
      goRef.current(page);
      if (focus) document.getElementById(page)?.focus({ preventScroll: true });
    };
    go(false);
    // The browser may scroll to the #fragment itself once loading finishes; land after it.
    const onLoad = () => go(false);
    if (document.readyState !== 'complete') window.addEventListener('load', onLoad, { once: true });
    const onHash = () => go(true);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('load', onLoad);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);
}

/** "Skip to tools": the first focusable element on the page (rendered by app/page.js). */
export function SkipToTools() {
  const onClick = (e) => {
    e.preventDefault();
    if (window.location.hash === '#tools') window.dispatchEvent(new HashChangeEvent('hashchange'));
    else window.location.hash = 'tools';
  };
  return (
    <a href="#tools" className="ps-skip" onClick={onClick}>
      Skip to tools
    </a>
  );
}

function HeroCopy({ copyRef, verifiedCount }) {
  return (
    <div ref={copyRef} className="ps-hero" data-stage-part="hero">
      <h1 className="ps-h1">
        Your family&apos;s next country, <span className="ps-grad">made simple.</span>
      </h1>
      <p className="ps-sub">
        Free visa guides, moving costs and verified official links — in plain English, for 195 countries.
      </p>
      <JourneySearch variant="hero" />
      <p className="ps-trust">
        Free · 195 countries · {verifiedCount} verified official links · information, not legal advice
      </p>
      <p className="ps-hint" aria-hidden="true">
        <span>↓</span>scroll to open
      </p>
    </div>
  );
}

function FinaleCopy({ copyRef }) {
  return (
    <div ref={copyRef} className="ps-finale" data-stage-part="finale">
      <h2 className="ps-h2">
        60 seconds from here to <span className="ps-grad">somewhere new.</span>
      </h2>
      <p className="ps-sub">
        Tell us where you&apos;re from and where you&apos;d like to go. We&apos;ll show you the visas, the costs and the
        official sites.
      </p>
      <JourneySearch variant="finale" />
    </div>
  );
}

function writeCopy(el, opacity, direction) {
  if (!el) return;
  const o = clamp01(opacity);
  el.style.opacity = String(o);
  el.style.transform = `translate3d(0, calc(-50% + ${(direction * (1 - o) * 40).toFixed(1)}px), 0)`;
  el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
}

/**
 * The tall scroll section with the sticky stage (spread / notepad / lite only). Hosts the scroll
 * hook, so it is mounted only in stage modes. Every frame writes styles to refs; React state
 * changes only when the set of pages on screen changes.
 */
function Stage({ layout, motion, phone, verifiedCount, leaves, base }) {
  const { setActive } = usePassport();
  const sectionRef = useRef(null);
  const heroRef = useRef(null);
  const finaleRef = useRef(null);
  const wrapRef = useRef(null);
  const bookRefs = useMemo(
    () => ({
      book: createRef(),
      light: createRef(),
      flap: createRef(),
      leaves: [0, 1, 2, 3].map(() => createRef()),
      pages: PAGES.map(() => createRef()),
    }),
    [],
  );
  const skyRefs = useMemo(
    () => ({ night: createRef(), predawn: createRef(), sunrise: createRef(), day: createRef(), dim: createRef() }),
    [],
  );
  const metrics = useRef({ shiftPx: 0, dims: [] });
  const lastP = useRef(0);
  const shownKey = useRef('');

  // Measured on mount, on layout switch and on resize — never per frame.
  const measure = useCallback(() => {
    const m = metrics.current;
    if (layout === 'spread') {
      const leaf = bookRefs.leaves[0].current;
      m.shiftPx = closedShiftPx(window.innerWidth, leaf ? leaf.offsetWidth : 0);
      m.dims = bookRefs.leaves.map((r) => (r.current ? [...r.current.querySelectorAll('[data-dim]')] : []));
    } else {
      m.shiftPx = 0;
      m.dims = bookRefs.pages.map((r) => (r.current ? r.current.querySelector('[data-dim]') : null));
    }
  }, [layout, bookRefs]);

  // onFrame: keyed on the mounted DOM (layout from motion + phone), so a switch re-poses at once.
  const render = useCallback(
    (p) => {
      lastP.current = p;
      const pose = poseFor(layout, p);

      const sky = skyLayers(pose.sky);
      if (skyRefs.predawn.current) skyRefs.predawn.current.style.opacity = String(sky.predawn);
      if (skyRefs.sunrise.current) skyRefs.sunrise.current.style.opacity = String(sky.sunrise);
      if (skyRefs.day.current) skyRefs.day.current.style.opacity = String(sky.day);

      writeCopy(heroRef.current, pose.heroOpacity, -1);
      writeCopy(finaleRef.current, pose.finaleOpacity, 1);

      const m = metrics.current;
      if (layout === 'spread') {
        // Step 1: no UV flap yet, so the book never shifts for it (flapPx 0) and the flap stays folded.
        const book = bookRefs.book.current;
        if (book) book.style.transform = bookTransform(pose, m.shiftPx, 0);
        bookRefs.leaves.forEach((ref, i) => {
          const el = ref.current;
          if (!el) return;
          const s = leafStyle(i, pose.leaves[i]);
          el.style.transform = s.transform;
          const dims = m.dims[i];
          if (dims) for (const d of dims) d.style.opacity = String(s.dim);
        });
        if (bookRefs.light.current) bookRefs.light.current.style.opacity = String(pose.coverLight);
      } else {
        const styleOf = layout === 'lite' ? litePageStyle : notepadPageStyle;
        const flip = easeInOutCubic(pose.flip);
        bookRefs.pages.forEach((ref, i) => {
          const el = ref.current;
          if (!el) return;
          const s = styleOf(i, pose.page, flip);
          el.style.transform = s.transform;
          el.style.opacity = String(s.opacity);
          el.style.zIndex = String(s.zIndex);
          el.style.pointerEvents = s.pointerEvents;
          if (layout === 'notepad' && m.dims[i]) m.dims[i].style.opacity = String(s.dim);
        });
        // One page at a time leaves no room beside the hero/finale: the book fades in as the
        // hero leaves and out as the finale arrives.
        const wrap = wrapRef.current;
        if (wrap) {
          const shown = (1 - pose.heroOpacity) * (1 - pose.finaleOpacity);
          wrap.style.opacity = String(+shown.toFixed(3));
          wrap.style.transform = `translate3d(0, ${((1 - shown) * 24).toFixed(1)}px, 0)`;
        }
      }

      const set = activePages(layout, pose);
      const key = activeKey(set);
      if (key !== shownKey.current) {
        shownKey.current = key;
        setActive(set);
      }
    },
    // motion/phone are listed with layout on purpose: they decide which DOM is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, motion, phone, bookRefs, skyRefs, setActive],
  );

  // Before useScrollProgress (layout effects run in order): measure the DOM the next frame writes to.
  useIsoLayoutEffect(() => {
    measure();
    shownKey.current = '';
  }, [measure]);

  useScrollProgress(sectionRef, render);

  useEffect(() => {
    const onResize = () => {
      measure();
      render(lastP.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, render]);

  // Where each part is fully showing. Phones/lite show the cover only once the hero has gone.
  const progressFor = useCallback(
    (part) => {
      if (part === 'hero') return 0;
      if (part === 'finale') return 1;
      if (part === 'cover' && layout !== 'spread') return TIMELINE.ranges.open[0];
      return progressForPage(TIMELINE, part);
    },
    [layout],
  );

  const isShowing = useCallback(
    (part) => {
      const section = sectionRef.current;
      if (!section) return true;
      const pose = poseFor(layout, progressNow(section));
      if (part === 'hero') return pose.heroOpacity > 0.5;
      if (part === 'finale') return pose.finaleOpacity > 0.5;
      if (layout !== 'spread' && (1 - pose.heroOpacity) * (1 - pose.finaleOpacity) < 0.5) return false;
      return activePages(layout, pose).has(part);
    },
    [layout],
  );

  const goTo = useCallback(
    (part) => {
      const section = sectionRef.current;
      if (section) scrollInstant(topForProgress(section, progressFor(part)));
    },
    [progressFor],
  );

  useAnchors(goTo);

  // Keyboard: focus landing in a page (or hero/finale) that is not on screen brings it on screen.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    const onFocusIn = (e) => {
      const target = e.target instanceof Element ? e.target : null;
      const part =
        target?.closest('[data-stage-part]')?.getAttribute('data-stage-part') ||
        target?.closest('[data-page]')?.getAttribute('data-page');
      if (part && !isShowing(part)) goTo(part);
    };
    section.addEventListener('focusin', onFocusIn);
    return () => section.removeEventListener('focusin', onFocusIn);
  }, [isShowing, goTo]);

  // Dev-only test hook: the automated browser pane is a hidden tab (rAF paused), so tests pose
  // the book directly. Scrolls to p as well, so the scroll engine agrees.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return undefined;
    window.__passportRender = (p) => {
      const q = clamp01(Number(p));
      const section = sectionRef.current;
      if (section) scrollInstant(topForProgress(section, q));
      render(q);
      return { layout, p: q, active: [...activePages(layout, poseFor(layout, q))] };
    };
    return () => {
      delete window.__passportRender;
    };
  }, [render, layout]);

  return (
    <div ref={sectionRef} className="ps-section" style={{ height: `calc(${TIMELINE.viewports} * 100svh)` }}>
      <div className="ps-stage">
        <NightSky refs={skyRefs} className={layout === 'lite' ? 'jb-sky--still' : ''} />
        <div className="ps-frame">
          <HeroCopy copyRef={heroRef} verifiedCount={verifiedCount} />
          <div key={layout} ref={wrapRef} className={`ps-bookwrap ps-bookwrap--${layout}`}>
            <Book leaves={leaves} base={base} layout={layout} refs={bookRefs} />
          </div>
          <FinaleCopy copyRef={finaleRef} />
        </div>
      </div>
    </div>
  );
}

/** Reduced motion: hero, the pages as a stack of paper cards, finale. No sticky stage, no pose. */
function Reduced({ verifiedCount, leaves, base }) {
  const { setActive } = usePassport();
  useEffect(() => {
    setActive(new Set(PAGES));
  }, [setActive]);

  const goTo = useCallback((page) => {
    const el = document.getElementById(page);
    if (!el) return;
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    el.scrollIntoView({ block: 'start' });
    root.style.scrollBehavior = previous;
  }, []);
  useAnchors(goTo);

  return (
    <div className="ps-reduced">
      <HeroCopy verifiedCount={verifiedCount} />
      <Book leaves={leaves} base={base} layout="stack" />
      <FinaleCopy />
    </div>
  );
}

function StageInner({ stories, verifiedCount, authorities, note }) {
  const mode = useLayoutMode();
  const layout = layoutFor(mode);
  const { active, setRoute } = usePassport();

  // Start the search from the saved route, else the saved profile's nationality (never saves).
  useEffect(() => {
    let storage = null;
    try {
      storage = window.localStorage;
    } catch {
      storage = null;
    }
    const route = initialRoute(storage);
    if (route.from || route.to) setRoute(route);
  }, [setRoute]);

  const on = (id) => active.has(id);
  const leaves = [
    { front: <Cover active={on('cover')} pointerFoil={layout === 'spread'} />, back: <Notice active={on('notice')} /> },
    { front: <DataPage active={on('data')} />, back: <VisasOne active={on('visas1')} /> },
    { front: <VisasTwo active={on('visas2')} />, back: <Entries active={on('entries')} /> },
    {
      front: <UvSources active={on('sources')} verifiedCount={verifiedCount} authorities={authorities} />,
      back: <Travellers active={on('travellers')} stories={stories} />,
    },
  ];
  const base = <Observations active={on('observations')} note={note} />;

  if (layout === 'stack') return <Reduced verifiedCount={verifiedCount} leaves={leaves} base={base} />;
  return (
    <Stage
      layout={layout}
      motion={mode.motion}
      phone={mode.phone}
      verifiedCount={verifiedCount}
      leaves={leaves}
      base={base}
    />
  );
}

/**
 * The homepage Journey Book: hero (H1, search, trust line), the scroll-driven passport with
 * its nine pages, and the finale. Layout follows useLayoutMode: reduced -> stack, lite -> lite,
 * phone -> notepad, else the 3D spread.
 *   stories       [{ id, from_country, current_country, story_text }] (≤ 2, approved)
 *   verifiedCount number of verified official links (computed from OFFICIAL_SOURCES)
 *   authorities   { [code]: { name, url, domain } } verified immigration authorities
 *   note          founder note for the Observations page
 */
export default function PassportStage({ stories = [], verifiedCount = 0, authorities = {}, note = '' }) {
  return (
    <PassportProvider initialRoute={null}>
      <StageInner stories={stories} verifiedCount={verifiedCount} authorities={authorities} note={note} />
    </PassportProvider>
  );
}
