import Guilloche from './Guilloche';
import '../passport.css';

/**
 * Rainbow hologram seal: a slowly turning conic-gradient ring around a paper disc that
 * carries `count` (big) and `label` as real text, e.g. count={418} label="VERIFIED LINKS".
 * Size it with `className` / `style` (default 38 page units).
 */
export function HologramSeal({ count, label, className = '', style }) {
  return (
    <span className={`jb-seal${className ? ` ${className}` : ''}`} style={style}>
      <span className="jb-seal-ring" aria-hidden="true" />
      <span className="jb-seal-core">
        <Guilloche variant="rosette" seed="seal" className="jb-seal-rosette" />
        <b>{count}</b>
        {label ? <span>{label}</span> : null}
      </span>
    </span>
  );
}

export default HologramSeal;
