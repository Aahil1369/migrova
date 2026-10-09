'use client';

import { memo } from 'react';
import { starField } from './stageStyle';
import './passport.css';

// 64 deterministic stars in three layers (stageStyle.js): one SVG each, twinkling as a whole.
const STAR_LAYERS = starField();

/**
 * The sky behind the Journey Book: four full-size gradient layers (night, predawn, sunrise,
 * day), a star field pre-rendered as three SVG layers that twinkle as wholes (opacity only) and
 * a faint slowly turning line globe, plus a `dim` overlay for the UV-check beat. Fills its
 * positioned parent (position:absolute; inset:0).
 *
 * Stacking, bottom -> top: night, predawn, [stars, globe], sunrise, day, dim. Every layer is
 * opaque, so fade the upper ones in over night (see skyLayers() in stageStyle.js).
 * Defaults: night opacity 1, the rest 0. PassportStage writes `style.opacity` to
 * refs { night, predawn, sunrise, day, dim }; dim at 1 is the full UV darkness (pose.uvDim),
 * and as it lifts past 0.5 PassportStage flickers it once (two 60ms WAAPI opacity pulses).
 * On refs.root it toggles, on change only, `data-covered` (the opaque sunrise layer is fully in,
 * so the stars and globe are hidden) and `data-offscreen` (the stage is scrolled away): either
 * pauses the star and globe loops (passport.css).
 * `className`: 'jb-sky--still' stops the star/globe animations (reduced motion: the fade
 * layout); 'jb-sky--lite' stops only the globe (lite keeps the cheap twinkle);
 * prefers-reduced-motion stops them anyway.
 * Memoised: its props never change while the book turns, so page changes never re-render it.
 */
function NightSky({ refs, className = '' }) {
  return (
    <div ref={refs?.root} className={`jb-sky${className ? ` ${className}` : ''}`} aria-hidden="true">
      <div ref={refs?.night} className="jb-sky-layer jb-sky-night" />
      <div ref={refs?.predawn} className="jb-sky-layer jb-sky-predawn" />
      {STAR_LAYERS.map((stars, layer) => (
        <svg key={layer} className={`jb-starfield jb-starfield--${layer + 1}`} aria-hidden="true" focusable="false">
          {stars.map((s, i) => (
            <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} />
          ))}
        </svg>
      ))}
      <svg className="jb-globe" viewBox="0 0 200 200" aria-hidden="true" focusable="false">
        <g fill="none" stroke="#b8cf5d" strokeWidth=".4">
          <circle cx="100" cy="100" r="96" />
          <ellipse cx="100" cy="100" rx="48" ry="96" />
          <ellipse cx="100" cy="100" rx="80" ry="96" />
          <ellipse cx="100" cy="100" rx="96" ry="32" />
          <ellipse cx="100" cy="100" rx="96" ry="66" />
          <line x1="100" y1="4" x2="100" y2="196" />
          <line x1="4" y1="100" x2="196" y2="100" />
        </g>
        <path d="M38 78 Q100 18 162 70" fill="none" stroke="#f0a46e" strokeWidth=".6" strokeDasharray="2 3" />
      </svg>
      <div ref={refs?.sunrise} className="jb-sky-layer jb-sky-sunrise" />
      <div ref={refs?.day} className="jb-sky-layer jb-sky-day" />
      <div ref={refs?.dim} className="jb-sky-layer jb-sky-dim" />
    </div>
  );
}

export default memo(NightSky);
