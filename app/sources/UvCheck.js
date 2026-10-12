'use client';

import { useRef } from 'react';
import { useInView } from '../components/kit/useInView';
import { CheckGlyph, CrossGlyph } from '../components/kit/Glyphs';

// A card's lamp passes once it is mostly on screen (its top above the bottom quarter of the view).
const LAMP_IN_VIEW = { rootMargin: '0px 0px -25% 0px' };

// Without JavaScript the lamp never runs: show the verdicts as they are.
const NO_SCRIPT_CSS = '.uv-card .uv-band,.uv-card .uv-band-in{transform:none}';

function LockIcon() {
  return (
    <svg className="uv-lock" viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <rect x="3" y="7" width="10" height="7" rx="1.5" fill="currentColor" />
      <path d="M5.5 7V5a2.5 2.5 0 0 1 5 0v2" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/**
 * One site under the UV lamp: the face (site name, address), its mark, and a strip of "UV ink"
 * holding the verdict. When the card scrolls into view the lamp (a violet beam) sweeps across it
 * once and wipes the verdict in (transform only, inside the card's overflow: hidden); reduced
 * motion shows the verdict at once (sources.css). The verdict is always in the DOM, so screen
 * readers get it whatever the lamp is doing. `href`: the card is a real link (the real site);
 * without it, plain text that is never a link (the fake example).
 */
function UvCard({ kind, href, mark, title, domain, verdict }) {
  const ref = useRef(null);
  const lit = useInView(ref, LAMP_IN_VIEW);
  const body = (
    <>
      {mark}
      <span className="uv-face">
        <span className="uv-title">{title}</span>
        <span className="uv-domain">
          <LockIcon />
          {domain}
        </span>
      </span>
      <span className="uv-strip">
        <span className="uv-band">
          <span className="uv-band-in">
            <span className="uv-verdict">{verdict}</span>
          </span>
        </span>
      </span>
      <span className="uv-beam" aria-hidden="true" />
    </>
  );
  const props = { ref, className: `uv-card uv-card--${kind}`, 'data-lit': lit ? 'true' : 'false' };
  if (!href) return <div {...props}>{body}</div>;
  return (
    <a {...props} href={href} target="_blank" rel="noopener noreferrer">
      {body}
      <span className="sr-only"> (official site, opens in a new tab)</span>
    </a>
  );
}

/**
 * The UV check (the signature moment of /sources/[code]): the country's real official site (a
 * verified link) beside an invented look-alike (`fake.domain` from fakeDomain(), a reserved
 * .example name shown as plain text, never a link). `real` = { url, domain, title } or null, when
 * nothing is verified: then only the fake example shows, under "No verified official site yet".
 * Both come from uvPair() on the server; this component never sees the sources table.
 */
export default function UvCheck({ real, fake, name }) {
  return (
    <div className="uv">
      <noscript>
        <style>{NO_SCRIPT_CSS}</style>
      </noscript>
      {real ? null : (
        <p className="uv-none">
          <strong>No verified official site yet.</strong> We couldn&apos;t confirm an official government site for {name},
          so there is nothing real to compare. Be extra careful with any site that asks for visa fees.
        </p>
      )}
      <div className="uv-cards">
        {real ? (
          <UvCard
            kind="real"
            href={real.url}
            mark={<span className="uv-mark uv-mark--ok" aria-hidden="true">VERIFIED</span>}
            title={real.title}
            domain={real.domain}
            verdict={<><CheckGlyph /> REAL · OFFICIAL GOVERNMENT SITE</>}
          />
        ) : null}
        <UvCard
          kind="fake"
          mark={<span className="uv-mark uv-mark--fake">FAKE EXAMPLE</span>}
          title={`${name} Visa Online Services`}
          domain={fake.domain}
          verdict={<><CrossGlyph /> NOT OFFICIAL · CHARGES EXTRA FEES</>}
        />
      </div>
    </div>
  );
}
