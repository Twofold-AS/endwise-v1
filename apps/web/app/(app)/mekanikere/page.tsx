'use client';

import { Avatar, CircleAlert, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';

/**
 * F6-19 / F3-08 — Mekanikerliste med load og status.
 *
 * Mekanikerne ER teamet. Identitet (form/farge/tone/seed) er den persistente
 * avataren; `humor` på denne flaten kommer fra status, ikke fra profilvalget.
 * Tilgjengelighetsteksten står ved siden av — uttrykket er ikke eneste signal.
 *
 * Ferdighetsmerker og sertifiseringer er fortsatt F3-08 (kompetansesiden).
 */
const STATUS_PRIKK: Record<string, string> = {
  ledig: 'bg-success',
  på_jobb: 'bg-warn',
  opptatt: 'bg-warn',
  fri: 'bg-fg-muted',
};

export default function MekanikerePage() {
  const liste = trpc.mechanics.oversikt.useQuery();

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="text-title text-fg">Mekanikere</h1>
        <p className="text-body text-fg-muted">
          Hvem som jobber i verkstedet, med belastning og status i dag.
        </p>
      </div>

      {liste.isLoading ? (
        <p className="py-12 text-center text-body text-fg-muted">Laster mekanikere …</p>
      ) : liste.isError ? (
        <CardShell className="flex items-start gap-3 p-6">
          <CircleAlert size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-danger" />
          <p className="text-body text-danger">{liste.error.message}</p>
        </CardShell>
      ) : (liste.data?.length ?? 0) === 0 ? (
        <CardShell className="p-10 text-center">
          <p className="text-label text-fg">Ingen mekanikere ennå</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Legg til en mekaniker fra Team — med invitasjon, eller uten e-post hvis hen ikke skal
            logge inn.
          </p>
          <Link
            href={'/innstillinger/team' as Route}
            className="mt-3 inline-block text-[12px] text-fg-muted underline underline-offset-2 hover:text-fg"
          >
            Gå til Team
          </Link>
        </CardShell>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {liste.data?.map((m, i) => (
            <div
              key={m.id}
              className={`flex min-h-row-store items-center gap-4 bg-bg px-4 py-2 ${
                i > 0 ? 'border-border border-t' : ''
              }`}
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
            </div>
          ))}
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Users size={14} />
        {liste.data?.length ?? 0} mekanikere. Uttrykket speiler status; navnet står ved siden av.
      </p>
    </div>
  );
}
