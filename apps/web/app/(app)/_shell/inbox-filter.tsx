'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import type { InboxPart } from './inbox-del';

export { INNBOKS_FILTERE } from './inbox-del';
export type { InboxPart };

export type InboxSortering = 'nyeste' | 'eldste' | 'uleste';

export const INNBOKS_GRUPPER: { key: InboxPart; label: string }[] = [
  { key: 'customer_dealer', label: 'Kunder' },
  { key: 'mechanic_dealer', label: 'Internt' },
  { key: 'dealer_admin', label: 'Support' },
];

const InboxFilterContext = createContext<{
  part: InboxPart;
  setPart: (part: InboxPart) => void;
  sortering: InboxSortering;
  setSortering: (s: InboxSortering) => void;
  skjulte: ReadonlySet<string>;
  sisteSkjulte: readonly string[];
  skjul: (id: string) => void;
  skjulFlere: (ider: string[]) => void;
  angreSkjul: () => void;
  velgModus: boolean;
  setVelgModus: (v: boolean) => void;
  valgte: ReadonlySet<string>;
  toggleValgt: (id: string) => void;
  toemValgte: () => void;
} | null>(null);

export function InboxFilterProvider({ children }: { children: ReactNode }) {
  const [part, setPart] = useState<InboxPart>('alle');
  const [sortering, setSortering] = useState<InboxSortering>('nyeste');
  const [skjulte, setSkjulte] = useState<ReadonlySet<string>>(() => new Set());
  const [sisteSkjulte, setSisteSkjulte] = useState<readonly string[]>([]);
  const [velgModus, setVelgModusState] = useState(false);
  const [valgte, setValgte] = useState<ReadonlySet<string>>(() => new Set());

  function skjul(id: string) {
    setSisteSkjulte([id]);
    setSkjulte((forrige) => new Set([...forrige, id]));
  }
  function skjulFlere(ider: string[]) {
    if (ider.length === 0) return;
    setSisteSkjulte(ider);
    setSkjulte((forrige) => new Set([...forrige, ...ider]));
  }
  function angreSkjul() {
    if (sisteSkjulte.length === 0) return;
    setSkjulte((forrige) => {
      const neste = new Set(forrige);
      for (const id of sisteSkjulte) neste.delete(id);
      return neste;
    });
    setSisteSkjulte([]);
  }
  function setVelgModus(v: boolean) {
    setVelgModusState(v);
    if (!v) setValgte(new Set());
  }
  function toggleValgt(id: string) {
    setValgte((forrige) => {
      const neste = new Set(forrige);
      if (neste.has(id)) neste.delete(id);
      else neste.add(id);
      return neste;
    });
  }
  function toemValgte() {
    setValgte(new Set());
  }

  return (
    <InboxFilterContext.Provider
      value={{
        part,
        setPart,
        sortering,
        setSortering,
        skjulte,
        sisteSkjulte,
        skjul,
        skjulFlere,
        angreSkjul,
        velgModus,
        setVelgModus,
        valgte,
        toggleValgt,
        toemValgte,
      }}
    >
      {children}
    </InboxFilterContext.Provider>
  );
}

export function useInboxFilter() {
  const ctx = useContext(InboxFilterContext);
  if (!ctx) {
    throw new Error('useInboxFilter krever InboxFilterProvider');
  }
  return ctx;
}
