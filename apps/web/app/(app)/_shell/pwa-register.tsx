'use client';

import { useEffect } from 'react';

/**
 * F7-07 — Registrerer service-workeren (`/sw.js`) i nettleseren. Ren bieffekt,
 * ingen UI. Trygg for alle roller (PWA-en er installerbar for hele appen, men
 * start_url = /min-dag). Feiler stille hvis SW ikke støttes (eldre nettleser).
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const register = () => {
      navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {});
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);
  return null;
}
