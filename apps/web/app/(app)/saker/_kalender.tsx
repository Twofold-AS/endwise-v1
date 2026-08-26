'use client';

import { CalendarDays, ChevronDown, ChevronRight, HardHat } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { fmtServices, STATUS_TONE } from '../bookinger/_status';

/**
 * Kalendervisning. Dag og uke, jobbklosser plassert etter klokkeslett.
 * API-et fantes fra før (F3-03: `bookings.calendar` med `from`/`to`/`mechanicId`).
 * Dette er selve visningen.
 * To valg som styrer resten
 * 1. Klossene er posisjonert, ikke stablet. En jobb kl. 09 og en kl. 14 skal
 * stå der de faktisk er, ellers er det en liste med kalenderpynt. Derfor
 * absolutt posisjonering mot et fast timeraster: `top` fra starttid, `height`
 * fra varighet.
 * 2. Rasteret dekker verkstedets dag, og utvider seg hvis en jobb ligger
 * utenfor 07–18. Å klippe klossen inn i kanten og fotnote det, er en bug.
 * Én kolonne per mekaniker, eller alt samlet. Samlet er default: det er
 * spørsmålet «hva skjer i dag» som stilles oftest, ikke «hva gjør Ola».
 */
const DAG_START = 7;
const DAG_SLUTT = 18;
/** Piksler per time. 56 gir en 30-minutters jobb 28px — akkurat lesbart. */
const PX_PER_TIME = 56;

function rasterFor(jobber: { startsAt: string | Date; endsAt: string | Date }[]): {
  start: number;
  slutt: number;
} {
  let start = DAG_START;
  let slutt = DAG_SLUTT;
  for (const b of jobber) {
    const s = new Date(b.startsAt);
    const e = new Date(b.endsAt);
    start = Math.min(start, s.getHours());
    const sluttTime = e.getHours() + (e.getMinutes() > 0 || e.getSeconds() > 0 ? 1 : 0);
    slutt = Math.max(slutt, sluttTime);
  }
  return { start: Math.max(0, start), slutt: Math.min(24, Math.max(start + 1, slutt)) };
}

type Modus = 'dag' | 'uke';

function startAvDag(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Mandag som ukestart — norsk konvensjon, ikke søndag. */
function startAvUke(d: Date): Date {
  const x = startAvDag(d);
  const dag = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dag);
  return x;
}

