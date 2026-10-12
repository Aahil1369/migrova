import Navbar from '../Navbar';
import { starField } from './starField';
import './kit.css';

// 40 static stars for the header band (deterministic, so server and client render the same SVG).
const STARS = starField(40, 1)[0];

/**
 * The frame of a tool page (server-safe, no hooks): the night navbar, the night -> dawn header
 * band (static stars + a soft glow, no scroll engine) holding `header` (a ToolHeader), then the
 * warm --ground paper holding `children`. Both sit in one column: 720px, or 1120px when `wide`,
 * with 16px side gutters on phones (kit.css .kit-wrap).
 */
export default function ToolShell({ header, children, wide = false }) {
  const wrap = wide ? 'kit-wrap kit-wrap--wide' : 'kit-wrap';
  return (
    <div className="kit-shell">
      <Navbar tone="night" />
      <main className="kit-main">
        <div className="kit-sky">
          <svg className="kit-stars" aria-hidden="true" focusable="false">
            {STARS.map((s, i) => (
              <circle key={i} cx={`${s.x}%`} cy={`${s.y}%`} r={s.r} />
            ))}
          </svg>
          <div className={wrap}>{header}</div>
        </div>
        <div className="kit-ground">
          <div className={wrap}>{children}</div>
        </div>
      </main>
    </div>
  );
}
