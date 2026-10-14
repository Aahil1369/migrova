import './footnote.css';

/**
 * The page's closing footnote. `tone="paper"`: the passport tool pages' look (footnote.css), a
 * dashed rule over the ground with the mark (`number`) in terracotta, decorative and hidden from
 * screen readers. Otherwise the editorial look (lawyer, stories) until those pages are redone.
 */
export default function Footnote({ number = '*', tone, children, className = '' }) {
  if (tone === 'paper') {
    return (
      <p className={`paper-footnote${className ? ` ${className}` : ''}`}>
        <span className="paper-footnote-mark" aria-hidden="true">{number}</span>
        {children}
      </p>
    );
  }
  return (
    <p className={`mt-20 pt-8 border-t border-paper-rule font-display italic text-[15px] leading-[1.6] text-paper-ink-sub max-w-[58ch] ${className}`}>
      <sup className="text-accent not-italic mr-1">{number}</sup>
      {children}
    </p>
  );
}
