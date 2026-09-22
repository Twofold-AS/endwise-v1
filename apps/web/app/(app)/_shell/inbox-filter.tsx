'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import { INNBOKS_SIDE_STORRELSE } from '../_innbygging/innboks-katalog';
import type { InboxPart } from './inbox-del';

export { INNBOKS_FILTERE } from './inbox-del';
export type { InboxPart };

export type InboxSortering = 'nyeste' | 'eldste' | 'uleste';
export type InboxListeFilter = InboxPart | 'lost';

export const INNBOKS_GRUPPER: { key: InboxPart; label: string }[] = [
  { key: 'customer_dealer', label: 'Kunder' },
  { key: 'mechanic_dealer', label: 'Internt' },
  { key: 'dealer_admin', label: 'Support' },
];

const InboxFilterContext = createContext<{
  part: InboxPart;
  setPart: (part: InboxPart) => void;
  innhold: InboxListeFilter;
  setInnhold: (f: InboxListeFilter) => void;
  sortering: InboxSortering;
  setSortering: (s: InboxSortering) => void;
  skjulte: ReadonlySet<string>;
  skjul: (id: string) => void;
  skjulFlere: (ider: string[]) => void;
  lostte: ReadonlySet<string>;
  markerLost: (id: string) => void;
  gjenapne: (id: string) => void;
  velgModus: boolean;
  setVelgModus: (v: boolean) => void;
  valgte: ReadonlySet<string>;
  toggleValgt: (id: string) => void;
  toemValgte: () => void;
  sok: string;
  setSok: (q: string) => void;
  side: number;
  setSide: (n: number) => void;
  sideStorrelse: number;
  gjenopprett: (ider: string[]) => void;
  sisteSlettet: readonly string[];
  toemSisteSlettet: () => void;
} | null>(null);

export function InboxFilterProvider({ children }: { children: ReactNode }) {
  const [part, setPartState] = useState<InboxPart>('alle');
  const [innhold, setInnholdState] = useState<InboxListeFilter>('alle');
  const [sortering, setSortering] = useState<InboxSortering>('nyeste');
  const [skjulte, setSkjulte] = useState<ReadonlySet<string>>(() => new Set());
  const [lostte, setLostte] = useState<ReadonlySet<string>>(() => new Set());
  const [velgModus, setVelgModusState] = useState(false);
  const [valgte, setValgte] = useState<ReadonlySet<string>>(() => new Set());
  const [sok, setSokState] = useState('');
  const [side, setSideState] = useState(0);
  const [sisteSlettet, setSisteSlettet] = useState<readonly string[]>([]);

  function skjul(id: string) {
    setSkjulte((forrige) => new Set([...forrige, id]));
  }
  function skjulFlere(ider: string[]) {
    if (ider.length === 0) return;
    setSkjulte((forrige) => new Set([...forrige, ...ider]));
    setSisteSlettet(ider);
  }
  function gjenopprett(ider: string[]) {
    if (ider.length === 0) return;
    setSkjulte((forrige) => {
      const neste = new Set(forrige);
      for (const id of ider) neste.delete(id);
      return neste;
    });
    setSisteSlettet([]);
  }
  function toemSisteSlettet() {
    setSisteSlettet([]);
  }
  function setSok(q: string) {
    setSokState(q);
    setSideState(0);
  }
  function setSide(n: number) {
    setSideState(Math.max(0, n));
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
  function markerLost(id: string) {
    setLostte((forrige) => new Set([...forrige, id]));
  }
  function gjenapne(id: string) {
    setLostte((forrige) => {
      const neste = new Set(forrige);
      neste.delete(id);
      return neste;
    });
  }
  function setPart(neste: InboxPart) {
    setPartState(neste);
    setInnholdState(neste);
    setSideState(0);
  }
  function setInnhold(neste: InboxListeFilter) {
    setInnholdState(neste);
    if (neste !== 'lost') setPartState(neste);
    setSideState(0);
  }

  return (
    <InboxFilterContext.Provider
      value={{
        part,
        setPart,
        innhold,
        setInnhold,
        sortering,
        setSortering,
        skjulte,
        skjul,
        skjulFlere,
        lostte,
        markerLost,
        gjenapne,
        velgModus,
        setVelgModus,
        valgte,
        toggleValgt,
        toemValgte,
        sok,
        setSok,
        side,
        setSide,
        sideStorrelse: INNBOKS_SIDE_STORRELSE,
        gjenopprett,
        sisteSlettet,
        toemSisteSlettet,
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
