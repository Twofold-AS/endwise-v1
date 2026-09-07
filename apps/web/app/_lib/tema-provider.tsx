'use client';

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  lesTema,
  losTema,
  type LosTema,
  settTema,
  skrivTemaPaRot,
  type Tema,
} from '../(app)/_lib/tema';

type TemaContext = {
  valg: Tema;
  los: LosTema;
  sett: (t: Tema) => void;
  veksle: () => void;
};

const Ctx = createContext<TemaContext | null>(null);

export function TemaProvider({ children }: { children: ReactNode }) {
  const [valg, setValg] = useState<Tema>('system');
  const [los, setLos] = useState<LosTema>('light');

  useEffect(() => {
    const start = lesTema();
    setValg(start);
    const resolved = losTema(start);
    setLos(resolved);
    skrivTemaPaRot(resolved);
  }, []);

  useEffect(() => {
    if (valg !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const sync = () => {
      const resolved = mq.matches ? 'dark' : 'light';
      setLos(resolved);
      skrivTemaPaRot(resolved);
    };
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [valg]);

  const sett = useCallback((t: Tema) => {
    setValg(t);
    const resolved = losTema(t);
    setLos(resolved);
    settTema(t);
  }, []);

  const veksle = useCallback(() => {
    sett(los === 'dark' ? 'light' : 'dark');
  }, [los, sett]);

  const verdi = useMemo(() => ({ valg, los, sett, veksle }), [valg, los, sett, veksle]);

  return <Ctx.Provider value={verdi}>{children}</Ctx.Provider>;
}

export function useTema(): TemaContext {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useTema krever TemaProvider');
  }
  return ctx;
}
