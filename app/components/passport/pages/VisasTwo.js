import Vignette from '../parts/Vignette';
import './pages.css';

/** p4: Relocation, Lawyer Guide and Official Sources vignettes (applied on arrival). */
export default function VisasTwo({ active = false }) {
  return (
    <section id="visas2" aria-labelledby="visas2-h" tabIndex={-1} className="jbp jbp-visas">
      <h2 id="visas2-h" className="jbp-title jbp-title--sm">Three more for the rest of the move.</h2>
      <div className="jbp-vignettes">
        <Vignette
          type="R-RELOCATE"
          title="Relocation Guide"
          desc="Rent, banks, SIM, first weeks."
          href="/relocate"
          mrz="R<MGV<<RELOCATION<GUIDE<<<<<<<<<"
          applied={active}
        />
        <Vignette
          type="L-COUNSEL"
          title="Lawyer Guide"
          desc="Fees, red flags, free legal aid."
          href="/lawyer"
          mrz="L<MGV<<LAWYER<GUIDE<<<<<<<<<<<<<"
          applied={active}
        />
        <Vignette
          type="S-SOURCES"
          title="Official Sources"
          desc="Real government sites only."
          href="/sources"
          mrz="S<MGV<<OFFICIAL<SOURCES<<195<<<<"
          applied={active}
        />
      </div>
    </section>
  );
}
