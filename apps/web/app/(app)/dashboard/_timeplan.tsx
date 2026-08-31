'use client';

import { CalendarDays, staffFargeStil } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { PRODUKT_TIDSSONE } from '../_lib/oslo-dag';
import { CardShell } from '../_shell/cards';
import { klossSporStil, pakkKlosser } from '../_shell/timeplan-dager';
import { fmtServices, STATUS_LABEL } from '../bookinger/_status';
import {
  dagensSaker,
  timeplanKloss,
  VERKSTED_DAG_SLUTT,
  VERKSTED_DAG_START,
  VERKSTED_DAG_TIMER,
  VERKSTED_PX_PER_TIME,
  VERKSTED_TIMELISTE,
} from './_timeplan-layout';

type Booking = {
  id: string;
  status: string;
  startsAt: Date | string;
  endsAt: Date | string;
  regNumber?: string | null;
  serviceName?: string | null;
  serviceNames?: readonly (string | null)[] | null;
  mechanicId: string | null;
  mechanicName?: string | null;
  farge?: string | null;
};

/**
 * Dagens timeplan på Verkstedet (08–20).
 * Jobbklossene sitter på klokkeslettet, med den ansattes ColorId.
 * Overlapp (fem folk kl. 08:00) pakkes side-ved-side. Status er tekst.
 */
export function Timeplan({
  jobber,
  mekName,
  laster,
  feil,
  tittel = 'Timeplan',
}: {
  jobber: Booking[] | undefined;
  mekName: Map<string, string>;
  laster: boolean;
  feil?: string;
  tittel?: string;
}) {
  const rader = useMemo(() => dagensSaker(jobber ?? [], new Date()), [jobber]);
  const spor = useMemo(() => pakkKlosser(rader), [rader]);

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-title text-fg">{tittel}</h2>
        <Link
          href={'/saker?visning=kalender' as Route}
          className="text-[12px] text-fg-muted transition-colors hover:text-fg"
        >
          Åpne kalender →
        </Link>
      </div>

      {laster ? (
        <p className="py-8 text-center text-body text-fg-muted">Laster …</p>
      ) : feil ? (
        <CardShell className="p-6">
          <p className="text-body text-danger">{feil}</p>
        </CardShell>
      ) : rader.length === 0 ? (
        <CardShell className="p-10 text-center">
          <p className="text-label text-fg">Ingen saker i dag</p>
          <p className="mt-1 text-[12px] text-fg-muted">
            Timeplanen er tom fra {VERKSTED_DAG_START} til {VERKSTED_DAG_SLUTT}.
          </p>
        </CardShell>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-bg">
          <div
            className="relative flex"
            style={{ height: VERKSTED_DAG_TIMER * VERKSTED_PX_PER_TIME }}
          >
            <div className="w-14 shrink-0">
              {VERKSTED_TIMELISTE.map((time) => (
                <div
                  key={time}
                  style={{ height: VERKSTED_PX_PER_TIME }}
                  className="relative border-border border-b text-[11px] text-fg-muted tabular-nums"
                >
                  <span className="absolute top-1 right-2">{time}:00</span>
                </div>
              ))}
            </div>
            <div className="relative min-w-0 flex-1 border-border border-l">
              {VERKSTED_TIMELISTE.map((time) => (
                <div
                  key={time}
                  style={{ height: VERKSTED_PX_PER_TIME }}
                  className="border-border/60 border-b"
                />
              ))}
              {rader.map((b, i) => {
                const { top, height } = timeplanKloss(b.startsAt, b.endsAt);
                const start = new Date(b.startsAt);
                const navn = b.mechanicName ?? (b.mechanicId ? mekName.get(b.mechanicId) : null);
                const plass = spor[i] ?? { spor: 0, sporAntall: 1 };
                return (
                  <Link
                    key={b.id}
                    href={`/bookinger/${b.id}` as Route}
                    style={{
                      top,
                      height,
                      ...klossSporStil(plass.spor, plass.sporAntall),
                      ...staffFargeStil(b.farge, b.mechanicId ?? undefined),
                    }}
                    className="absolute overflow-hidden rounded-control border px-2 py-1 text-fg transition-colors hover:brightness-[0.97]"
                    title={`${start.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: PRODUKT_TIDSSONE })} · ${STATUS_LABEL[b.status] ?? b.status}`}
                  >
                    <div className="truncate font-medium text-[11px] tabular-nums">
                      {start.toLocaleTimeString('nb-NO', {
                        hour: '2-digit',
                        minute: '2-digit',
                        timeZone: PRODUKT_TIDSSONE,
                      })}{' '}
                      {b.regNumber ?? ''}
                    </div>
                    {height > 32 && (
                      <div className="truncate text-[11px] opacity-80">
                        {fmtServices(b)}
                        {navn ? ` · ${navn}` : ''}
                        {' · '}
                        {STATUS_LABEL[b.status] ?? b.status}
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <CalendarDays size={14} />
        {rader.length} {rader.length === 1 ? 'sak' : 'saker'} i dag. Rutenettet er{' '}
        {VERKSTED_DAG_START}–{VERKSTED_DAG_SLUTT}.
      </p>
    </section>
  );
}
