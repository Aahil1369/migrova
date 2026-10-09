import Link from 'next/link';
import Guilloche from './Guilloche';
import '../passport.css';

/**
 * A stick-on visa vignette for one tool. The whole vignette is the link (>= 48px tall).
 * `type`: 'M-MATCH' | 'V-VISA' | 'R-RELOCATE' | 'L-COUNSEL' | 'S-SOURCES' (sets the tint).
 * `applied` false -> lifted 4deg off the page with a deep shadow; true (default) -> stuck
 * flat (450ms). Reduced motion, lite and the stack layout show it flat with no motion.
 * The visible type label, rosette, watermark letter and MRZ footer are decorative
 * (aria-hidden), so the link's accessible name is "title, desc".
 */
export function Vignette({ type = 'V-VISA', title, desc, href, mrz, applied = true }) {
  const letter = String(type).charAt(0);
  return (
    <Link href={href} className="jb-vignette" data-type={type} data-applied={applied ? 'true' : 'false'}>
      <span className="jb-vignette-shadow" aria-hidden="true" />
      <span className="jb-vignette-card">
        <Guilloche variant="rosette" seed={type} className="jb-vignette-rosette" />
        <span className="jb-vignette-letter" aria-hidden="true">{letter}</span>
        <span className="jb-vignette-type" aria-hidden="true">
          VISA TYPE <b>{type}</b>
        </span>
        <span className="jb-vignette-go" aria-hidden="true">OPEN →</span>
        <span className="jb-vignette-title">{title}</span>
        {desc ? <span className="jb-vignette-desc">{desc}</span> : null}
        {mrz ? <span className="jb-vignette-mrz" aria-hidden="true">{mrz}</span> : null}
        <span className="jb-vignette-holo" aria-hidden="true"><span /></span>
      </span>
    </Link>
  );
}

export default Vignette;
