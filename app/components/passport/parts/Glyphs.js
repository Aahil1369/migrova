// Tiny inline icons for symbols that would otherwise need a system fallback font (✈ ✂ ✕).
// Emoji-capable characters make the browser load a large emoji/symbol font during the first
// layout, which delayed the homepage's first paint (LCP) by ~0.4s on the throttled profile;
// these draw the same marks with no font involved. Decorative: aria-hidden, sized 1em,
// coloured by currentColor.

const base = {
  viewBox: '0 0 24 24',
  width: '1em',
  height: '1em',
  'aria-hidden': 'true',
  focusable: 'false',
};

/** ✈, pointing right. */
export function PlaneGlyph({ className = '' }) {
  return (
    <svg {...base} className={`jb-glyph${className ? ` ${className}` : ''}`}>
      <path
        fill="currentColor"
        d="M22 12c0-.8-.7-1.4-1.6-1.4H15L10.6 3H8.8l2.3 7.6H6.2L4.6 8.4H3l.9 3.6L3 15.6h1.6l1.6-2.2h4.9L8.8 21h1.8l4.4-7.6h5.4c.9 0 1.6-.6 1.6-1.4z"
      />
    </svg>
  );
}

/** ✂ */
export function ScissorsGlyph({ className = '' }) {
  return (
    <svg {...base} className={`jb-glyph${className ? ` ${className}` : ''}`}>
      <g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="6" cy="6" r="3" />
        <circle cx="6" cy="18" r="3" />
        <path d="M8.6 7.6 20 18M8.6 16.4 20 6" />
      </g>
    </svg>
  );
}

/** ✕ */
export function CrossGlyph({ className = '' }) {
  return (
    <svg {...base} className={`jb-glyph${className ? ` ${className}` : ''}`}>
      <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
