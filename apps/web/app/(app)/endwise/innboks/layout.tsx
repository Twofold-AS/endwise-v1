import type { ReactNode } from 'react';
import { InboxChrome } from '../../innboks/_chrome';

/**
 * F5-11 — samme chrome som /innboks, modus=endwise.
 *
 * Gaten ligger i `/endwise/layout.tsx` (`krevEndwiseAdminSide`). Dataene
 * stenges av `endwiseAdminProcedure` på listPlatformSupport.
 */
export default function EndwiseInnboksLayout({ children }: { children: ReactNode }) {
  return <InboxChrome modus="endwise">{children}</InboxChrome>;
}
