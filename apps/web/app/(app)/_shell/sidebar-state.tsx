'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

/**
 * F5-13 — Kollapsen deles mellom TO komponenter: knappen bor i topbaren, flaten
 * som endrer seg er sidebaren. Uten en delt tilstand måtte den ene sendt et
 * event til den andre, og da har man en usynlig kobling i stedet for en synlig.
 */
type SidebarState = { collapsed: boolean; toggle: () => void };

const Ctx = createContext<SidebarState>({ collapsed: false, toggle: () => {} });

export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const value = useMemo(() => ({ collapsed, toggle: () => setCollapsed((c) => !c) }), [collapsed]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSidebarState(): SidebarState {
  return useContext(Ctx);
}
