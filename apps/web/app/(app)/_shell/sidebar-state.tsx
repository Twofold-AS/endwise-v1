'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

/**
 * Kollapsen deles mellom knappen i sidebar-header og sidebaren selv.
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
