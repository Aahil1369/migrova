import ToolShell from './components/kit/ToolShell';
import ToolHeader from './components/kit/ToolHeader';
import PassportCard from './components/kit/PassportCard';
import Btn from './components/ui/Btn';

export const metadata = {
  title: 'Page not found — Migrova',
};

// The 404 for unknown addresses and notFound() (e.g. /sources/zz): the passport shell and header,
// then two ways back.
export default function NotFound() {
  return (
    <ToolShell
      header={
        <ToolHeader
          code="X-404"
          name="PAGE NOT FOUND"
          title="This page isn't in your"
          accent="passport."
          sub="The address may be mistyped, or the page has moved."
        />
      }
    >
      <PassportCard className="flex flex-col gap-4" aria-labelledby="nf-h">
        <h2 id="nf-h" className="m-0 text-[22px] font-extrabold leading-[1.2] tracking-[-0.01em] text-page-ink">
          Where to next?
        </h2>
        <p className="m-0 text-[16px] leading-[1.55] text-paper-ink-dim">
          Start again from the homepage, or look up a country&apos;s official government sites.
        </p>
        <div className="flex flex-wrap gap-3">
          <Btn href="/" variant="primary">Back to the homepage</Btn>
          <Btn href="/sources" variant="secondary">Official sources</Btn>
        </div>
      </PassportCard>
    </ToolShell>
  );
}
