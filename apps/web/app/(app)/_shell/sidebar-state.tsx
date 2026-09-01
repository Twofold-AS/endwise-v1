'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Overlay-sidebar (telefon og desktop) og eventuell kollaps deles mellom
 * header, toppbar og sidebaren. Overlay starter alltid lukket — åpnes fra
 * samme toppbar-ikon ytterst til høyre. Ingen persistent desktop-skinne.
 */
type SidebarState = {
  collapsed: boolean;
  toggle: () => void;
  phoneOpen: boolean;
  openPhone: () => void;
  closePhone: () => void;
};

const Ctx = createContext<SidebarState>({
  collapsed: false,
  toggle: () => {},
  phoneOpen: false,
  openPhone: () => {},
  closePhone: () => {},
});

export function SidebarStateProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);
  const openPhone = useCallback(() => setPhoneOpen(true), []);
  const closePhone = useCallback(() => setPhoneOpen(false), []);
  const value = useMemo(
    () => ({ collapsed, toggle, phoneOpen, openPhone, closePhone }),
    [collapsed, toggle, phoneOpen, openPhone, closePhone],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSidebarState(): SidebarState {
  return useContext(Ctx);
}
