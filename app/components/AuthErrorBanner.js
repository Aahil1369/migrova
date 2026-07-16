'use client';

import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function Banner() {
  const params = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const error = params.get('auth_error');
  if (!error || dismissed) return null;

  return (
    <div className="border-b border-accent/40 bg-paper-bg-alt px-6 sm:px-10 py-3">
      <div className="max-w-[1280px] mx-auto flex items-start justify-between gap-4">
        <div>
          <div className="font-mono text-[10px] tracking-[0.12em] text-accent mb-1">// SIGN-IN FAILED</div>
          <p className="text-[13px] text-paper-ink-dim leading-[1.5]">{error}</p>
        </div>
        <button
          onClick={() => setDismissed(true)}
          aria-label="Dismiss sign-in error"
          className="text-paper-ink-sub hover:text-accent transition-colors leading-none text-lg shrink-0"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

// useSearchParams needs a Suspense boundary in the App Router.
export default function AuthErrorBanner() {
  return (
    <Suspense fallback={null}>
      <Banner />
    </Suspense>
  );
}
