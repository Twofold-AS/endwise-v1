'use client';

import { Avatar, CircleAlert, Users } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';

/**
 * Samme occupancy-flate som `/mekanikere` (F3-08 / F6-19):
 * statusprikk, ledig-tekst, «N av kapasitet i dag».
 * Detaljer åpner team-panelet når mekanikeren har en bruker.
 */
const STATUS_PRIKK: Record<string, string> = {
  ledig: 'bg-success',
  på_jobb: 'bg-warn',
  opptatt: 'bg-warn',
  fri: 'bg-fg-muted',
};

export function MekanikerePille({
  valgtId,
  onVelg,
}: {
  valgtId: string | null;
  onVelg: (userId: string) => void;
}) {
  const liste = trpc.mechanics.oversikt.useQuery();

  if (liste.isLoading) {
    return <p className="py-12 text-center text-body text-fg-muted">Laster mekanikere …</p>;
  }
  if (liste.isError) {
    return (
      <CardShell className="flex items-start gap-3 p-6">
        <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
        <p className="text-body text-danger">{liste.error.message}</p>
      </CardShell>
    );
  }
  if ((liste.data?.length ?? 0) === 0) {
    return (
      <CardShell className="p-10 text-center">
        <p className="text-label text-fg">Ingen mekanikere ennå</p>
        <p className="mt-1 text-[12px] text-fg-muted">
          Inviter en mekaniker øverst — med e-post, eller uten hvis hen ikke skal logge inn.
        </p>
      </CardShell>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-xl border border-border">
        {liste.data?.map((m, i) => (
          <div
            key={m.id}
            className={`flex min-h-row-store items-center gap-4 bg-bg px-4 py-2 ${
              i > 0 ? 'border-border border-t' : ''
            } ${m.userId && m.userId === valgtId ? 'bg-sidebar-active/40' : ''}`}
          >
            <Avatar
              seed={m.id}
              valg={{ ...m.avatar, humor: m.statusHumor }}
              navn={m.name}
              size={32}
              bevegelse="stille"
            />
            <div className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className="truncate text-label text-fg">{m.name}</span>
              <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
                <span
                  aria-hidden
                  className={`inline-block size-2 rounded-full ${STATUS_PRIKK[m.status] ?? 'bg-fg-muted'}`}
                />
                {m.statusLabel}
              </span>
            </div>
            <span className="shrink-0 text-[12px] text-fg-muted tabular-nums">
              {m.jobberIDag} av {m.capacity} i dag
            </span>
            {m.userId ? (
              <button
                type="button"
                onClick={() => onVelg(m.userId as string)}
                aria-pressed={m.userId === valgtId}
                className="inline-flex h-control items-center rounded-control border border-border px-2.5 text-label text-fg hover:bg-surface-2"
              >
                Detaljer
              </button>
            ) : null}
          </div>
        ))}
      </div>
      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Users size={14} />
        {liste.data?.length ?? 0} mekanikere. Ledig-statusen er den samme som på mekanikerflaten.
      </p>
    </div>
  );
}
