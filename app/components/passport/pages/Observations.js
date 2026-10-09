import FounderRoute from '../parts/FounderRoute';
import './pages.css';

/**
 * p8, Observations (the static base page): the founder's note, his route
 * (Gilgit-Baltistan → Kampala → USA, "here, building this"; it draws leg by leg each time the
 * page comes on screen, fully drawn under reduced motion) and the endorsement box.
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
      {/* Phones: the drawing's place labels would be ~7px, so a readable caption replaces them
          (the drawing already carries the same words as its accessible name). */}
      <p className="jbp-founder-caption" aria-hidden="true">
        Gilgit-Baltistan → Kampala → USA — <span>here, building this</span>
      </p>
      <p className="jbp-endorse">
        <small aria-hidden="true">ENDORSEMENT</small>
        INFORMATION, NOT LEGAL ADVICE. ALWAYS CONFIRM ON THE OFFICIAL SITE.
      </p>
    </section>
  );
}
