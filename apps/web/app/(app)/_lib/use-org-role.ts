'use client';

import { useSession } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import type { OrgRole } from '../_shell/nav';

/**
 * F1-05 — Ekte rolle fra sesjonen: Better-Auth sier innlogget/ikke, og
 * `trpc.session.me` gir org-rollen + om brukeren er mekaniker (mekaniker-profil).
 * Klient-side gating er kosmetikk; server håndhever via adminProcedure/RLS.
 */
export function useOrgRole(): {
  userId: string | null;
  role: OrgRole | null;
  isMechanic: boolean;
  isDealerAdmin: boolean;
  isEndwiseAdmin: boolean;
  isAdmin: boolean;
  isAuthenticated: boolean;
  isLoading: boolean;
} {
  const { data: session, isPending } = useSession();
  const authed = Boolean(session?.user);
  const me = trpc.session.me.useQuery(undefined, { enabled: authed, retry: false });
  const role = (me.data?.role as OrgRole | null | undefined) ?? null;
  return {
    userId: me.data?.userId ?? null,
    role,
    isMechanic: me.data?.isMechanic ?? false,
    isDealerAdmin: role === 'dealer_admin' || role === 'endwise_admin',
    isEndwiseAdmin: role === 'endwise_admin',
    isAdmin: role === 'dealer_admin' || role === 'endwise_admin',
    isAuthenticated: authed,
    isLoading: isPending || (authed && me.isLoading),
  };
}
