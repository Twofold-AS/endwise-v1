'use client';

import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authClient } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { MarkedsSide } from './_markeds/markeds-side';
import { destinasjonNarSesjonFeiler } from './invitasjon/_landing';

/**
 * Base-ruten «/» — offentlig landingsside (F5-35).
 * Innlogget → `session.me.landing` (samme regel som innlogging).
 * Utlogget → Jonas-fasit 05.09.2026 (`_markeds/`).
 * Inntil sesjonen er avklart tegnes en tom flate: en markedsside som blinker
 * innom før en redirect er verre enn et halvsekund tomt.
 */
export default function BasePage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [utlogget, setUtlogget] = useState<boolean | null>(null);

  useEffect(() => {
    let avbrutt = false;

    void (async () => {
      const sesjon = await authClient.getSession().catch(() => null);
      if (avbrutt) return;

      if (!sesjon?.data?.user) {
        setUtlogget(true);
        return;
      }

      const orgs = await authClient.organization.list().catch(() => ({ data: null }));
      const platform = orgs.data?.find((o) => o.slug === 'endwise');
      const first = platform ?? orgs.data?.[0];
      if (first) await authClient.organization.setActive({ organizationId: first.id });

      const landing = await utils.session.me
        .fetch()
        .then((me) => me.landing)
        .catch((error: unknown) => destinasjonNarSesjonFeiler(error));
      if (avbrutt) return;
      router.replace((landing ?? '/dashboard') as Route);
    })();

    return () => {
      avbrutt = true;
    };
  }, [router, utils]);

  if (utlogget !== true) {
    return <main className="min-h-screen bg-bg" aria-busy="true" />;
  }

  return <MarkedsSide />;
}
