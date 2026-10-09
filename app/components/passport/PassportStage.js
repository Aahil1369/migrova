'use client';

import { createRef, memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import Book from './Book';
import NightSky from './NightSky';
import JourneySearch from './JourneySearch';
import BoardingPass from './BoardingPass';
import { PassportProvider, useActive, usePassport } from './PassportContext';
import { ANCHORS, PAGES, buildTimeline, localT, progressForPage } from './timeline';
import { desktopPose, notepadPose, easeInOutCubic } from './pose';
import {
  bookTransform,
  closedShiftPx,
  flapStyle,
  inlineFlapStyle,
  leafStyle,
  litePageStyle,
  notepadPageStyle,
  skyLayers,
} from './stageStyle';
import { scrollTarget, useScrollProgress } from './useScrollProgress';
import { useLayoutMode } from './useLayoutMode';
import { decideLayout } from './motionMode';
import { activeKey, activePages, padShown } from './activePages';
import { initialRoute } from './search';
import Cover from './pages/Cover';
import Notice from './pages/Notice';
import DataPage from './pages/DataPage';
import VisasOne from './pages/VisasOne';
import VisasTwo from './pages/VisasTwo';
import Entries from './pages/Entries';
import UvSources, { UvFlap } from './pages/UvSources';
import { FLICKER_KEYFRAMES, FLICKER_MS, uvFlickerStep, uvRevealLevel } from './pages/uv';
import Travellers from './pages/Travellers';
import Observations from './pages/Observations';
import './stage.css';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const TIMELINE = buildTimeline();
const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0

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

// Memoised: page changes re-render StageInner, never the hero / finale copy (or their searches).
const HeroCopy = memo(function HeroCopy({ copyRef, verifiedCount }) {
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
});

const FinaleCopy = memo(function FinaleCopy({ copyRef, passRef, still = false }) {
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
      <BoardingPass passRef={passRef} still={still} />
    </div>
  );
});

// UV beat: how dark the page around the flap gets (the entries page, left of it), x uvDim.
const SURROUND_DIM = 0.5;
const SOURCES_INDEX = PAGES.indexOf('sources');
// Where keyboard focus inside the fold-out flap lands: the UV beat, flap open, lamp still on.
const FLAP_FOCUS_AT = 0.35;

/** The lamp clicks off: two quick opacity pulses of the sky's dim layer (WAAPI overrides the
 *  per-frame inline opacity only while it runs, then the scroll pose takes over again). */
