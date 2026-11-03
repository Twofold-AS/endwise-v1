'use client';

import { createContext, type ReactNode, useContext } from 'react';

export type LenkeRender = (props: {
  href: string;
  className?: string;
  children: ReactNode;
}) => ReactNode;

const LenkeCtx = createContext<LenkeRender | null>(null);

/** Appen setter Next Link her, så ListeRad ikke gjør hard navigasjon. */
export function LenkeProvider({
  render,
  children,
}: {
  render: LenkeRender;
  children: ReactNode;
}) {
  return <LenkeCtx.Provider value={render}>{children}</LenkeCtx.Provider>;
}

export function useLenkeRender() {
  return useContext(LenkeCtx);
}
