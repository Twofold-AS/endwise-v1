'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import type { InboxChip, InboxPart, InboxSortering } from './inbox-del';

export { INNBOKS_CHIPS, INNBOKS_FILTERE } from './inbox-del';
export type { InboxChip, InboxPart, InboxSortering };

export const INNBOKS_GRUPPER: { key: InboxPart; label: string }[] = [
  { key: 'customer_dealer', label: 'Kunder' },
  { key: 'mechanic_dealer', label: 'Internt' },
  { key: 'dealer_admin', label: 'Support' },
];

const InboxFilterContext = createContext<{
  part: InboxPart;
  setPart: (part: InboxPart) => void;
  chip: InboxChip;
  setChip: (chip: InboxChip) => void;
  sortering: InboxSortering;
  setSortering: (s: InboxSortering) => void;
  side: number;
  setSide: (n: number) => void;
  skjulte: ReadonlySet<string>;
  skjul: (id: string) => void;
  skjulFlere: (ider: string[]) => void;
  sisteSkjulte: readonly string[];
  angreSkjul: () => void;
  velgModus: boolean;
  setVelgModus: (v: boolean) => void;
  valgte: ReadonlySet<string>;
  toggleValgt: (id: string) => void;
  toemValgte: () => void;
} | null>(null);

export function InboxFilterProvider({ children }: { children: ReactNode }) {
  const [part, setPartState] = useState<InboxPart>('alle');
  const [chip, setChipState] = useState<InboxChip>('alle');
  const [sortering, setSorteringState] = useState<InboxSortering>('nyeste');
  const [side, setSide] = useState(1);
  const [skjulte, setSkjulte] = useState<ReadonlySet<string>>(() => new Set());
  const [sisteSkjulte, setSisteSkjulte] = useState<readonly string[]>([]);
  const [velgModus, setVelgModusState] = useState(false);
  const [valgte, setValgte] = useState<ReadonlySet<string>>(() => new Set());

  function setPart(neste: InboxPart) {
    setPartState(neste);
    setChipState(neste);
    setSide(1);
  }
  function setChip(neste: InboxChip) {
    setChipState(neste);
    if (neste !== 'lost') setPartState(neste);
    setSide(1);
  }
  function setSortering(s: InboxSortering) {
    setSorteringState(s);
    setSide(1);
  }
  function skjul(id: string) {
    setSkjulte((forrige) => new Set([...forrige, id]));
    setSisteSkjulte([id]);
  }
  function skjulFlere(ider: string[]) {
    if (ider.length === 0) return;
    setSkjulte((forrige) => new Set([...forrige, ...ider]));
    setSisteSkjulte(ider);
  }
  function angreSkjul() {
    if (sisteSkjulte.length === 0) return;
    const tilbake = new Set(sisteSkjulte);
    setSkjulte((forrige) => new Set([...forrige].filter((id) => !tilbake.has(id))));
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
        chip,
        setChip,
        sortering,
        setSortering,
        side,
        setSide,
        skjulte,
        skjul,
        skjulFlere,
        sisteSkjulte,
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
