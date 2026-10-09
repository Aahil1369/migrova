'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

const SESSION_KEY = 'om_session_id';
let memoryId = null; // when sessionStorage is blocked: one id per page load

function newId() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  } catch {
    /* insecure context */
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * The analytics session id. sessionStorage can throw (SecurityError when site storage or
 * cookies are blocked, Safari private mode quotas), and this runs on every page from the root
 * layout, so every access is guarded and an in-memory id is the fallback.
 */
function getSessionId() {
  try {
    const stored = window.sessionStorage.getItem(SESSION_KEY);
    if (stored) return stored;
    const id = newId();
    window.sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    memoryId ||= newId();
    return memoryId;
  }
}

export default function PingTracker() {
  const pathname = usePathname();

  useEffect(() => {
    const sessionId = getSessionId();
    fetch('/api/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, page: pathname }),
    }).catch(() => {});

    const interval = setInterval(() => {
      fetch('/api/ping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, page: pathname }),
      }).catch(() => {});
    }, 60000);

    return () => clearInterval(interval);
  }, [pathname]);

  return null;
}
