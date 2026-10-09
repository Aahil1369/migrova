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
  fadePageStyle,
  flapStyle,
  inlineFlapStyle,
  leafStyle,
  litePageStyle,
  notepadPageStyle,
  pageLayer,
  skyLayers,
  starsCovered,
} from './stageStyle';
import { scrollTarget, useScrollProgress } from './useScrollProgress';
import { useLayoutMode } from './useLayoutMode';
import { decideLayout } from './motionMode';
import { createQualityMonitor, frameStats } from './quality';
import { activeKey, activePages, padShown, showingPages } from './activePages';
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
const SECTION_STYLE = { height: `calc(${TIMELINE.viewports} * 100svh)` };
const PAGE_STYLE = { notepad: notepadPageStyle, lite: litePageStyle, fade: fadePageStyle };
const ALL_KEY = activeKey(new Set(PAGES));
const clamp01 = (n) => (n > 0 ? (n < 1 ? n : 1) : 0); // NaN -> 0
// A boolean data attribute: present ('') or absent.
const flag = (el, name, on) => (on ? el.setAttribute(name, '') : el.removeAttribute(name));

// The adaptive quality tier never goes back up within a visit (survives client navigation).
let sessionTier = 'high';

const poseFor = (layout, p) => (layout === 'spread' ? desktopPose(TIMELINE, p) : notepadPose(TIMELINE, p));

