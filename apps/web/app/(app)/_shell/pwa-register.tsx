'use client';

import { useEffect } from 'react';

/**
 * Registrerer service-workeren (`/sw.js`). Ren bieffekt, ingen UI.
 * ikke I utvikling , og den rydder opp etter seg.
 * Sw-en registreres med `scope: '/'` — altså hele origin. Den rendres riktignok
 * bare i `MobileShell` (mekanikerflaten), men når den først er registrert,
 * kontrollerer den hver side i appen, for alltid, uansett hvem som er logget
 * inn. Det er slik en admin som aldri ser mekanikerflaten likevel fikk sidene
 * sine servert gjennom sw-cachen.
 * I dev betydde det at `/_next/static/`-chunks ble servert fra cache med
 * cache-first-strategi. En hard refresh omgår HTTP-cachen, men **ikke** en
 * service worker — så gammel kode overlevde både `.next`-sletting,
 * server-restart og Ctrl+Shift+R. Det er hele forklaringen på
 * «module factory is not available» og `fill-rule`-advarslene som kom tilbake
 * uansett hva vi ryddet på serversiden.
 * Offline-støtte er en **produksjonsfunksjon**. I dev er den kun en måte å
 * servere gammel kode på, så her avregistrerer vi i stedet — og sletter
 * `endwise-*`-cachene, slik at maskiner som allerede har sw-en installert leger
 * seg selv ved første sidelast. Uten den oppryddingen ville en utvikler måttet
 * gå inn i DevTools › Application › Service Workers og gjøre det for hånd.
 */
export function PwaRegister() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    if (process.env.NODE_ENV !== 'production') {
      // Selvhelbredende opprydding — ikke bare «la være å registrere».
      void (async () => {
        try {
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister()));
          if ('caches' in window) {
            const navn = await caches.keys();
            await Promise.all(
              navn.filter((n) => n.startsWith('endwise-')).map((n) => caches.delete(n)),
            );
          }
        } catch {
          // Stille: dette er opprydding, ikke en funksjon brukeren venter på.
        }
      })();
      return;
    }

    const register = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .catch(() => {});
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { once: true });
  }, []);

  return null;
}
