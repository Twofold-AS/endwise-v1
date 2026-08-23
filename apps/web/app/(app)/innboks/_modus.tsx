'use client';

import { createContext, type ReactNode, useContext } from 'react';

/**
 * F5-11 — samme innboks-chrome, to lesere.
 *
 * `forhandler` = /innboks (egen tenant, tre parter).
 * `endwise`    = /endwise/innboks (dealer_admin på tvers, ingen Kunder/Intern).
 */
export type InboxModus = 'forhandler' | 'endwise';

const InboxModusContext = createContext<InboxModus>('forhandler');

export function InboxModusProvider({
  modus,
  children,
}: {
  modus: InboxModus;
  children: ReactNode;
}) {
  return <InboxModusContext.Provider value={modus}>{children}</InboxModusContext.Provider>;
}

export function useInboxModus(): InboxModus {
  return useContext(InboxModusContext);
}
