import Vignette from '../parts/Vignette';
import './pages.css';

/** p3: the tools intro + Country Match and Visa Intelligence vignettes (applied on arrival). */
export default function VisasOne({ active = false }) {
  return (
    <section id="visas1" aria-labelledby="visas1-h" tabIndex={-1} className="jbp jbp-visas">
      <h2 id="visas1-h" className="jbp-title">Five free tools for the whole move.</h2>
      <p className="jbp-text">Each visa here is a tool. Open one to start.</p>
      <div className="jbp-vignettes">
        <Vignette
          type="M-MATCH"
          title="Country Match"
          desc="Your top 5 countries, ranked."
          href="/match"
          mrz="M<MGV<<COUNTRY<MATCH<<TOP<5<<<<<<"
          applied={active}
        />
        <Vignette
          type="V-VISA"
          title="Visa Intelligence"
          desc="Checklists, timelines, tips."
          href="/visa"
          mrz="V<MGV<<VISA<INTELLIGENCE<<<<<<<<"
          applied={active}
        />
      </div>
    </section>
  );
}
