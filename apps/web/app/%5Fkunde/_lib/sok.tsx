'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

/** Søket i headeren filtrerer kjøretøy-kortene rett under. */
const SokKontekst = createContext<{ sok: string; setSok: (s: string) => void } | null>(null);

export function KundeSokProvider({ children }: { children: ReactNode }) {
  const [sok, setSok] = useState('');
  const verdi = useMemo(() => ({ sok, setSok }), [sok]);
  return <SokKontekst.Provider value={verdi}>{children}</SokKontekst.Provider>;
}

export function useKundeSok(): { sok: string; setSok: (s: string) => void } {
  return useContext(SokKontekst) ?? { sok: '', setSok: () => undefined };
}
