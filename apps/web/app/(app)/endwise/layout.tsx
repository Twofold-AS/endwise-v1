import type { ReactNode } from 'react';
import { krevEndwiseAdminSide } from '@/lib/endwise-admin-gate';
import { IkkeTilgang } from '../_shell/ikke-tilgang';

/**
 * F1-26 — samme server-gate som `/admin`.
 *
 * `/endwise/*` var like prerendret og ungated. tRPC (`endwiseAdminProcedure`)
 * stenger dataene, men HTML-en for «Ny forhandler» lå åpent. Ingen ny
 * auth-stack — samme `requireSession`-sti som resten av API-et.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export default async function EndwiseLayout({ children }: { children: ReactNode }) {
  const utfall = await krevEndwiseAdminSide();
  if (utfall === 'forbidden') return <IkkeTilgang />;
  return children;
}
