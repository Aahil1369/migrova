import '../passport.css';

const LABEL = "Founder's route: Gilgit-Baltistan, then Kampala, then the USA: here, building this.";

// The drawing's coordinate space (the SVG viewBox); the HTML labels and pulse are placed in it too.
const VIEW_W = 320;
const VIEW_H = 100;

// The three legs (lime -> gold -> peach), drawn one after the other.
const LEGS = [
  { d: 'M272 30 Q238 34 182 70', color: '#b8cf5d' },
  { d: 'M182 70 Q132 6 96 28', color: '#d6b866' },
  { d: 'M96 28 Q62 30 52 54', color: '#f0a46e' },
];

// Place names at their SVG coordinates (x, baseline y); `start` = left-aligned, else centred.
const PLACES = [
  { text: 'Gilgit-Baltistan', x: 272, y: 16, stop: 0 },
  { text: 'Kampala', x: 182, y: 92, stop: 1 },
  { text: 'USA', x: 96, y: 14, stop: 2 },
  { text: 'here, building this', x: 8, y: 82, stop: 3, start: true, here: true },
];

// The final stop's pulsing ring: centre (52, 54), radius 12 + half its 1.4 stroke.
const PULSE = { x: 52, y: 54, r: 12.7 };

const pct = (n, of) => `${+((n / of) * 100).toFixed(4)}%`;
const PULSE_STYLE = {
  left: pct(PULSE.x - PULSE.r, VIEW_W),
  top: pct(PULSE.y - PULSE.r, VIEW_H),
  width: pct(2 * PULSE.r, VIEW_W),
  height: pct(2 * PULSE.r, VIEW_H),
};
const placeStyle = ({ x, y }) => ({ left: pct(x, VIEW_W), top: pct(y, VIEW_H) });

/**
 * The founder's route on the Observations page: Gilgit-Baltistan -> Kampala -> USA -> a dot
 * "here, building this". `animate` (Observations on screen): the legs draw in sequence with
 * stroke-dashoffset (0.8s each, 2.4s in all), each stop appears as its leg arrives and the final
 * dot pulses; turning it off resets instantly so the next arrival draws again. Reduced motion /
 * the stack layout: fully drawn, no pulse. One image to assistive tech.
 *
 * The place names and the pulse are HTML over the SVG, on the same 320 x 100 grid (the box keeps
 * that ratio; the names are sized in container units): SVG <text> is laid out again on every frame
 * an ancestor's transform changes (its font is scaled to the screen), which cost ~8ms a frame
 * while the book opened and closed over this page; and an SVG child's scale animation repaints,
 * where the HTML ring's runs on the compositor.
 */
export function FounderRoute({ animate = false, className = '' }) {
  return (
    <div
      className={`jb-founder${className ? ` ${className}` : ''}`}
      role="img"
      aria-label={LABEL}
      data-drawn={animate ? 'true' : 'false'}
    >
      <svg className="jb-founder-art" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} aria-hidden="true" focusable="false">
        <g fill="none" strokeWidth="2.4" strokeLinecap="round">
          {LEGS.map((leg, i) => (
            <path key={leg.d} className={`jb-founder-leg jb-founder-leg--${i + 1}`} d={leg.d} stroke={leg.color} pathLength="1" />
          ))}
        </g>
        <circle cx="272" cy="30" r="4.5" fill="#6b8a1e" />
        <circle className="jb-founder-stop jb-founder-stop--1" cx="182" cy="70" r="4.5" fill="#a88a3c" />
        <circle className="jb-founder-stop jb-founder-stop--2" cx="96" cy="28" r="4.5" fill="#b8642f" />
        <circle className="jb-founder-stop jb-founder-stop--3" cx="52" cy="54" r="6" fill="#a94a1f" />
      </svg>
      <span className="jb-founder-ring jb-founder-stop jb-founder-stop--3" style={PULSE_STYLE} aria-hidden="true">
        <span className="jb-founder-pulse" />
      </span>
      <span className="jb-founder-lbl" aria-hidden="true">
        {PLACES.map((place) => (
          <span
            key={place.text}
            className={[
              'jb-founder-place',
              place.start ? 'jb-founder-place--start' : '',
              place.here ? 'jb-founder-here' : '',
              place.stop ? `jb-founder-stop jb-founder-stop--${place.stop}` : '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={placeStyle(place)}
          >
            {place.text}
          </span>
        ))}
      </span>
    </div>
  );
}

export default FounderRoute;
