import './kit.css';

/**
 * The paper card every tool-page block sits on: --page paper, 14px corners, a soft shadow
 * (server-safe, no hooks). `tone="visa"`: the issued-visa look, a faint green guilloche tint
 * and a holographic foil strip down the right edge (decorative, aria-hidden, static).
 * `as`: the element or component to render ('section' by default; 'div', 'article', 'li' …);
 * any other prop (id, aria-labelledby, style …) is passed through to it.
 */
export function PassportCard({ as: Tag = 'section', tone = 'page', className = '', children, ...rest }) {
  const visa = tone === 'visa';
  const cls = `kit-card${visa ? ' kit-card--visa' : ''}${className ? ` ${className}` : ''}`;
  return (
    <Tag className={cls} {...rest}>
      {visa ? <span className="kit-card-foil" aria-hidden="true" /> : null}
      {children}
    </Tag>
  );
}

export default PassportCard;
