import Link from 'next/link';

export default function DisclaimerBlock() {
  return (
    <div className="border border-accent/40 bg-paper-bg-alt px-5 py-4 mb-8 max-w-[760px]">
      <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-1.5">// GENERAL INFORMATION — NOT LEGAL ADVICE</div>
      <p className="text-[12px] text-paper-ink-dim leading-[1.5]">
        Migrova provides general information about immigration processes. It is not legal advice, and using it
        creates no attorney–client relationship. Rules change often — for advice about your situation, consult a
        licensed immigration attorney. <Link href="/legal" className="underline hover:text-accent">Full disclaimer</Link>.
      </p>
    </div>
  );
}
