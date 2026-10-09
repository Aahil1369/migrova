import '../passport.css';

const LABEL = "Founder's route: Gilgit-Baltistan, then Kampala, then the USA: here, building this.";

// The three legs (lime -> gold -> peach), drawn one after the other.
const LEGS = [
  { d: 'M272 30 Q238 34 182 70', color: '#b8cf5d' },
  { d: 'M182 70 Q132 6 96 28', color: '#d6b866' },
  { d: 'M96 28 Q62 30 52 54', color: '#f0a46e' },
];

/**
 * The founder's route on the Observations page: Gilgit-Baltistan -> Kampala -> USA -> a dot
 * "here, building this". `animate` (Observations on screen): the legs draw in sequence with
 * stroke-dashoffset (0.8s each, 2.4s in all), each stop appears as its leg arrives and the final
 * dot pulses; turning it off resets instantly so the next arrival draws again. Reduced motion /
 * the stack layout: fully drawn, no pulse. One image to assistive tech.
 */
export function FounderRoute({ animate = false, className = '' }) {
  return (
    <svg
      className={`jb-founder${className ? ` ${className}` : ''}`}
      viewBox="0 0 320 100"
      role="img"
      aria-label={LABEL}
      focusable="false"
      data-drawn={animate ? 'true' : 'false'}
    >
      <g fill="none" strokeWidth="2.4" strokeLinecap="round">
        {LEGS.map((leg, i) => (
          <path key={leg.d} className={`jb-founder-leg jb-founder-leg--${i + 1}`} d={leg.d} stroke={leg.color} pathLength="1" />
        ))}
      </g>
      <circle cx="272" cy="30" r="4.5" fill="#6b8a1e" />
      <g className="jb-founder-stop jb-founder-stop--1">
        <circle cx="182" cy="70" r="4.5" fill="#a88a3c" />
      </g>
      <g className="jb-founder-stop jb-founder-stop--2">
        <circle cx="96" cy="28" r="4.5" fill="#b8642f" />
      </g>
      <g className="jb-founder-stop jb-founder-stop--3">
        <circle className="jb-founder-pulse" cx="52" cy="54" r="12" fill="none" stroke="#a94a1f" strokeWidth="1.4" />
        <circle cx="52" cy="54" r="6" fill="#a94a1f" />
      </g>
      <g className="jb-founder-lbl" aria-hidden="true">
        <text x="272" y="16" textAnchor="middle">Gilgit-Baltistan</text>
        <text x="182" y="92" textAnchor="middle" className="jb-founder-stop jb-founder-stop--1">
          Kampala
        </text>
        <text x="96" y="14" textAnchor="middle" className="jb-founder-stop jb-founder-stop--2">
          USA
        </text>
        <text x="8" y="82" className="jb-founder-here jb-founder-stop jb-founder-stop--3">
          here, building this
        </text>
      </g>
    </svg>
  );
}

export default FounderRoute;
