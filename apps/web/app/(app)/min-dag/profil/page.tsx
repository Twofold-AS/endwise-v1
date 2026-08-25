'use client';

import { Avatar, LayoutDashboard } from '@endwise/ui';
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
      <div>
        <h1 className="text-title text-fg">Profil</h1>
      </div>

      <CardShell>
        <div className="flex flex-col gap-3 rounded-lg bg-inset p-5">
          <div className="flex items-center gap-3">
            {m ? (
              <Avatar seed={m.id} valg={m.avatar} navn={m.name} size={48} bevegelse="hover" />
            ) : (
              <span className="grid size-12 place-items-center rounded-control bg-surface-2" />
            )}
            <div>
              <p className="text-label text-fg">{m?.name ?? 'Mekaniker'}</p>
              <p className="text-[12px] text-fg-muted">{m?.statusLabel ?? 'Mekaniker'}</p>
            </div>
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 border-border border-t pt-3 text-[13px]">
            <dt className="text-fg-muted">Kapasitet</dt>
            <dd className="text-fg">{m ? `${m.capacity} samtidig` : '—'}</dd>
            <dt className="text-fg-muted">Status</dt>
            <dd className="text-fg">{m?.statusLabel ?? '—'}</dd>
          </dl>
        </div>
      </CardShell>

      <button
        type="button"
        onClick={logout}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card text-label text-fg active:bg-surface-2"
      >
        <LayoutDashboard size={16} /> Logg ut
      </button>
    </div>
  );
}
