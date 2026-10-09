'use client';

import './passport.css';

// Deterministic star field (no Math.random: server and client must render the same HTML).
const STARS = Array.from({ length: 64 }, (_, i) => ({
  left: `${((i * 37.7) % 100).toFixed(2)}%`,
  top: `${((i * 61.3) % 100).toFixed(2)}%`,
  delay: `${((i % 7) * 0.6).toFixed(1)}s`,
  big: i % 5 === 0,
}));

/**
 * The sky behind the Journey Book: four full-size gradient layers (night, predawn, sunrise,
 * day), sparse twinkling stars and a faint slowly turning line globe, plus a `dim` overlay
 * for the UV-check beat. Fills its positioned parent (position:absolute; inset:0).
 *
 * Stacking, bottom -> top: night, predawn, [stars, globe], sunrise, day, dim. Every layer is
 * opaque, so fade the upper ones in over night (see skyLayers() in stageStyle.js).
 * Defaults: night opacity 1, the rest 0. PassportStage writes `style.opacity` to
 * refs { night, predawn, sunrise, day, dim }; dim at 1 is the full UV darkness.
 * `className`: e.g. 'jb-sky--still' stops the star/globe animations (lite mode);
 * prefers-reduced-motion stops them anyway.
 */
export default function NightSky({ refs, className = '' }) {
  return (
    <div className={`jb-sky${className ? ` ${className}` : ''}`} aria-hidden="true">
      <div ref={refs?.night} className="jb-sky-layer jb-sky-night" />
      <div ref={refs?.predawn} className="jb-sky-layer jb-sky-predawn" />
      <div className="jb-stars">
        {STARS.map((s, i) => (
          <i
            key={i}
            className={`jb-star${s.big ? ' jb-star--big' : ''}`}
            style={{ left: s.left, top: s.top, animationDelay: s.delay }}
          />
        ))}
      </div>
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