function leggTilDager(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const DAGNAVN = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

export function Kalender({ mechanicId }: { mechanicId?: string }) {
  const [modus, setModus] = useState<Modus>('dag');
  const [anker, setAnker] = useState(() => startAvDag(new Date()));
  const [perMekaniker, setPerMekaniker] = useState(false);

  const fra = modus === 'dag' ? startAvDag(anker) : startAvUke(anker);
  const til = leggTilDager(fra, modus === 'dag' ? 1 : 7);

  const mekanikere = trpc.mechanics.list.useQuery();
  const jobber = trpc.bookings.calendar.useQuery({
    from: fra,
    to: til,
    mechanicId: mechanicId || undefined,
  });

  const dager = useMemo(
    () => Array.from({ length: modus === 'dag' ? 1 : 7 }, (_, i) => leggTilDager(fra, i)),
    [fra, modus],
  );

  // Kolonner: én per mekaniker, eller én samlet. Samme rendering begge veier
  // det er bare grupperingsnøkkelen som endrer seg.
  const kolonner = useMemo(() => {
    if (!perMekaniker || modus === 'uke') return [{ id: null as string | null, navn: 'Alle' }];
    const liste = (mekanikere.data ?? []).map((m) => ({ id: m.id as string | null, navn: m.name }));
    return liste.length > 0 ? liste : [{ id: null, navn: 'Alle' }];
  }, [perMekaniker, modus, mekanikere.data]);

  const rader = jobber.data ?? [];
  const { start: startTime, slutt: sluttTime } = rasterFor(rader);
  const timer = sluttTime - startTime;
  const timeliste = Array.from({ length: timer }, (_, i) => startTime + i);

  return (
    <div className="flex flex-col gap-3">
      {/* Styring */}
      <div className="flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="Tidsrom"
          className="inline-flex h-control items-center gap-0.5 rounded-control border border-border bg-bg p-0.5"
        >
          {(['dag', 'uke'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={modus === m}
              onClick={() => setModus(m)}
              className={`inline-flex h-7 items-center rounded-[7px] px-3 text-label transition-colors ${
                modus === m ? 'bg-sidebar-active text-fg' : 'text-fg-muted hover:text-fg'
              }`}
            >
              {m === 'dag' ? 'Dag' : 'Uke'}
            </button>
          ))}
        </div>

        <div className="inline-flex h-control items-center rounded-control border border-border bg-bg">
          <button
            type="button"
            aria-label="Forrige"
            onClick={() => setAnker(leggTilDager(fra, modus === 'dag' ? -1 : -7))}
            className="grid h-full w-8 place-items-center text-fg-muted transition-colors hover:text-fg"
          >
            <ChevronDown size={14} className="rotate-90" aria-hidden />
          </button>
          <button
            type="button"
            onClick={() => setAnker(startAvDag(new Date()))}
            className="h-full border-border border-x px-3 text-label text-fg"
          >
            I dag
          </button>
          <button
            type="button"
            aria-label="Neste"
            onClick={() => setAnker(leggTilDager(fra, modus === 'dag' ? 1 : 7))}
            className="grid h-full w-8 place-items-center text-fg-muted transition-colors hover:text-fg"
          >
            <ChevronRight size={14} aria-hidden />
          </button>
        </div>

        <span className="text-label text-fg">
          {modus === 'dag'
            ? fra.toLocaleDateString('nb-NO', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })
            : `${fra.toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })} – ${leggTilDager(fra, 6).toLocaleDateString('nb-NO', { day: 'numeric', month: 'short' })}`}
        </span>

        {/*
         * Per mekaniker gir bare mening i dagsvisning: syv dager × fem
         * mekanikere er 35 kolonner, og da er ingenting lesbart.
         */}
        {modus === 'dag' && (
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
        )}
      </div>

      {/* Rutenettet */}
      {jobber.isLoading ? (
        <div className="py-16 text-center text-body text-fg-muted">Laster kalender …</div>
      ) : jobber.isError ? (
        <CardShell className="p-6">
          <p className="text-body text-danger">{jobber.error.message}</p>
        </CardShell>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border bg-bg">
          <div className="min-w-[640px]">
            {/* Kolonnehoder */}
            <div className="flex border-border border-b bg-surface-2">
              <div className="w-14 shrink-0" />
              {modus === 'dag'
                ? kolonner.map((k) => (
                    <div
                      key={k.id ?? 'alle'}
                      className="flex-1 border-border border-l px-3 py-2 text-label text-fg"
                    >
                      {k.navn}
                    </div>
                  ))
                : dager.map((d) => {
                    const iDag = d.toDateString() === new Date().toDateString();
                    return (
                      <div
                        key={d.toISOString()}
                        className={`flex-1 border-border border-l px-2 py-2 text-center ${iDag ? 'bg-accent-soft' : ''}`}
                      >
                        <div className="text-[11px] text-fg-muted">
                          {DAGNAVN[(d.getDay() + 6) % 7]}
                        </div>
                        <div className="text-label text-fg tabular-nums">{d.getDate()}.</div>
                      </div>
                    );
                  })}
            </div>

            {/* Timeraster + klosser */}
            <div className="relative flex" style={{ height: timer * PX_PER_TIME }}>
              {/* Timelinjal */}
              <div className="w-14 shrink-0">
                {timeliste.map((time) => (
                  <div
                    key={time}
                    style={{ height: PX_PER_TIME }}
                    className="relative border-border border-b text-[11px] text-fg-muted tabular-nums"
                  >
                    <span className="absolute top-1 right-2">{time}:00</span>
                  </div>
                ))}
              </div>

              {(modus === 'dag' ? kolonner : dager).map((kol, kolIndex) => {
                const erDag = modus === 'dag';
                const kolonneJobber = rader.filter((b) => {
                  const start = new Date(b.startsAt);
                  if (erDag) {
                    const k = kol as { id: string | null };
                    return k.id == null || b.mechanicId === k.id;
                  }
                  return start.toDateString() === (kol as Date).toDateString();
                });

                return (
                  <div
                    key={
                      erDag
                        ? ((kol as { id: string | null }).id ?? 'alle')
                        : (kol as Date).toISOString()
                    }
                    className="relative min-w-0 flex-1 border-border border-l"
                  >
                    {/* Timelinjer bak klossene */}
                    {timeliste.map((time) => (
                      <div
                        key={time}
                        style={{ height: PX_PER_TIME }}
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

  const startTimer = start.getHours() + start.getMinutes() / 60;
  const sluttTimer = slutt.getHours() + slutt.getMinutes() / 60;

  const fra = Math.max(startTime, Math.min(startTimer, sluttTime));
  const til = Math.min(sluttTime, Math.max(sluttTimer, fra + 0.25));

  const top = (fra - startTime) * PX_PER_TIME;
  const height = Math.max(22, (til - fra) * PX_PER_TIME);

  return (
    <Link
      href={`/bookinger/${booking.id}` as Route}
      style={{ top, height }}
      className={`absolute right-1 left-1 overflow-hidden rounded-control border border-border px-2 py-1 transition-colors hover:border-border-strong ${
        STATUS_TONE[booking.status] ?? 'bg-surface-2 text-fg'
      }`}
      title={`${start.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })} · ${fmtServices(booking)}${booking.mechanicName ? ` · ${booking.mechanicName}` : ''}`}
      // Sørger for at senere klosser tegnes over tidligere ved overlapp.
      data-kol={kolIndex}
    >
      <div className="truncate font-medium text-[11px] tabular-nums">
        {start.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}{' '}
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
