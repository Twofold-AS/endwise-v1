'use client';

import { useEffect, useState } from 'react';

/**
 * F7-07 — Er enheten på nett? Mekanikeren mister ofte dekning i verkstedet, så
 * flatene trenger en tydelig offline-tilstand. Bruker `navigator.onLine` +
 * online/offline-eventene. SSR-trygt (antar online til hydrering).
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const set = () => setOnline(navigator.onLine);
    set();
    window.addEventListener('online', set);
    window.addEventListener('offline', set);
    return () => {
      window.removeEventListener('online', set);
      window.removeEventListener('offline', set);
    };
  }, []);
  return online;
}
