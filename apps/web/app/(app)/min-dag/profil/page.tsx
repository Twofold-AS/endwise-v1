'use client';

import { CircleUser, LayoutDashboard } from '@endwise/ui';
import type { Route } from 'next';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/auth-client';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * F7-06 — Profil-fane. Mekanikeren ser KUN sitt eget: navn, kapasitet, status.
 * Ingen abonnement/admin/andre forhandlere — rollegatingen i (app)/layout låser
 * mekanikeren til /min-dag, og server (RLS/adminProcedure) er den ekte grensen.
 */
export default function ProfilPage() {
  const router = useRouter();
  const profile = trpc.mechanic.myProfile.useQuery();
  const m = profile.data;

  async function logout() {
    await signOut();
    router.replace('/signin' as Route);
  }

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <CircleUser size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Profil</h1>
      </div>

      <CardShell>
        <div className="flex flex-col gap-3 rounded-lg bg-inset p-5">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-full bg-primary/15 font-semibold text-lg text-primary">
              {(m?.name ?? '?').slice(0, 1).toUpperCase()}
            </div>
            <div>
              <p className="font-semibold text-fg">{m?.name ?? 'Mekaniker'}</p>
              <p className="text-fg-faint text-xs">Mekaniker</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-border border-t pt-3 text-[13px]">
            <dt className="text-fg-faint">Kapasitet</dt>
            <dd className="text-fg">{m ? `${m.capacity} samtidig` : '—'}</dd>
            <dt className="text-fg-faint">Status</dt>
            <dd className="text-fg">{m?.active ? 'Aktiv' : 'Inaktiv'}</dd>
          </dl>
        </div>
      </CardShell>

      <button
        type="button"
        onClick={logout}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card font-medium text-fg text-sm active:bg-surface-2"
      >
        <LayoutDashboard size={16} /> Logg ut
      </button>
    </div>
  );
}
