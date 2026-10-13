import './kit.css';

/**
 * A toggle chip (purpose, region, case type …): a real button that reports its state.
 * `disabled` rests it with aria-disabled, not the native attribute: native `disabled` blurs the
 * focused chip (keyboard focus falls to <body>), so a resting chip stays focusable and ignores taps.
 */
export default function Chip({ pressed = false, onClick, children, disabled = false }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      aria-disabled={disabled || undefined}
      className="kit-chip"
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </button>
  );
}
