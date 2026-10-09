import '../passport.css';

const LABEL = "Founder's route: Gilgit-Baltistan, then Kampala, then the USA: here, building this.";

/**
 * The founder's route on the Observations page, drawn in foil: Gilgit-Baltistan -> Kampala ->
 * USA, ending at a dot "here, building this". Static SVG for now; `animate` (draw the legs one
 * by one) is accepted and ignored until the Step-2 animation task. One image to assistive tech.
 */
export function FounderRoute({ className = '' }) {
  return (
    <svg
      className={`jb-founder${className ? ` ${className}` : ''}`}
      viewBox="0 0 320 100"
      role="img"
      aria-label={LABEL}
      focusable="false"
    >
      <defs>
        <linearGradient id="jb-founder-foil" x1="0" x2="1">
          <stop offset="0" stopColor="#a88a3c" />
          <stop offset=".5" stopColor="#c9a94f" />
          <stop offset="1" stopColor="#8a6d1f" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#jb-founder-foil)" strokeWidth="2" strokeLinecap="round" strokeDasharray="5 5">
        <path d="M272 30 Q238 34 182 70" />
        <path d="M182 70 Q118 6 58 38" />
      </g>
      <circle cx="272" cy="30" r="4.5" fill="#7a5c12" />
      <circle cx="182" cy="70" r="4.5" fill="#7a5c12" />
      <circle cx="58" cy="38" r="12" fill="none" stroke="#a94a1f" strokeOpacity=".45" />
      <circle cx="58" cy="38" r="6" fill="#a94a1f" />
      <g className="jb-founder-lbl" aria-hidden="true">
        <text x="272" y="16" textAnchor="middle">Gilgit-Baltistan</text>
        <text x="182" y="92" textAnchor="middle">Kampala</text>
        <text x="58" y="20" textAnchor="middle">USA</text>
        <text x="58" y="66" textAnchor="middle" className="jb-founder-here">here, building this</text>
      </g>
    </svg>
  );
}

export default FounderRoute;
