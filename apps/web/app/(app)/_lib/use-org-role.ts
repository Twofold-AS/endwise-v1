'use client';

import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import type { OrgRole } from '../_shell/nav';
import { erPlattformIUi } from './plattform';

/**
 * F1-05 — Ekte rolle fra sesjonen: Better-Auth sier innlogget/ikke, og
 * `trpc.session.me` gir org-rollen + om brukeren er mekaniker (mekaniker-profil).
 * Klient-side gating er kosmetikk; server håndhever via adminProcedure/RLS.
 *
 * ── Utvidet 07.08.2026 (F5-26/F5-27) ───────────────────────────────────────
 * `tenantName` erstatter «Endwise-forhandler»-placeholderen i sidebaren.
 * `devMode` er de tre betingelsene fra `apps/api/src/trpc/dev-mode.ts`, allerede
 * resolvert på serveren — klienten regner ikke ut noe selv, den viser bare svaret.
 */
export function useOrgRole(): {
  userId: string | null;
  /**
   * ⚠️ Fra `session.me`, IKKE fra Better-Auth-sesjonen. Se kommentaren i
   * `routers/session.ts`: navnet hadde to hjem, og sidebaren leste det som
   * ikke ble oppdatert ved lagring.
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
  isDealerAdmin: boolean;
  isEndwiseAdmin: boolean;
  isEndwiseSupport: boolean;
  isEndwiseTeam: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
  /** ⚠️ Kosmetikk. Sperren er server-side på hver skrivesti. */
  devMode: boolean;
  /**
   * Kan brukeren BYTTE til en demo-tenant? Bevisst svakere enn `devMode`.
   *
   * Full dev-mode krever at du allerede ER i en demo-tenant — men da ville
   * bytteren som får deg DIT vært gjemt bak seg selv. Derfor holder det med
   * flagg + endwise_admin for å se lista. Det gir ingen tilgang: ruta bak den
   * er `endwiseAdminProcedure` og returnerer kun tenants du allerede er
   * medlem av.
   */
  canSwitchDemo: boolean;
  needsOnboarding: boolean;
  /** F10-03 — kosmetikk. Sperren er shopProcedure. Fail-safe AV. */
  shopEnabled: boolean;
} {
  const { data: session, isPending } = useSession();
  const authed = Boolean(session?.user);
  const me = trpc.session.me.useQuery(undefined, { enabled: authed, retry: false });
  const role = (me.data?.role as OrgRole | null | undefined) ?? null;
  return {
    userId: me.data?.userId ?? null,
    navn: me.data?.navn || null,
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
    isDealerAdmin: role === 'dealer_admin' || role === 'endwise_admin',
    isEndwiseAdmin: role === 'endwise_admin',
    isEndwiseSupport: role === 'endwise_support',
    isEndwiseTeam: role === 'endwise_admin' || role === 'endwise_support',
    isAdmin: role === 'dealer_admin' || role === 'endwise_admin' || role === 'endwise_support',
    isAuthenticated: authed,
    isLoading: isPending || (authed && me.isLoading),
    devMode: me.data?.devMode?.enabled ?? false,
    canSwitchDemo: (me.data?.devMode?.flagOn ?? false) && role === 'endwise_admin',
    needsOnboarding: me.data?.needsOnboarding ?? false,
    shopEnabled: me.data?.shopEnabled ?? false,
  };
}
