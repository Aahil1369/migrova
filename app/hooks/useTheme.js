'use client';
import { useState } from 'react';

// localStorage can throw when site storage is blocked: fall back to the default theme and
// simply don't remember the choice.
export function useTheme() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      const saved = window.localStorage.getItem('opportumap_theme');
      return saved !== null ? saved === 'dark' : true;
    } catch {
      return true;
    }
  });
  const toggleDark = () => {
    setDark((d) => {
      const next = !d;
      try {
        window.localStorage.setItem('opportumap_theme', next ? 'dark' : 'light');
      } catch {
        /* storage blocked: the choice lasts for this page only */
      }
      return next;
    });
  };
  return { dark, toggleDark };
}
