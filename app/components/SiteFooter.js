import Link from 'next/link';
import Wordmark from './Wordmark';
import { TOOL_LINKS } from '../lib/siteLinks';

const COMPANY_LINKS = [
  { href: '/stories', label: 'Stories' },
  { href: '/contact', label: 'Contact' },
  { href: '/legal',   label: 'Legal' },
];

const linkClass = 'inline-block py-1.5 text-[15px] text-[rgba(236,230,210,.78)] transition-colors hover:text-lime';
const headingClass = 'mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[rgba(236,230,210,.6)]';

export default function SiteFooter() {
  return (
    <footer className="w-full bg-night-1 text-[#ece6d2]">
      <div className="mx-auto max-w-[1280px] px-6 py-12 sm:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <Link href="/" className="inline-block text-[#ece6d2] transition-colors hover:text-lime">
              <Wordmark className="text-[24px]" />
            </Link>
            <p className="mt-4 max-w-[340px] text-[15px] leading-[1.6] text-[rgba(236,230,210,.78)]">
              Visas, relocation and legal guidance for immigrant families &mdash; in plain English, with official sources.
            </p>
            <p className="mt-4 text-[15px] text-[rgba(236,230,210,.78)]">
              A sibling of{' '}
              <a
                href="https://opportumap.netlify.app"
                rel="noopener"
                className="underline decoration-[rgba(236,230,210,.4)] underline-offset-4 transition-colors hover:text-lime"
              >
                OpportuMap
              </a>
            </p>
          </div>

          <nav aria-labelledby="footer-tools-heading">
            <p id="footer-tools-heading" className={headingClass}>Tools</p>
            <ul>
              {TOOL_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav aria-labelledby="footer-company-heading">
            <p id="footer-company-heading" className={headingClass}>Migrova</p>
            <ul>
              {COMPANY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className={linkClass}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-[color:rgba(236,230,210,.1)] pt-6">
          <p className="max-w-[760px] text-[13px] leading-[1.6] text-[rgba(236,230,210,.72)]">
            Migrova provides general information, not legal advice. For advice about your situation, consult a
            licensed immigration attorney.{' '}
            <Link href="/legal" className="underline underline-offset-2 hover:text-lime">Full disclaimer</Link>.
          </p>
          <p className="text-[12px] text-[rgba(236,230,210,.6)]">&copy; Migrova 2026</p>
        </div>
      </div>
    </footer>
  );
}
