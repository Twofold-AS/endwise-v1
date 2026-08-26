'use client';

import { Avatar, type AvatarValg, Users } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { CardShell } from '../_shell/cards';
import { fmtServices, fmtTime, STATUS_LABEL } from '../bookinger/_status';
import { aktivJobb, ansattePaJobb, dagensJobber } from './_pa-jobb';

const STATUS_PRIKK: Record<string, string> = {
  ledig: 'bg-success',
  på_jobb: 'bg-warn',
  opptatt: 'bg-warn',
};

type Mekaniker = {
  id: string;
  name: string;
  status: string;
  statusLabel: string;
  statusHumor: string;
  avatar: AvatarValg | null;
};

type Booking = {
  id: string;
  mechanicId: string | null;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string;
  serviceName?: string | null;
  serviceNames?: readonly (string | null)[] | null;
  regNumber?: string | null;
};

/**
 * Stripen «Ansatte på jobb» på Verkstedet.
 * Ikke Kompetanse/Timeplan under Ansatte. Ikke Kontor/Gulvet.
 * Utvidelsen er native `<details>` — samme grep som Profil-formen.
 */
export function AnsattePaJobb({
  mekanikere,
  jobber,
  laster,
}: {
  mekanikere: Mekaniker[] | undefined;
  jobber: Booking[] | undefined;
  laster: boolean;
}) {
  const naa = useMemo(() => new Date(), []);
  const paaJobb = useMemo(() => ansattePaJobb(mekanikere ?? []), [mekanikere]);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-title text-fg">Ansatte på jobb</h2>
      {laster ? (
        <p className="py-6 text-center text-body text-fg-muted">Laster …</p>
      ) : paaJobb.length === 0 ? (
        <CardShell className="p-8 text-center">
          <p className="text-label text-fg">Ingen på jobb nå</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Aktive mekanikere vises her. Fri holdes utenfor.
          </p>
        </CardShell>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {paaJobb.map((m, i) => {
            const sak = aktivJobb(jobber ?? [], m.id, naa);
            const alle = dagensJobber(jobber ?? [], m.id, naa);
            return (
              <details
                key={m.id}
                className={`group bg-bg ${i > 0 ? 'border-border border-t' : ''}`}
              >
                <summary className="flex min-h-row-store cursor-pointer list-none items-center gap-3 px-4 py-2 [&::-webkit-details-marker]:hidden">
                  <Avatar
                    seed={m.id}
                    valg={{ ...(m.avatar ?? {}), humor: m.statusHumor }}
                    navn={m.name}
                    size={32}
                    bevegelse="stille"
                  />
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">{m.name}</span>
                    <span className="flex items-center gap-1.5 text-[12px] text-fg-muted">
                      <span
                        aria-hidden
                        className={`inline-block size-2 rounded-full ${STATUS_PRIKK[m.status] ?? 'bg-fg-muted'}`}
                      />
                      {m.statusLabel}
                      {sak ? ` · ${fmtServices(sak)} ${fmtTime(sak.startsAt)}` : ' · Ingen sak nå'}
                    </span>
                  </span>
                </summary>
                <div className="border-border border-t bg-surface-2 px-4 py-2">
                  {alle.length === 0 ? (
                    <p className="text-[12px] text-fg-muted">Ingen saker tildelt i dag.</p>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {alle.map((j) => (
                        <li key={j.id}>
                          <Link
                            href={`/bookinger/${j.id}` as Route}
                            className="flex items-center gap-2 text-[12px] text-fg hover:underline"
                          >
                            <span className="tabular-nums">{fmtTime(j.startsAt)}</span>
                            <span className="min-w-0 flex-1 truncate">
                              {j.regNumber ?? 'Uten regnr'} · {fmtServices(j)}
                            </span>
                            <span className="shrink-0 text-fg-muted">
                              {STATUS_LABEL[j.status] ?? j.status}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      )}
      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Users size={14} />
        {paaJobb.length} {paaJobb.length === 1 ? 'ansatt' : 'ansatte'} på jobb. Utvid raden for å se
        saken.
      </p>
    </section>
  );
}
