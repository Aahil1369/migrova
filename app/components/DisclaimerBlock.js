import Link from 'next/link';

/**
 * The "general information, not legal advice" notice every AI result carries.
 * `tone="paper"`: the passport-site look (a dashed paper note with 16px text) for redesigned tool
 * pages; the default keeps the old look for the pages not redesigned yet.
 */
export default function DisclaimerBlock({ tone }) {
  const text = (
    <>
      Migrova provides general information about immigration processes. It is not legal advice, and using it
      creates no attorney–client relationship. Rules change often — for advice about your situation, consult a
      licensed immigration attorney.{' '}
    </>
  );

  if (tone === 'paper') {
    return (
      <aside aria-label="Disclaimer" className="rounded-[14px] border-[1.5px] border-dashed border-page-ink/30 bg-page px-[18px] py-4 text-page-ink">
        <p className="m-0 mb-1.5 font-mono text-[12px] font-medium uppercase tracking-[0.12em] text-[#a94a1f]">
          General information · not legal advice
        </p>
        <p className="m-0 text-[16px] leading-[1.55] text-paper-ink-dim">
          {text}
          <Link href="/legal" className="font-bold text-page-ink underline underline-offset-2">Full disclaimer</Link>.
        </p>
      </aside>
    );
  }

  return (
    <div className="border border-accent/40 bg-paper-bg-alt px-5 py-4 mb-8 max-w-[760px]">
      <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-1.5">{'// GENERAL INFORMATION — NOT LEGAL ADVICE'}</div>
      <p className="text-[12px] text-paper-ink-dim leading-[1.5]">
        {text}
        <Link href="/legal" className="underline hover:text-accent">Full disclaimer</Link>.
      </p>
    </div>
  );
}