// Programmatic jumps (anchors, focus) are instant: the eased book animates the change itself.
function scrollInstant(top, el) {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  if (el) el.scrollIntoView({ block: 'start' });
  else window.scrollTo(0, Math.max(0, Math.round(top)));
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

function goToHash(go, focus) {
  let key = '';
  try {
    key = decodeURIComponent(window.location.hash.slice(1));
  } catch {
    return;
  }
  const page = ANCHORS[key];
  if (!page) return;
  go(page);
  if (focus) document.getElementById(page)?.focus({ preventScroll: true });
}

/**
 * Hash anchors (#tools, #how-it-works, #sources, #stories): once the layout has settled (`ready`:
 * the stack's geometry differs from the stage's), and again after load; then on hashchange.
 */
function useAnchors(goToPage, ready) {
  const goRef = useRef(goToPage);
  useIsoLayoutEffect(() => {
    goRef.current = goToPage;
  }, [goToPage]);

  useEffect(() => {
    const onHash = () => goToHash(goRef.current, true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (!ready) return undefined;
    goToHash(goRef.current, false);
    // The browser may scroll to the #fragment itself once loading finishes; land after it.
    const onLoad = () => goToHash(goRef.current, false);
    if (document.readyState !== 'complete') window.addEventListener('load', onLoad, { once: true });
    return () => window.removeEventListener('load', onLoad);
  }, [ready]);
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

/** `direction` -1 slides up as it fades, 1 down, 0 (fade layout) fades in place. Fully faded
 *  out, it gets data-gone (on change only), which pauses its loops (the hero's hint arrow). */
function writeCopy(el, opacity, direction) {
  if (!el) return;
  const o = clamp01(opacity);
  el.style.opacity = String(o);
  el.style.transform = `translate3d(0, calc(-50% + ${(direction * (1 - o) * 40).toFixed(1)}px), 0)`;
  el.style.pointerEvents = o > 0.5 ? 'auto' : 'none';
  if (el.hasAttribute('data-gone') !== (o === 0)) flag(el, 'data-gone', o === 0);
}

/**
 * Adaptive quality: while the user scrolls the book (from a second after load), sample rAF frame
 * intervals and step .ps-stage[data-quality] down when they are clearly over budget (quality.js).
 * One attribute write per step, no React state.
 */
function useQualityTier(stageRef, lastP, enabled) {
  useEffect(() => {
    const stage = stageRef.current;
    if (!enabled || !stage || typeof window.requestAnimationFrame !== 'function') return undefined;
    const write = (tier) => {
      sessionTier = tier;
      stage.dataset.quality = tier;
    };
    write(sessionTier);
    const monitor = createQualityMonitor({
      raf: (cb) => window.requestAnimationFrame(cb),
      caf: (id) => window.cancelAnimationFrame(id),
      now: () => performance.now(),
      tier: sessionTier,
      onChange: write,
    });
    let armed = false;
    let timer = 0;
    const arm = () => {
      timer = window.setTimeout(() => {
        armed = true;
        monitor.calibrate();
      }, 1000);
    };
    if (document.readyState === 'complete') arm();
    else window.addEventListener('load', arm, { once: true });
    const onScroll = () => {
      if (armed && lastP.current > 0 && lastP.current < 1) monitor.activity();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('load', arm);
      window.removeEventListener('scroll', onScroll);
      monitor.stop();
    };
  }, [stageRef, lastP, enabled]);
}

/**
 * The homepage stage in every layout. Spread / notepad / lite / fade: the tall scroll section
 * with the sticky stage; every frame writes styles to refs, and React state changes only when
 * the set of pages on screen changes. Stack (tiny frames): the same tree in normal flow
 * (section.ps-reduced), so switching layouts never replaces the hero / finale nodes.
 */
function Stage({ layout, motion, settled, verifiedCount, leaves, base }) {
  const { setActive } = useActive();
  const flow = layout === 'stack';
  const calm = layout === 'fade'; // reduced motion: opacity only, nothing moves
  const sectionRef = useRef(null);
  const stageRef = useRef(null);
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
    () => ({
      root: createRef(),
      night: createRef(),
      predawn: createRef(),
      sunrise: createRef(),
      day: createRef(),
      dim: createRef(),
    }),
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
    faces: [],
    showKey: null,
    turnPage: -1,
    covered: null,
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
    // One page at a time: the UV check folds out over the sources page body (see inlineFlapStyle).
    const sourcesPage = layout === 'spread' ? null : bookRefs.pages[SOURCES_INDEX]?.current;
    m.inlineFlap = sourcesPage?.querySelector('.jb-flap-inline') ?? null;
    m.sourcesBody = sourcesPage?.querySelector('.jbp-sources') ?? null;
    // UV check roots (flap content in the spread, inline elsewhere); fresh DOM -> rewrite data-auto.
    m.uv = sectionRef.current ? [...sectionRef.current.querySelectorAll('[data-uv]')] : [];
    m.uvLevel = '';
    // The cover (closing beat: BON VOYAGE stamp + blessing word); fresh DOM -> rewrite its state.
    m.cover = sectionRef.current?.querySelector('.jbp-cover') ?? null;
    m.coverState = '';
    // Page faces (data-showing: their loops run only on screen), the page-turn layer hints and
    // the sky's covered flag: fresh DOM -> rewrite them all.
    m.faces = sectionRef.current ? [...sectionRef.current.querySelectorAll('.jb-face[data-page]')] : [];
    m.showKey = null;
    m.turnPage = -1;
    m.covered = null;
  }, [layout, bookRefs]);

  // onFrame: keyed on the mounted DOM (layout from motion + frame), so a switch re-poses at once.
  const render = useCallback(
    (p) => {
      lastP.current = p;
      if (flow) {
        // Pages in normal flow: nothing to pose, and every page counts as on screen.
        if (shownKey.current !== ALL_KEY) {
          shownKey.current = ALL_KEY;
          setActive(new Set(PAGES));
        }
        return;
      }
      const pose = poseFor(layout, p);

      const sky = skyLayers(pose.sky);
      if (skyRefs.predawn.current) skyRefs.predawn.current.style.opacity = String(sky.predawn);
      if (skyRefs.sunrise.current) skyRefs.sunrise.current.style.opacity = String(sky.sunrise);
      if (skyRefs.day.current) skyRefs.day.current.style.opacity = String(sky.day);
      const m = metrics.current;
      // Once the opaque sunrise layer covers the stars and globe, their loops pause (on change).
      const covered = starsCovered(pose.sky);
      if (skyRefs.root.current && covered !== m.covered) {
        m.covered = covered;
        flag(skyRefs.root.current, 'data-covered', covered);
      }

      writeCopy(heroRef.current, pose.heroOpacity, calm ? 0 : -1);
      writeCopy(finaleRef.current, pose.finaleOpacity, calm ? 0 : 1);
      // The boarding pass slides out of the book once the finale copy is in: from the book's
      // side on the desktop spread, up from below on phones / lite; fades in place in fade.
      const pass = passRef.current;
      if (pass) {
        const f = clamp01((pose.finaleOpacity - 0.3) / 0.7);
        pass.style.opacity = String(+f.toFixed(3));
        pass.style.transform = calm
          ? 'none'
          : layout === 'spread'
            ? `translate3d(${((1 - f) * 140).toFixed(1)}px, 0, 0)`
            : `translate3d(0, ${((1 - f) * 32).toFixed(1)}px, 0)`;
      }

      // UV check: the sky dims; as it lifts again the lamp clicks off with a warm flicker
      // (once per exit: uvFlickerStep arms at >= 0.6 and fires once below 0.5). No flicker in fade.
      const dim = skyRefs.dim.current;
      if (dim) {
        dim.style.opacity = String(+pose.uvDim.toFixed(3));
        const step = uvFlickerStep(m.flickerArmed, pose.uvDim);
        m.flickerArmed = step.armed;
        if (step.fire && !calm) flicker(dim);
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
        const styleOf = PAGE_STYLE[layout] || notepadPageStyle;
        const flip = easeInOutCubic(pose.flip);
        // The page turning and the page under it get their own layers (passport.css): written
        // when the page changes, never per frame.
        if (pose.page !== m.turnPage) {
          m.turnPage = pose.page;
          bookRefs.pages.forEach((ref, i) => {
            const el = ref.current;
            if (!el) return;
            const hint = pageLayer(i, pose.page);
            if (hint) el.dataset.turn = hint;
            else delete el.dataset.turn;
          });
        }
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
          const fs = inlineFlapStyle(pose.flap, calm);
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
          wrap.style.transform = calm ? 'none' : `translate3d(0, ${((1 - shown) * 24).toFixed(1)}px, 0)`;
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
      // Loops (seal spin, cover sheen) run only on faces actually on screen (on change).
      const showing = showingPages(layout, pose);
      const showKey = activeKey(showing);
      if (showKey !== m.showKey) {
        m.showKey = showKey;
        for (const face of m.faces) flag(face, 'data-showing', showing.has(face.dataset.page));
      }
    },
    // motion is listed with layout on purpose: together they decide which DOM is mounted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [layout, motion, flow, calm, bookRefs, skyRefs, setActive],
  );

  // Before useScrollProgress (layout effects run in order): measure the DOM the next frame writes
  // to. Entering the stack, drop the stage styles the pose wrote on the (kept) hero/finale nodes.
  useIsoLayoutEffect(() => {
    measure();
    shownKey.current = '';
    if (flow) {
      for (const el of [heroRef.current, finaleRef.current, passRef.current]) {
        if (!el) continue;
        el.style.opacity = '';
        el.style.transform = '';
        el.style.pointerEvents = '';
        el.removeAttribute('data-gone');
      }
    }
  }, [measure, flow]);

  useScrollProgress(sectionRef, render);
  useQualityTier(stageRef, lastP, !flow);

  // The sky's loops also pause while the stage is scrolled away (the page below the book).
  useEffect(() => {
    const stage = stageRef.current;
    const root = skyRefs.root.current;
    if (flow || !stage || !root || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => flag(root, 'data-offscreen', !entry.isIntersecting));
    observer.observe(stage);
    return () => observer.disconnect();
  }, [flow, skyRefs]);

  useEffect(() => {
    const onResize = () => {
      measure();
      render(lastP.current);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [measure, render]);

  // Where each part is fully showing. One-page layouts show the cover only once the hero has gone.
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
      if (!section || flow) return true;
      const pose = poseFor(layout, progressNow(section));
      if (part === 'hero') return pose.heroOpacity > 0.5;
      if (part === 'finale') return pose.finaleOpacity > 0.5;
      if (part === 'flap') return pose.flap > 0.98;
      if (layout !== 'spread' && padShown(pose) < 0.5) return false;
      return activePages(layout, pose).has(part);
    },
    [layout, flow],
  );

  const goTo = useCallback(
    (part) => {
      const section = sectionRef.current;
      if (!section) return;
      if (!flow) {
        scrollInstant(topForProgress(section, progressFor(part)));
        return;
      }
      // Stack: everything is in flow; scroll the part's element to the top (scroll-margin clears
      // the navbar).
      const el =
        part === 'hero' ? heroRef.current : part === 'finale' ? finaleRef.current : document.getElementById(part);
      if (el) scrollInstant(0, el);
    },
    [progressFor, flow],
  );

  useAnchors(goTo, settled);

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
      if (section && !flow) scrollInstant(topForProgress(section, q));
      render(q);
      return { layout, p: q, active: flow ? [...PAGES] : [...activePages(layout, poseFor(layout, q))] };
    };
    return () => {
      delete window.__passportRender;
    };
  }, [render, layout, flow]);

  // Same element types at the same positions in every layout: only the keyed book wrapper
  // remounts when the layout changes; the hero (the LCP element) and finale nodes are kept.
  return (
    <div
      ref={sectionRef}
      className={flow ? 'ps-reduced' : 'ps-section'}
      style={flow ? undefined : SECTION_STYLE}
      data-layout={layout}
      data-motion={motion}
      data-settled={settled ? '' : undefined}
    >
      <div ref={stageRef} className={flow ? undefined : 'ps-stage'}>
        {flow ? null : (
          <NightSky refs={skyRefs} className={calm ? 'jb-sky--still' : layout === 'lite' ? 'jb-sky--lite' : ''} />
        )}
        <div className={flow ? undefined : 'ps-frame'}>
          <HeroCopy copyRef={heroRef} verifiedCount={verifiedCount} />
          <div key={layout} ref={wrapRef} className={`ps-bookwrap ps-bookwrap--${layout}`}>
            <Book leaves={leaves} base={base} layout={layout} refs={bookRefs} />
          </div>
          <FinaleCopy copyRef={finaleRef} passRef={passRef} still={flow || calm} />
        </div>
      </div>
    </div>
  );
}

