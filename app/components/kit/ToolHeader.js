import RouteMrz from '../RouteMrz';
import './kit.css';

/**
 * A tool page's header, for ToolShell's night band: the mono kicker `${code} · ${name}`, the
 * Inter 800 headline with one lime -> peach gradient word (`accent`, like the homepage
 * "made simple."), the sub line, and the saved route as a decorative MRZ line (RouteMrz). The
 * route pill itself stays in the night navbar.
 */
export default function ToolHeader({ code, name, title, accent, tail = '', sub }) {
  return (
    <>
      <p className="kit-kicker">{`${code} · ${name}`}</p>
      <h1 className="kit-h1">
        {title} <span className="kit-accent">{accent}</span>{tail}
      </h1>
      {sub && <p className="kit-sub">{sub}</p>}
      <RouteMrz code={code} />
    </>
  );
}
