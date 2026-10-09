import FounderRoute from '../parts/FounderRoute';
import './pages.css';

/**
 * p8, Observations (the static base page): the founder's note, his route
 * (Gilgit-Baltistan → Kampala → USA, "here, building this") and the endorsement box.
 */
export default function Observations({ active = false, note = '' }) {
  return (
    <section id="observations" aria-labelledby="observations-h" tabIndex={-1} className="jbp jbp-observations">
      <h2 id="observations-h" className="jbp-title jbp-title--sm">Why this book exists</h2>
      {note ? (
        <blockquote className="jbp-note">
          <p>{note}</p>
          <footer className="jbp-label">— AAHIL, FOUNDER</footer>
        </blockquote>
      ) : null}
      <FounderRoute animate={active} className="jbp-founder-route" />
      <p className="jbp-endorse">
        <small aria-hidden="true">ENDORSEMENT</small>
        INFORMATION, NOT LEGAL ADVICE. ALWAYS CONFIRM ON THE OFFICIAL SITE.
      </p>
    </section>
  );
}
