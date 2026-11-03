'use client';

import { trpc } from '@/lib/trpc';
import type { OrgRole } from '../_shell/nav';

/**
 * Egne tillatelser til menyen. Uten flagg feiler kallet — da er `gitt` null
 * og menyen er som i dag. Admin trenger ikke oppslag (har alt).
 */
export function useMineTillatelser(role: OrgRole | null, enabled = true) {
  const mine = trpc.tillatelse.mine.useQuery(undefined, {
    enabled: enabled && role === 'dealer_staff',
    retry: false,
  });
  return {
    gitt: mine.isSuccess ? mine.data : null,
    laster: mine.isFetching,
  };
}
