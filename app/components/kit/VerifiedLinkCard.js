// sourcesFormat, not lib/officialSources: same helper, without the 195-country table.
import { formatVerified } from '../../lib/sourcesFormat.js';
import { CheckGlyph } from './Glyphs';
import './kit.css';

const UNVERIFIED_NOTE = 'Not verified yet. Check the web address carefully before you pay anything.';

/**
 * An official link (server-safe). Verified, with an `href`: a real link that opens in a new
 * tab, with `title`, `domain`, an optional `note` and "Verified <date>" (`verifiedAt`, e.g.
 * '2026-09-27') as text, and a green VERIFIED seal that is decorative (aria-hidden; screen
 * readers hear "(verified official site, opens in a new tab)" instead).
 * `verified={false}` (or no `href`): a dashed card that is not a link, with the same text (an
 * unverified card without a `note` asks people to check the address).
 */
export function VerifiedLinkCard({ href, title, domain, note, verifiedAt, verified = true }) {
  const isLink = verified && Boolean(href);
  const date = isLink && verifiedAt ? formatVerified(verifiedAt) : '';
  const shownNote = note || (verified ? '' : UNVERIFIED_NOTE);
  const text = (
    <span className="kit-vlink-text">
      {title ? <span className="kit-vlink-title">{title}</span> : null}
      {domain ? <span className="kit-vlink-domain">{domain}</span> : null}
      {shownNote ? <span className="kit-vlink-note">{shownNote}</span> : null}
      {date ? <span className="kit-vlink-date">Verified {date}</span> : null}
    </span>
  );

  if (!isLink) {
    return <div className="kit-vlink kit-vlink--unverified">{text}</div>;
  }
  return (
    <a className="kit-vlink" href={href} target="_blank" rel="noopener noreferrer">
      {text}
      <span className="kit-vlink-seal" aria-hidden="true">
        <CheckGlyph /> VERIFIED
      </span>
      <span className="sr-only"> (verified official site, opens in a new tab)</span>
    </a>
  );
}

export default VerifiedLinkCard;
