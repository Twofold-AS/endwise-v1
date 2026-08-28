'use client';

import { Inbox, LifeBuoy, type LucideIcon, Users, Wrench } from '@endwise/ui';
import { createContext, type ReactNode, useContext, useState } from 'react';

/** Filter på lista — ikke egne destinasjoner. */
export type InboxPart = 'alle' | 'customer_dealer' | 'mechanic_dealer' | 'dealer_admin';

export const INNBOKS_FILTERE: { key: InboxPart; label: string; icon: LucideIcon }[] = [
  { key: 'alle', label: 'Alle chatter', icon: Inbox },
  { key: 'customer_dealer', label: 'Kunder', icon: Users },
  { key: 'mechanic_dealer', label: 'Intern', icon: Wrench },
  { key: 'dealer_admin', label: 'Endwise', icon: LifeBuoy },
];

const InboxFilterContext = createContext<{
  part: InboxPart;
  setPart: (part: InboxPart) => void;
} | null>(null);

export function InboxFilterProvider({ children }: { children: ReactNode }) {
  const [part, setPart] = useState<InboxPart>('alle');
  return (
    <InboxFilterContext.Provider value={{ part, setPart }}>{children}</InboxFilterContext.Provider>
  );
}

export function useInboxFilter() {
  const ctx = useContext(InboxFilterContext);
  if (!ctx) {
    throw new Error('useInboxFilter krever InboxFilterProvider');
  }
  return ctx;
}
