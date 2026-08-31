'use client';

import { useEffect, useState } from 'react';

/**
 * Sidebakgrunn for bloub-øyne (maskehull). Låst til produktets papir:
 * `#ffffff` lyst, `#000000` mørkt. Ikke en token-avledning — Mikael låste hex.
 */
export function useBloubPapir(): string {
  const [papir, setPapir] = useState('#ffffff');

  useEffect(() => {
    const les = () =>
      setPapir(document.documentElement.dataset.theme === 'dark' ? '#000000' : '#ffffff');
    les();
    const obs = new MutationObserver(les);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return papir;
}
