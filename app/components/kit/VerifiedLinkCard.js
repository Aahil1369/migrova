import './kit.css';

// '2026-09-27' -> 'Sep 27, 2026' (as the sources pages print it); any other string as given.
// Local rather than lib/officialSources' formatVerified, which would pull the whole sources
// table into the client bundle.
function verifiedDate(value) {
  const text = String(value ?? '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const date = new Date(`${text}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return text;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
}

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
  const date = isLink && verifiedAt ? verifiedDate(verifiedAt) : '';
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
        ✓ VERIFIED
      </span>
      <span className="sr-only"> (verified official site, opens in a new tab)</span>
    </a>
  );
}

export default VerifiedLinkCard;
