import './kit.css';

/** A toggle chip (purpose, region, case type …): a real button that reports its state. */
export default function Chip({ pressed = false, onClick, children, disabled = false }) {
  return (
    <button type="button" aria-pressed={pressed} className="kit-chip" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  );
}
