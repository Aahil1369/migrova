import Tag from './ui/Tag';
import { linkTypeMeta, domainOf, formatVerified } from '../lib/officialSources';

// Plain-English version of the verifier's evidence codes.
function describeEvidence(evidence = []) {
  return evidence.map((e) => {
    if (e === 'https') return 'secure connection';
    if (e === 'gov-domain') return 'government domain';
    if (e === 'content') return 'page matches the topic';
    if (e === 'wikidata') return 'listed in Wikidata';
    if (e.startsWith('linked-from:')) return `linked from ${domainOf(e.slice(12))}`;
    return e;
  }).join(' · ');
}

export default function SourceLinkCard({ type, link }) {
  const meta = linkTypeMeta(type);

  if (link?.status === 'verified') {
    return (
      <a href={link.url} target="_blank" rel="noopener noreferrer"
        className="group flex flex-col border border-paper-rule bg-paper-bg p-6 hover:bg-paper-bg-alt transition-colors">
        <div className="flex items-start justify-between gap-3 mb-5">
          <span className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub pt-1">{meta.label}</span>
          <Tag variant="outline" className="flex-shrink-0">Verified {formatVerified(link.verifiedAt)}</Tag>
        </div>
        <div className="font-display text-[26px] leading-[1.1] text-paper-ink break-words">{domainOf(link.url)}</div>
        <p className="mt-2 text-[13px] text-paper-ink-dim leading-[1.5]">{link.name}</p>
        <p className="mt-3 font-mono text-[10.5px] leading-[1.5] text-paper-ink-sub break-all">{link.url}</p>
        <p className="mt-4 font-mono text-[10px] tracking-[0.06em] uppercase text-[#5a7d3f]">✓ {describeEvidence(link.evidence)}</p>
        <span className="mt-auto pt-5 text-[13px] font-medium text-paper-ink group-hover:text-accent">Open official site ↗</span>
      </a>
    );
  }

  const note = link?.status === 'not_applicable'
    ? link.note
    : "Not verified yet — we couldn't confirm an official page. Check the web address carefully before you pay anything.";
  return (
    <div className="border border-dashed border-paper-rule p-6">
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase text-paper-ink-sub mb-5">
        {meta.label}{link?.status === 'not_applicable' ? ' — not applicable' : ''}
      </div>
      <p className="text-[13px] leading-[1.55] text-paper-ink-sub">{note}</p>
    </div>
  );
}
