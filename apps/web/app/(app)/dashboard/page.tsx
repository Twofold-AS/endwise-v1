'use client';

import { CalendarCheck, ClipboardList, Inbox, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { fmtServices, fmtTime, STATUS_LABEL, STATUS_TONE } from '../bookinger/_status';

/**
 * VERKSTEDET (F3-05/F5-01) — forhandlerens landingsside.
 *
 * ── Ryddet 06.08.2026 (eiers beslutning) ───────────────────────────────────
 * Siden viste tre ting som ikke betydde noe for en verkstedeier:
 *
 *   · fire KPI-kort med oppdiktede tall («412 000 kr», «87 % belegg»)
 *   · en 30-dagers booking-tabell med genererte rader
 *   · en liste over ANDRE FORHANDLERE — Endwise-interne data på forhandlerens
 *     egen forside. Det var rett og slett feil skjerm
 *
 * Alt tre er fjernet. Det som står igjen er **ekte data fra `bookings.list`**:
 * dagens saker, og tre tellere utledet fra de samme radene. Ingenting er
 * oppdiktet, så ingenting trenger et «Mock»-merke.
 *
 * Er det tomt, sier siden det — en tom dag er informasjon, ikke en feil.
 */
export default function VerkstedetPage() {
  const bookings = trpc.bookings.list.useQuery({ limit: 100 });
  const mechanics = trpc.mechanics.list.useQuery();

  const { idag, paagaar, ferdigIdag, rader } = useMemo(() => {
    const alle = bookings.data ?? [];
    const naa = new Date();
    const sammeDag = (d: Date | string) => new Date(d).toDateString() === naa.toDateString();

    const dagens = alle
      .filter((b) => sammeDag(b.startsAt))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

    return {
      idag: dagens.length,
      paagaar: dagens.filter((b) => b.status === 'in_progress').length,
      ferdigIdag: dagens.filter((b) => b.status === 'completed').length,
      rader: dagens,
    };
  }, [bookings.data]);

  const mekName = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of mechanics.data ?? []) m.set(x.id, x.name);
    return m;
  }, [mechanics.data]);

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      {/* Breadcrumben sier «Verkstedet» — h1 er skjult for øyet, beholdt for
          skjermlesere og dokumentstruktur. */}
      <div>
        <h1 className="sr-only">Verkstedet</h1>
        <p className="text-title text-fg">Her er dagen din, sjef 👋</p>
        <p className="text-body text-fg-muted">Alt under er hentet fra dine egne saker.</p>
      </div>

      {/* Tre tellere, alle utledet fra samme spørring. Ingen mock. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Teller icon={CalendarCheck} label="Saker i dag" verdi={idag} laster={bookings.isLoading} />
        <Teller icon={Wrench} label="Pågår nå" verdi={paagaar} laster={bookings.isLoading} />
        <Teller
          icon={ClipboardList}
          label="Fullført i dag"
          verdi={ferdigIdag}
          laster={bookings.isLoading}
        />
      </div>

      {/* Dagens saker — ekte rader. */}
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">Dagens saker</h2>
          <Link
            href={'/saker' as Route}
            className="text-[12px] text-fg-muted transition-colors hover:text-fg"
          >
            Se alle →
          </Link>
        </div>

        {bookings.isLoading ? (
          <div className="py-12 text-center text-body text-fg-muted">Laster …</div>
        ) : bookings.isError ? (
          <CardShell className="p-6">
            <p className="text-body text-danger">
              Kunne ikke hente saker: {bookings.error.message}
            </p>
          </CardShell>
        ) : rader.length === 0 ? (
          <CardShell className="p-10 text-center">
            <p className="text-label text-fg">Ingen saker i dag</p>
            <p className="mt-1 text-[12px] text-fg-muted">
              Kalenderen er tom. Det er enten en rolig dag eller en mulighet.
            </p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {rader.map((b, i) => (
              <Link key={b.id} href={`/bookinger/${b.id}` as Route} className="group block">
                <div
                  className={`flex h-row-store items-center gap-4 bg-bg px-4 transition-colors group-hover:bg-surface-2 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <span className="w-12 shrink-0 text-label text-fg tabular-nums">
                    {fmtTime(b.startsAt)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">
                      {b.regNumber ?? 'Uten regnr'}
                    </span>
                    <span className="truncate text-[12px] text-fg-muted">
                      {fmtServices(b)} · {mekName.get(b.mechanicId) ?? b.mechanicName}
                    </span>
                  </div>
                  <span
                    className={`inline-flex h-badge shrink-0 items-center rounded-badge px-2 font-medium text-[11px] ${
                      STATUS_TONE[b.status] ?? 'bg-surface-2 text-fg-muted'
                    }`}
                  >
                    {STATUS_LABEL[b.status] ?? b.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      <p className="flex items-center gap-1.5 text-[12px] text-fg-muted">
        <Inbox size={14} />
        Meldinger fra kunder og mekanikere finner du i Innboks.
      </p>
    </div>
  );
}

function Teller({
  icon: Icon,
  label,
  verdi,
  laster,
}: {
  icon: typeof Wrench;
  label: string;
  verdi: number;
  laster: boolean;
}) {
  return (
    <CardShell>
      <div className="flex flex-col gap-2 p-3">
        <p className="flex items-center gap-2 text-label text-fg-muted">
          <Icon size={16} strokeWidth={1.75} className="shrink-0" />
          {label}
        </p>
        <p className="font-medium text-[28px] text-fg leading-none tabular-nums">
          {laster ? '—' : verdi}
        </p>
      </div>
    </CardShell>
  );
}
