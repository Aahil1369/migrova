export default function Wordmark({ className = '' }) {
  return (
    <span className={`inline-flex items-center gap-2 font-sans font-extrabold leading-none tracking-[-0.02em] ${className}`}>
      <span
        aria-hidden="true"
        className="block h-[18px] w-[18px] shrink-0 rounded-[6px]"
        style={{ background: 'linear-gradient(135deg, var(--lime), #e8734a)' }}
      />
      migrova
    </span>
  );
}
