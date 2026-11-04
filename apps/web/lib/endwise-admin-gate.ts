import { createRequestContext } from '@endwise/api/context';
import { kanBrukePlattform, lesAuthSone, TwoFactorRequiredError } from '@endwise/auth';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

/**
 * F1-26 / CWE-200 — utfall for Endwise-interne sider (`/admin`, `/endwise`).
 * Bruker den eksisterende tRPC-konteksten (`createRequestContext` →
 * `requireSession` + `assertMember`). Ingen ny auth-stack.
 */
export type EndwiseAdminUtfall = 'ok' | 'signin' | 'two_factor' | 'forbidden';

export function endwiseAdminUtfall(input: {
  userId: string | null;
  role: string | null;
  twoFactorRequired?: boolean;
}): EndwiseAdminUtfall {
  if (!input.userId) return 'signin';
  if (input.role !== 'endwise_admin' && input.role !== 'endwise_support') return 'forbidden';
  return 'ok';
}

/**
 * Server-gate for layout. Kaster `redirect` før barn (KPI-tall) rendres.
 * Uten sesjon → `/signin`. TOTP er valgfri — uenrollert får inn.
 * Innlogget uten Endwise-rolle → `forbidden` (sesjonen beholdes).
 */
export async function krevEndwiseAdminSide(): Promise<EndwiseAdminUtfall> {
  const h = await headers();
  if (lesAuthSone(h) !== 'platform') {
    notFound();
  }

  let utfall: EndwiseAdminUtfall;
  let ctx: Awaited<ReturnType<typeof createRequestContext>> | null = null;
  try {
    ctx = await createRequestContext(h);
    utfall = endwiseAdminUtfall({ userId: ctx.userId, role: ctx.role });
  } catch (error) {
    if (error instanceof TwoFactorRequiredError) {
      utfall = 'two_factor';
    } else {
      throw error;
    }
  }

  if (utfall === 'ok' || utfall === 'two_factor') {
    if (ctx && !kanBrukePlattform({ role: ctx.role, harPasskey: ctx.passkeyOk })) {
      redirect('/logg-inn?steg=nokkel' as Route);
    }
    return 'ok';
  }
  if (utfall === 'signin') {
    redirect('/logg-inn' as Route);
  }
  return 'forbidden';
}
