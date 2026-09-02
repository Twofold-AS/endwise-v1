'use client';

import { createContext, type ReactNode, useContext, useState } from 'react';
import type { InboxPart } from './inbox-del';

export type { InboxPart };
export { INNBOKS_FILTERE } from './inbox-del';

export type InboxSortering = 'nyeste' | 'eldste';

const InboxFilterContext = createContext<{
  part: InboxPart;
  setPart: (part: InboxPart) => void;
  sortering: InboxSortering;
  setSortering: (s: InboxSortering) => void;
  skjulte: ReadonlySet<string>;
  skjul: (id: string) => void;
} | null>(null);

export function InboxFilterProvider({ children }: { children: ReactNode }) {
  const [part, setPart] = useState<InboxPart>('alle');
  const [sortering, setSortering] = useState<InboxSortering>('nyeste');
  const [skjulte, setSkjulte] = useState<ReadonlySet<string>>(() => new Set());
  function skjul(id: string) {
    setSkjulte((forrige) => new Set([...forrige, id]));
  }
  return (
    <InboxFilterContext.Provider value={{ part, setPart, sortering, setSortering, skjulte, skjul }}>
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
