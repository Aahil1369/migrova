import './pages.css';

/** p1, inside the cover: what Migrova is. (Takes `active` like every page; static for now.) */
export default function Notice() {
  return (
    <section id="notice" aria-labelledby="notice-h" tabIndex={-1} className="jbp jbp-notice">
      <h2 id="notice-h" className="jbp-title">This passport opens every border&apos;s rules.</h2>
      <p className="jbp-text">
        Migrova explains visas, moving costs and the official sites for 195 countries — information you can
        check, not advice you have to trust.
      </p>
      <ul className="jbp-chips" aria-label="At a glance">
        <li>Free</li>
        <li>No sign-up</li>
        <li>Plain English</li>
      </ul>
      <div className="jbp-issued">
        <span className="jbp-label">ISSUED BY</span>
        <span className="jbp-wordmark">migrova</span>
        <span className="jbp-label">ISSUER CODE MGV · VALID FOR 195 COUNTRIES</span>
      </div>
    </section>
  );
}
