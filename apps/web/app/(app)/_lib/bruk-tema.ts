'use client';

import { useEffect, useState } from 'react';
import { lesTema, type Tema } from './tema';

/** Følger `data-theme` på html — Grainient og andre tema-avhengige flater. */
export function useTema(): Tema {
  const [tema, setTema] = useState<Tema>('light');

  useEffect(() => {
    setTema(lesTema());
    const rot = document.documentElement;
    const obs = new MutationObserver(() => setTema(lesTema()));
    obs.observe(rot, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  return tema;
}