function flicker(el) {
  if (typeof el.animate !== 'function') return;
  try {
    el.animate(FLICKER_KEYFRAMES, { duration: FLICKER_MS, easing: 'linear' });
  } catch {
    /* an old engine without offset keyframes: no flicker, nothing else changes */
  }
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
  const { setActive } = useActive();
  const sectionRef = useRef(null);
  const heroRef = useRef(null);
  const finaleRef = useRef(null);
  const passRef = useRef(null);
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
  const metrics = useRef({
    shiftPx: 0,
    flapPx: 0,
    dims: [],
    surround: null,
    inlineFlap: null,
    sourcesBody: null,
    uv: [],
    uvLevel: '',
    flickerArmed: false,
    cover: null,
    coverState: '',
  });
  const lastP = useRef(0);
  const shownKey = useRef('');

  // Measured on mount, on layout switch and on resize — never per frame.
  const measure = useCallback(() => {
    const m = metrics.current;
    if (layout === 'spread') {
      const leaf = bookRefs.leaves[0].current;
      m.shiftPx = closedShiftPx(window.innerWidth, leaf ? leaf.offsetWidth : 0);
      m.flapPx = bookRefs.flap.current ? bookRefs.flap.current.offsetWidth : 0; // ignores transforms
      m.dims = bookRefs.leaves.map((r) => (r.current ? [...r.current.querySelectorAll('[data-dim]')] : []));
      // The entries page (left of the sources page) darkens with the sky during the UV check.
      m.surround = bookRefs.leaves[2].current?.querySelector(':scope > .jb-face--back > [data-dim]') ?? null;
    } else {
      m.shiftPx = 0;
      m.flapPx = 0;
      m.dims = bookRefs.pages.map((r) => (r.current ? r.current.querySelector('[data-dim]') : null));
      m.surround = null;
    }
    // Phones / lite: the UV check folds out over the sources page body (see inlineFlapStyle).
    const sourcesPage = layout === 'spread' ? null : bookRefs.pages[SOURCES_INDEX]?.current;
    m.inlineFlap = sourcesPage?.querySelector('.jb-flap-inline') ?? null;
    m.sourcesBody = sourcesPage?.querySelector('.jbp-sources') ?? null;
    // UV check roots (flap content in the spread, inline elsewhere); fresh DOM -> rewrite data-auto.
    m.uv = sectionRef.current ? [...sectionRef.current.querySelectorAll('[data-uv]')] : [];
    m.uvLevel = '';
    // The cover (closing beat: BON VOYAGE stamp + blessing word); fresh DOM -> rewrite its state.
    m.cover = sectionRef.current?.querySelector('.jbp-cover') ?? null;
    m.coverState = '';
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
      // The boarding pass slides out of the book once the finale copy is in: from the book's
      // side on the desktop spread, up from below on phones / lite.
      const pass = passRef.current;
      if (pass) {
        const f = clamp01((pose.finaleOpacity - 0.3) / 0.7);
        pass.style.opacity = String(+f.toFixed(3));
        pass.style.transform =
          layout === 'spread'
            ? `translate3d(${((1 - f) * 140).toFixed(1)}px, 0, 0)`
            : `translate3d(0, ${((1 - f) * 32).toFixed(1)}px, 0)`;
      }

      const m = metrics.current;

      // UV check: the sky dims; as it lifts again the lamp clicks off with a warm flicker
      // (once per exit: uvFlickerStep arms at >= 0.6 and fires once below 0.5).
      const dim = skyRefs.dim.current;
      if (dim) {
        dim.style.opacity = String(+pose.uvDim.toFixed(3));
        const step = uvFlickerStep(m.flickerArmed, pose.uvDim);
        m.flickerArmed = step.armed;
        if (step.fire) flicker(dim);
      }
      // Closing: BON VOYAGE lands on the cover, then the cover word becomes the blessing.
      // Pose-driven booleans -> data attributes, written only when they change.
      const coverState = `${pose.bonVoyage ? 1 : 0}${pose.blessing ? 1 : 0}`;
      if (m.cover && coverState !== m.coverState) {
        m.coverState = coverState;
        m.cover.dataset.bonVoyage = pose.bonVoyage ? '1' : '';
        m.cover.dataset.blessing = pose.blessing ? '1' : '';
      }
      // The two site cards reveal themselves one after the other as the beat holds (on change only).
      const level = String(uvRevealLevel(localT(TIMELINE, 'uv', p)));
      if (level !== m.uvLevel) {
        m.uvLevel = level;
        for (const el of m.uv) el.dataset.auto = level;
      }

      if (layout === 'spread') {
        // The open flap would overhang the right edge: the book slides left by half its width.
        const book = bookRefs.book.current;
        if (book) book.style.transform = bookTransform(pose, m.shiftPx, m.flapPx);
        const surround = pose.uvDim * SURROUND_DIM;
        bookRefs.leaves.forEach((ref, i) => {
          const el = ref.current;
          if (!el) return;
          const s = leafStyle(i, pose.leaves[i]);
          el.style.transform = s.transform;
          const dims = m.dims[i];
          if (dims) for (const d of dims) d.style.opacity = String(d === m.surround ? Math.max(s.dim, surround) : s.dim);
        });
        const flapEl = bookRefs.flap.current;
        if (flapEl) {
          const fs = flapStyle(pose.flap);
          flapEl.style.transform = fs.transform;
          flapEl.style.opacity = String(fs.opacity);
          flapEl.style.pointerEvents = fs.pointerEvents;
        }
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
        if (m.inlineFlap && m.sourcesBody) {
          // 'auto' -> inherit (''), so a hidden page's pointer-events:none still wins.
          const fs = inlineFlapStyle(pose.flap);
          m.sourcesBody.style.opacity = String(fs.pageOpacity);
          m.sourcesBody.style.pointerEvents = fs.pagePointerEvents === 'none' ? 'none' : '';
          m.inlineFlap.style.opacity = String(fs.opacity);
          m.inlineFlap.style.transform = fs.transform;
          m.inlineFlap.style.pointerEvents = fs.pointerEvents === 'none' ? 'none' : '';
        }
        // One page at a time leaves no room beside the hero/finale: the book fades in as the
        // hero leaves and out as the finale arrives. While it is (nearly) invisible its pages
        // ignore taps (data-inert, see stage.css) but stay keyboard-reachable.
        const wrap = wrapRef.current;
        if (wrap) {
          const shown = padShown(pose);
          wrap.style.opacity = String(+shown.toFixed(3));
          wrap.style.transform = `translate3d(0, ${((1 - shown) * 24).toFixed(1)}px, 0)`;
          const inert = shown < 0.5 ? '1' : '';
          if (wrap.dataset.inert !== inert) wrap.dataset.inert = inert;
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
      if (part === 'flap') {
        const [start, end] = TIMELINE.ranges.uv;
        return start + FLAP_FOCUS_AT * (end - start);
      }
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
      if (part === 'flap') return pose.flap > 0.98;
      if (layout !== 'spread' && padShown(pose) < 0.5) return false;
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

  // Keyboard / assistive tech: focus landing in a page (or hero/finale, or the UV flap) that is not
  // on screen brings it on screen. Focus that follows a pointer press (click/tap) never jumps, so a
  // stray tap can never rewind the page: the flag is set on pointerdown and cleared once that
  // press is over (after its click / auxclick / contextmenu, or when it is cancelled) or on any
  // key press, so later
  // screen-reader focus moves (no key events) still sync the book.
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return undefined;
    let pointerFocus = false;
    let clearTimer = 0;
    const clear = () => {
      pointerFocus = false;
    };
    const onPointerDown = () => {
      window.clearTimeout(clearTimer);
      pointerFocus = true;
    };
    // After the click (focus from a tap lands before it): clear on the next task.
    const onPressEnd = () => {
      window.clearTimeout(clearTimer);
      clearTimer = window.setTimeout(clear, 0);
    };
    const onFocusIn = (e) => {
      if (pointerFocus) return;
      const target = e.target instanceof Element ? e.target : null;
      const part =
        target?.closest('[data-stage-part]')?.getAttribute('data-stage-part') ||
        (target?.closest('[data-flap]') ? 'flap' : null) ||
        target?.closest('[data-page]')?.getAttribute('data-page');
      if (part && !isShowing(part)) goTo(part);
    };
    window.addEventListener('pointerdown', onPointerDown, true);
    // Every way a press can end: primary click, middle click, right click / long-press menu.
    const pressEnds = ['click', 'auxclick', 'contextmenu', 'pointercancel'];
    for (const type of pressEnds) window.addEventListener(type, onPressEnd, true);
    window.addEventListener('keydown', clear, true);
    section.addEventListener('focusin', onFocusIn);
    return () => {
      window.clearTimeout(clearTimer);
      window.removeEventListener('pointerdown', onPointerDown, true);
      for (const type of pressEnds) window.removeEventListener(type, onPressEnd, true);
      window.removeEventListener('keydown', clear, true);
      section.removeEventListener('focusin', onFocusIn);
    };
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
          <FinaleCopy copyRef={finaleRef} passRef={passRef} />
        </div>
      </div>
    </div>
  );
}

/** Reduced motion: hero, the pages as a stack of paper cards, finale. No sticky stage, no pose. */
function Reduced({ verifiedCount, leaves, base }) {
  const { setActive } = useActive();
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
      <FinaleCopy still />
    </div>
  );
}

function StageInner({ stories, verifiedCount, authorities, note }) {
  const mode = useLayoutMode();
  // reduced motion or a short frame -> stack (no stage); lite -> lite; phone -> notepad; else spread.
  const layout = decideLayout(mode);
  const { active, setRoute } = usePassport();
  // UV lamp: pointer lamp on the desktop spread, scanner band on phones / lite, none when reduced.
  const lamp = layout === 'spread' ? 'cursor' : layout === 'stack' ? 'off' : 'scan';

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
    { front: <DataPage active={on('data')} still={layout === 'stack'} verifiedCount={verifiedCount} />, back: <VisasOne active={on('visas1')} /> },
    { front: <VisasTwo active={on('visas2')} />, back: <Entries active={on('entries')} /> },
    {
      front: <UvSources active={on('sources')} verifiedCount={verifiedCount} />,
      back: <Travellers active={on('travellers')} stories={stories} />,
      flap: <UvFlap active={on('sources')} authorities={authorities} lamp={lamp} />,
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
