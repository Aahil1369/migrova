import Link from 'next/link';

export default function LegalFooter() {
  return (
    <div className="border-t border-paper-rule px-6 sm:px-10 py-4 max-w-[1280px] mx-auto">
      <p className="text-[11px] text-paper-ink-sub leading-[1.5]">
        Migrova provides general information, not legal advice. For advice about your situation, consult a
        licensed immigration attorney. <Link href="/legal" className="underline hover:text-accent">Full disclaimer</Link>.
      </p>
    </div>
  );
}
