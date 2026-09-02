import type { ReactNode } from 'react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

/**
 * Siden er `'use client'` og kan ikke eksportere route-config.
 * Uten dette prerendres /2fa-oppsett (statisk på branch-alias).
 */
export default function ToFaktorOppsettLayout({ children }: { children: ReactNode }) {
  return children;
}
