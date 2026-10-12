'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { decodeFrame, DECODE_FRAMES } from './mrz';
import { REDUCED_MOTION, useMediaQuery } from './useMediaQuery';
import './kit.css';

const FRAME_MS = 45;
const START_MS = 250; // let the page land first

/**
 * Two machine-readable-zone lines that scramble-decode into plain English. On each arrival
 * (`active` turning true) the raw `lines` decode into `plain`, one decodeFrame every 45ms
 * (setTimeout chain, cancelled on deactivation and unmount), and stay decoded; leaving resets
 * them to the raw lines. Tap / click / Enter replays. Arriving inside a [data-sweep] ancestor
 * (the homepage book closing, the page only flashes past): decoded at once.
 * `still` or prefers-reduced-motion: raw and plain lines shown together, no motion.
 * Visually 2 x 44 characters; assistive tech gets `label` (the meaning in a sentence) instead,
 * by default "Machine-readable zone: " + the plain lines.
 * `block` is the class the markup is built from (`block`, `block--still`, `block-plain`):
 * 'kit-mrzd' (kit.css) by default; the homepage data page passes its own 'jbp-mrz'.
 * `onDecoded` (optional) is called each time a decode reaches the plain lines (e.g. to land a
 * stamp after it); never under `still` / reduced motion, where nothing decodes.
 */
export function MrzDecode({ lines, plain, active = false, still = false, label, block = 'kit-mrzd', onDecoded }) {
  const reducedMotion = useMediaQuery(REDUCED_MOTION, false);
  const quiet = still || reducedMotion;
  const [frame, setFrame] = useState(0);
  const [run, setRun] = useState(0);
  const ref = useRef(null);
  const meaning = label ?? `Machine-readable zone: ${plain.join(' ')}`;
  const decoded = useEffectEvent(() => onDecoded?.());

  useEffect(() => {
    if (!active || quiet) return undefined;
    const sweep = !run && Boolean(ref.current?.closest('[data-sweep]'));
    let f = sweep ? DECODE_FRAMES - 1 : 0;
    let timer = 0;
    const tick = () => {
      f += 1;
      setFrame(f);
      if (f < DECODE_FRAMES) timer = window.setTimeout(tick, FRAME_MS);
      else decoded();
    };
    timer = window.setTimeout(tick, run || sweep ? 0 : START_MS);
    return () => {
      window.clearTimeout(timer);
      setFrame(0); // back to the raw lines: the next arrival (or replay) decodes again
    };
  }, [active, quiet, run]);

  if (quiet) {
    return (
      <div className={`${block} ${block}--still`} role="img" aria-label={meaning}>
        <span>{lines[0]}</span>
        <span>{lines[1]}</span>
        <span className={`${block}-plain`}>{plain[0]}</span>
        <span className={`${block}-plain`}>{plain[1]}</span>
      </div>
    );
  }
  const done = frame >= DECODE_FRAMES;
  return (
    <button
      ref={ref}
      type="button"
      className={block}
      data-decoded={done ? 'true' : 'false'}
      aria-label={`${meaning} Replay the decode.`}
      onClick={() => setRun((n) => n + 1)}
    >
      <span aria-hidden="true">{decodeFrame(lines[0], plain[0], frame)}</span>
      <span aria-hidden="true">{decodeFrame(lines[1], plain[1], frame)}</span>
    </button>
  );
}

export default MrzDecode;
