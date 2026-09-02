'use client';

import { useEffect, useState } from 'react';

export type ViewportFlate = 'phone' | 'desktop' | null;

/**
 * md-bruddet (768px) som PhoneShell / sidebar allerede bruker.
 * `null` før matchMedia — ingen sidetreff, ingen tRPC mot lager/kunder.
 */
export function useMdViewport(): ViewportFlate {
  const [flate, setFlate] = useState<ViewportFlate>(null);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const oppdater = () => setFlate(mq.matches ? 'desktop' : 'phone');
    oppdater();
    mq.addEventListener('change', oppdater);
    return () => mq.removeEventListener('change', oppdater);
  }, []);

  return flate;
}
