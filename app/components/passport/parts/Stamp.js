import '../passport.css';

// Outline polygons in a 100x100 box (stretched to the stamp): outer ring + inner ring.
const OUTLINES = {
  triangle: ['50,3 97,97 3,97', '50,15 87,91 13,91'],
  hexagon: ['25,3 75,3 97,50 75,97 25,97 3,50', '29,10 71,10 89,50 71,90 29,90 11,50'],
};

const DEFAULT_ROTATE = { circle: -10, rect: 4, triangle: -4, hexagon: 7 };

/**
 * A rubber entry stamp. `shape`: 'circle' | 'rect' | 'triangle' | 'hexagon'; `color`: ink
 * colour; `lines`: [small top, BIG middle, small bottom, ...more small lines].
 * `applied` false -> invisible, scaled 2.2x; true (default) -> thunks down to 1x (320ms,
 * overshoot) with a short ink bleed. Reduced motion / stack show the final state; lite shows
 * it without the thunk. Optional `rotate` (deg), `className`, `style` (size/position).
 * The text is real text; the outline SVG is decorative.
 */
export function Stamp({ shape = 'circle', color = '#2f8a5a', lines = [], applied = true, rotate, className = '', style }) {
  const kind = DEFAULT_ROTATE[shape] === undefined ? 'circle' : shape;
  const [top, big, bottom, ...rest] = lines;
  const outline = OUTLINES[kind];
  return (
    <span
      className={`jb-stamp jb-stamp--${kind}${className ? ` ${className}` : ''}`}
      data-applied={applied ? 'true' : 'false'}
      style={{ '--c': color, '--r': `${rotate ?? DEFAULT_ROTATE[kind]}deg`, ...style }}
    >
      {outline ? (
        <svg className="jb-stamp-outline" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polygon className="o" points={outline[0]} vectorEffect="non-scaling-stroke" />
          <polygon className="i" points={outline[1]} vectorEffect="non-scaling-stroke" />
        </svg>
      ) : null}
      <span className="jb-stamp-text">
        {top ? <small>{top}</small> : null}
        {big ? <b>{big}</b> : null}
        {bottom ? <small>{bottom}</small> : null}
        {rest.map((line, i) => (line ? <small key={i}>{line}</small> : null))}
      </span>
    </span>
  );
}

export default Stamp;
