'use client';

const KEY = 'migrova_legal_ack';

export function hasLegalAck() {
  try { return !!localStorage.getItem(KEY); } catch { return false; }
}

export function storeLegalAck() {
  const ts = new Date().toISOString();
  try { localStorage.setItem(KEY, ts); } catch {}
  // Best-effort merge into the signed-in user's profile; ignore failures.
  fetch('/api/user-profile')
    .then((r) => r.json())
    .then((d) => {
      if (d.profile) {
        fetch('/api/user-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ profile: { ...d.profile, legal_ack: ts } }),
        });
      }
    })
    .catch(() => {});
}

export default function LegalAckModal({ open, onAccept, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-paper-bg border border-paper-rule max-w-[480px] w-full p-8">
        <div className="font-mono text-[10px] tracking-[0.12em] text-paper-ink-sub mb-4">// BEFORE YOU CONTINUE</div>
        <h2 className="font-display text-[26px] leading-[1.15] mb-4">Information, not legal advice.</h2>
        <p className="text-[13px] text-paper-ink-dim leading-[1.55] mb-6">
          Migrova gives general information about visas and immigration processes. It is not legal advice, it may
          be incomplete or out of date, and no attorney–client relationship is created. For decisions about your
          situation, consult a licensed immigration attorney.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => { storeLegalAck(); onAccept(); }}
            className="px-[22px] py-3 bg-paper-ink text-paper-bg text-[13px] font-medium hover:bg-[#2a3a2f] transition-colors">
            I understand — continue
          </button>
          <button onClick={onClose}
            className="px-[22px] py-3 border border-paper-rule text-paper-ink text-[13px] font-medium hover:bg-paper-bg-alt transition-colors">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
