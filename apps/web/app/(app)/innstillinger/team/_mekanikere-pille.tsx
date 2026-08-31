'use client';

import { ArrowUpRight, Avatar, CircleAlert, Users } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { StatusMerke } from './_status';

/**
 * Samme occupancy-flate som `/mekanikere` (F3-08 / F6-19):
 * statusprikk, ledig-tekst, «N av kapasitet i dag».
 * Detaljer åpner team-panelet når mekanikeren har en bruker.
 */
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
          Opprett en mekaniker — med e-post, eller uten hvis hen ikke skal logge inn.
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
              <StatusMerke
                status={m.status}
                label={m.statusLabel}
                farge={m.farge ?? m.avatar?.farge}
                seed={m.id}
              />
            </div>
            <span className="shrink-0 text-[12px] text-fg-muted tabular-nums">
              {m.jobberIDag} av {m.capacity} i dag
            </span>
            {m.userId ? (
              <button
                type="button"
                onClick={() => onVelg(m.userId as string)}
                aria-pressed={m.userId === valgtId}
                className="inline-flex h-control items-center gap-1.5 rounded-control border border-border px-2.5 text-label text-fg hover:bg-surface-2"
              >
                Detaljer
                <ArrowUpRight size={14} strokeWidth={1.75} aria-hidden />
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