/** `?fps=1`: inject the frame-rate overlay (public/passport-fps.js); nothing is loaded otherwise. */
function useFpsOverlay() {
  useEffect(() => {
    try {
      if (new URLSearchParams(window.location.search).get('fps') !== '1' || document.getElementById('jb-fps')) return;
      window.__jbFrameStats = frameStats;
      const script = document.createElement('script');
      script.id = 'jb-fps';
      script.src = '/passport-fps.js';
      script.async = true;
      document.head.appendChild(script);
    } catch {
      /* no overlay */
    }
  }, []);
}

function StageInner({ stories, verifiedCount, authorities, note }) {
  const mode = useLayoutMode();
  // tiny frame -> stack; reduced motion -> fade; lite -> lite; phone / no room -> notepad; else spread.
  const layout = decideLayout(mode);
  const { active, setRoute } = usePassport();
  useFpsOverlay();
  // UV lamp: pointer lamp on the desktop spread, scanner band on phones / lite, none when reduced.
  const lamp = layout === 'spread' ? 'cursor' : layout === 'stack' || layout === 'fade' ? 'off' : 'scan';
  const still = layout === 'stack' || layout === 'fade';

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
    { front: <DataPage active={on('data')} still={still} verifiedCount={verifiedCount} />, back: <VisasOne active={on('visas1')} /> },
    { front: <VisasTwo active={on('visas2')} />, back: <Entries active={on('entries')} /> },
    {
      front: <UvSources active={on('sources')} verifiedCount={verifiedCount} />,
      back: <Travellers active={on('travellers')} stories={stories} />,
      flap: <UvFlap active={on('sources')} authorities={authorities} lamp={lamp} />,
    },
  ];
  const base = <Observations active={on('observations')} note={note} />;

  return (
    <Stage
      layout={layout}
      motion={mode.motion}
      settled={mode.settled}
      verifiedCount={verifiedCount}
      leaves={leaves}
      base={base}
    />
  );
}

/**
 * The homepage Journey Book: hero (H1, search, trust line), the scroll-driven passport with
 * its nine pages, and the finale. Layout follows useLayoutMode + decideLayout: tiny frame ->
 * stack, reduced motion -> fade, lite -> lite, phone / no room for the spread -> notepad, else
 * the 3D spread. `?fps=1` adds a frame-rate overlay.
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
