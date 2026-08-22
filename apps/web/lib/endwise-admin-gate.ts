import { createRequestContext } from '@endwise/api/context';
import { TwoFactorRequiredError } from '@endwise/auth';
import type { Route } from 'next';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';

/**
 * F1-26 / CWE-200 — utfall for Endwise-interne sider (`/admin`, `/endwise`).
 *
 * Bruker den eksisterende tRPC-konteksten (`createRequestContext` →
 * `requireSession` + `assertMember`). Ingen ny auth-stack.
 */
export type EndwiseAdminUtfall = 'ok' | 'signin' | 'two_factor' | 'forbidden';

export function endwiseAdminUtfall(input: {
  userId: string | null;
  role: string | null;
  twoFactorRequired?: boolean;
}): EndwiseAdminUtfall {
  if (input.twoFactorRequired) return 'two_factor';
  if (!input.userId) return 'signin';
  if (input.role !== 'endwise_admin') return 'forbidden';
  return 'ok';
}

/**
 * Server-gate for layout. Kaster `redirect` før barn (KPI-tall) rendres.
 * Uten sesjon eller uten `endwise_admin` → `/signin`. 2FA-plikt → oppsett.
 */
export async function krevEndwiseAdminSide(): Promise<void> {
  let utfall: EndwiseAdminUtfall;
  try {
    const ctx = await createRequestContext(await headers());
    utfall = endwiseAdminUtfall({ userId: ctx.userId, role: ctx.role });
  } catch (error) {
    if (error instanceof TwoFactorRequiredError) {
      utfall = 'two_factor';
    } else {
      throw error;
    }
  }

  if (utfall === 'ok') return;
  if (utfall === 'two_factor') redirect('/2fa-oppsett' as Route);
  redirect('/signin' as Route);
}
