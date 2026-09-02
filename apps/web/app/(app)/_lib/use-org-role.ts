'use client';

import { useEffect, useState } from 'react';
import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import type { OrgRole } from '../_shell/nav';
import { erPlattformIUi } from './plattform';

/** Over serverens 5s-frist, under Vercel-timeout. Layout skal ikke spinne evig. */
export const SESSION_ME_CLIENT_TIMEOUT_MS = 8_000;

/**
 * Ekte rolle fra sesjonen: Better-Auth sier innlogget/ikke, og
 * `trpc.session.me` gir org-rollen + om brukeren er mekaniker (mekaniker-profil).
 * Klient-side gating er kosmetikk; server håndhever via adminProcedure/RLS.
 * Utvidet (F5-26/F5-27)
 * `tenantName` erstatter «Endwise-forhandler»-placeholderen i sidebaren.
 * `devMode` er de tre betingelsene fra `apps/api/src/trpc/dev-mode.ts`, allerede
 * resolvert på serveren — klienten regner ikke ut noe selv, den viser bare svaret.
 */
export function useOrgRole(): {
  userId: string | null;
  /**
   * Chrome-navn: `session.me.internNavn` (kallenavn, ellers visningsnavn).
   * Ikke Better-Auth-sesjonen. Se `routers/session.ts`.
   */
  navn: string | null;
  role: OrgRole | null;
  tenantName: string | null;
  tenantKind: 'live' | 'demo' | 'platform';
  tenantSlug: string | null;
  erPlattform: boolean;
  plattformTenantId: string | null;
  verksteder: Array<{
    id: string;
    name: string;
    slug: string;
    role: string;
    isMechanic: boolean;
  }>;
  isMechanic: boolean;
  jobbfunksjon: string | null;
  isDealerAdmin: boolean;
  isEndwiseAdmin: boolean;
  isEndwiseSupport: boolean;
  isEndwiseTeam: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Kosmetikk. Sperren er server-side på hver skrivesti. */
  devMode: boolean;
  /**
   * Kan brukeren bytte til en demo-tenant? Bevisst svakere enn `devMode`.
   * Full dev-mode krever at du allerede er i en demo-tenant — men da ville
   * bytteren som får deg dit vært gjemt bak seg selv. Derfor holder det med
   * flagg + endwise_admin for å se lista. Det gir ingen tilgang: ruta bak den
   * er `endwiseAdminProcedure` og returnerer kun tenants du allerede er
   * medlem av.
   */
  canSwitchDemo: boolean;
  needsOnboarding: boolean;
  /** Kosmetikk. Sperren er shopProcedure. Fail-safe av. */
  shopEnabled: boolean;
} {
  const { data: session, isPending } = useSession();
  const authed = Boolean(session?.user);
  const me = trpc.session.me.useQuery(undefined, { enabled: authed, retry: false });
  const [meFristUte, setMeFristUte] = useState(false);

  useEffect(() => {
    if (!authed || !me.isLoading) {
      setMeFristUte(false);
      return;
    }
    const t = window.setTimeout(() => setMeFristUte(true), SESSION_ME_CLIENT_TIMEOUT_MS);
    return () => window.clearTimeout(t);
  }, [authed, me.isLoading]);

  const role = (me.data?.role as OrgRole | null | undefined) ?? null;
  return {
    userId: me.data?.userId ?? null,
    navn: me.data?.internNavn || me.data?.navn || null,
    role,
    tenantName: me.data?.tenantName ?? null,
    tenantKind: (me.data?.tenantKind as 'live' | 'demo' | 'platform' | undefined) ?? 'live',
    tenantSlug: me.data?.tenantSlug ?? null,
    erPlattform: erPlattformIUi({
      erPlattform: me.data?.erPlattform,
      slug: me.data?.tenantSlug ?? me.data?.aktivOrgSlug,
      kind: me.data?.tenantKind,
    }),
    plattformTenantId: me.data?.plattformTenantId ?? null,
    verksteder: me.data?.verksteder ?? [],
    isMechanic: me.data?.isMechanic ?? false,
    jobbfunksjon: me.data?.jobbfunksjon ?? null,
    isDealerAdmin: role === 'dealer_admin' || role === 'endwise_admin',
    isEndwiseAdmin: role === 'endwise_admin',
    isEndwiseSupport: role === 'endwise_support',
    isEndwiseTeam: role === 'endwise_admin' || role === 'endwise_support',
    isAdmin: role === 'dealer_admin' || role === 'endwise_admin' || role === 'endwise_support',
    isAuthenticated: authed,
    isLoading: isPending || (authed && me.isLoading && !meFristUte),
    devMode: me.data?.devMode?.enabled ?? false,
    canSwitchDemo: (me.data?.devMode?.flagOn ?? false) && role === 'endwise_admin',
    needsOnboarding: me.data?.needsOnboarding ?? false,
    shopEnabled: me.data?.shopEnabled ?? false,
  };
}
