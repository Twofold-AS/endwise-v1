'use client';

import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from 'react';

/**
 * Overlay-sidebar er telefon. Desktop-kollaps (`collapsed`) er en smalere
 * skinne, ikke en skjult overlay. Overlay starter lukket.
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
