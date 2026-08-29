'use client';

import { CalendarDays, HardHat } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { osloDagsvindu, osloVeggtid, PRODUKT_TIDSSONE } from '../_lib/oslo-dag';
import { CardShell } from '../_shell/cards';
import {
  TIMEPLAN_DAG_SLUTT,
  TIMEPLAN_DAG_START,
  TIMEPLAN_PX_PER_TIME,
  TIMEPLAN_TIMELISTE,
} from '../_shell/timeplan-dager';
import { fmtServices, STATUS_TONE } from '../bookinger/_status';

/**
 * Timeplan › Kalender. Samme dag-vindu som Organisasjon-Timeplan (#92):
 * 08:00–20:00, Europe/Oslo. Dato velges av TimeplanStripe på siden.
 */
export function Kalender({ mechanicId, valgt }: { mechanicId?: string; valgt: string }) {
  const [perMekaniker, setPerMekaniker] = useState(false);
  const vindu = osloDagsvindu(valgt);

  const mekanikere = trpc.mechanics.list.useQuery();
  const jobber = trpc.bookings.calendar.useQuery({
    from: vindu.from,
    to: vindu.to,
    mechanicId: mechanicId || undefined,
  });

  const kolonner = useMemo(() => {
    if (!perMekaniker) return [{ id: null as string | null, navn: 'Alle' }];
    const liste = (mekanikere.data ?? []).map((m) => ({ id: m.id as string | null, navn: m.name }));
    return liste.length > 0 ? liste : [{ id: null, navn: 'Alle' }];
  }, [perMekaniker, mekanikere.data]);

  const rader = jobber.data ?? [];
  const startTime = TIMEPLAN_DAG_START;
  const sluttTime = TIMEPLAN_DAG_SLUTT;
  const timer = sluttTime - startTime;
  const timeliste = TIMEPLAN_TIMELISTE;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setPerMekaniker((v) => !v)}
          aria-pressed={perMekaniker}
          className={`ml-auto inline-flex h-control items-center gap-2 rounded-control border px-3 text-label transition-colors ${
            perMekaniker
              ? 'border-fg bg-sidebar-active text-fg'
              : 'border-border text-fg-muted hover:text-fg'
          }`}
        >
          <HardHat size={15} strokeWidth={1.75} />
          Per mekaniker
        </button>
      </div>

      {jobber.isLoading ? (
        <div className="py-16 text-center text-body text-fg-muted">Laster kalender …</div>
      ) : jobber.isError ? (
        <CardShell className="p-6">
          <p className="text-body text-fg-muted">Kunne ikke hente kalenderen. Prøv igjen.</p>
        </CardShell>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-bg">
          <div className="min-w-[640px]">
            <div className="flex border-border border-b bg-surface-2">
              <div className="w-14 shrink-0" />
              {kolonner.map((k) => (
                <div
                  key={k.id ?? 'alle'}
                  className="flex-1 border-border border-l px-3 py-2 text-label text-fg"
                >
                  {k.navn}
                </div>
              ))}
            </div>

            <div className="relative flex" style={{ height: timer * TIMEPLAN_PX_PER_TIME }}>
              <div className="w-14 shrink-0">
                {timeliste.map((time) => (
                  <div
                    key={time}
                    style={{ height: TIMEPLAN_PX_PER_TIME }}
                    className="relative border-border border-b text-[11px] text-fg-muted tabular-nums"
                  >
                    <span className="absolute top-1 right-2">{time}:00</span>
                  </div>
                ))}
              </div>

              {kolonner.map((kol, kolIndex) => {
                const kolonneJobber = rader.filter(
                  (b) => kol.id == null || b.mechanicId === kol.id,
                );
                return (
                  <div
                    key={kol.id ?? 'alle'}
                    className="relative min-w-0 flex-1 border-border border-l"
                  >
                    {timeliste.map((time) => (
                      <div
                        key={time}
                        style={{ height: TIMEPLAN_PX_PER_TIME }}
                        className="border-border/60 border-b"
                      />
                    ))}
                    {kolonneJobber.map((b) => (
                      <Kloss
                        key={b.id}
                        booking={b}
                        kolIndex={kolIndex}
                        startTime={startTime}
                        sluttTime={sluttTime}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <CalendarDays size={14} />
        {jobber.isLoading
          ? 'Laster kalender …'
          : `${rader.length} ${rader.length === 1 ? 'jobb' : 'jobber'} i perioden.`}
      </p>
    </div>
  );
}

/**
 * Én jobbkloss. Posisjonen er tiden — det er hele poenget med en kalender.
 * Varigheten leses av `endsAt`, ikke av tjenestens standardvarighet: en jobb som
 * tok tre timer skal se ut som tre timer, også når tjenesten er satt til én.
 */
function Kloss({
  booking,
  kolIndex,
  startTime,
  sluttTime,
}: {
  booking: {
    id: string;
    startsAt: string | Date;
    endsAt: string | Date;
    status: string;
    regNumber: string | null;
    serviceName: string | null;
    serviceNames?: readonly (string | null)[] | null;
    mechanicName: string | null;
  };
  kolIndex: number;
  startTime: number;
  sluttTime: number;
}) {
  const start = new Date(booking.startsAt);
  const slutt = new Date(booking.endsAt);
  const startVegg = osloVeggtid(start);
  const sluttVegg = osloVeggtid(slutt);

  const startTimer = startVegg.hour + startVegg.minute / 60;
  const sluttTimer = sluttVegg.hour + sluttVegg.minute / 60;

  const fra = Math.max(startTime, Math.min(startTimer, sluttTime));
  const til = Math.min(sluttTime, Math.max(sluttTimer, fra + 0.25));

  const top = (fra - startTime) * TIMEPLAN_PX_PER_TIME;
  const height = Math.max(22, (til - fra) * TIMEPLAN_PX_PER_TIME);

  return (
    <Link
      href={`/bookinger/${booking.id}` as Route}
      style={{ top, height }}
      className={`absolute right-1 left-1 overflow-hidden rounded-control border border-border px-2 py-1 transition-colors hover:border-border-strong ${
        STATUS_TONE[booking.status] ?? 'bg-surface-2 text-fg'
      }`}
      title={`${start.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit', timeZone: PRODUKT_TIDSSONE })} · ${fmtServices(booking)}${booking.mechanicName ? ` · ${booking.mechanicName}` : ''}`}
      // Sørger for at senere klosser tegnes over tidligere ved overlapp.
      data-kol={kolIndex}
    >
      <div className="truncate font-medium text-[11px] tabular-nums">
        {start.toLocaleTimeString('nb-NO', {
          hour: '2-digit',
          minute: '2-digit',
          timeZone: PRODUKT_TIDSSONE,
        })}{' '}
        {booking.regNumber ?? 'Uten regnr'}
      </div>
      {height > 34 && (
        <div className="truncate text-[11px] opacity-80">
          {fmtServices(booking)}
          {booking.mechanicName ? ` · ${booking.mechanicName}` : ''}
        </div>
      )}
    </Link>
  );
}
