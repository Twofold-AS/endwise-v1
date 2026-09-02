'use client';

import { CalendarCheck, ClipboardList, Inbox, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { sammeOsloDag } from '../_lib/oslo-dag';
import { useOrgRole } from '../_lib/use-org-role';
import { CardShell } from '../_shell/cards';
import { PhoneHomeDealer } from '../_shell/phone-home-dealer';
import { fmtServices, fmtTime, STATUS_LABEL, STATUS_TONE } from '../bookinger/_status';
import { AnsattePaJobb } from './_ansatte-pa-jobb';
import { Timeplan } from './_timeplan';
import { VerkstedetDag } from './_verkstedet-dag';

/**
 * Verkstedet (F3-05/F5-01) — forhandlerens landingsside.
 * Ryddet (eiers beslutning)
 * Siden viste tre ting som ikke betydde noe for en verkstedeier:
 * fire KPI-kort med oppdiktede tall («412 000 kr», «87 % belegg»)
 * en 30-dagers booking-tabell med genererte rader
 * en liste over andre forhandlere — Endwise-interne data på forhandlerens
 * egen forside. Det var rett og slett feil skjerm
 * Alt tre er fjernet. Det som står igjen er **ekte data fra `bookings.list`**:
 * dagens saker, og tre tellere utledet fra de samme radene. Ingenting er
 * oppdiktet, så ingenting trenger et «Mock»-merke.
 * Er det tomt, sier siden det — en tom dag er informasjon, ikke en feil.
 */
function VerkstedetPageInner() {
  const search = useSearchParams();
  const dag = search?.get('visning') === 'dag';

  return (
    <>
      {dag ? <VerkstedetDag /> : <PhoneHomeDealer />}
      <div className="hidden md:block">
        <VerkstedetDesktop />
      </div>
    </>
  );
}

/**
 * Suspense-grense er påkrevd: siden leser `useSearchParams` (?visning=dag).
 * Uten den faller /dashboard og aliaset /verkstedet ut av prerender
 * og `next build` feiler.
 */
export default function VerkstedetPage() {
  return (
    <Suspense
      fallback={<div className="px-8 py-7 text-body text-fg-muted">Laster verkstedet …</div>}
    >
      <VerkstedetPageInner />
    </Suspense>
  );
}

function VerkstedetDesktop() {
  const { tenantName } = useOrgRole();
  const kort = trpc.forhandler.kort.useQuery();
  const bookings = trpc.bookings.list.useQuery({ limit: 100 });
  const mechanics = trpc.mechanics.list.useQuery();
  const oversikt = trpc.mechanics.oversikt.useQuery();
  const forhandlernavn = tenantName?.trim() || kort.data?.name?.trim() || 'Forhandleren';

  const { idag, paagaar, ferdigIdag, rader } = useMemo(() => {
    const alle = bookings.data ?? [];
    const naa = new Date();
    const sammeDag = (d: Date | string) => sammeOsloDag(d, naa);

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
      {/*
       * Mikael 02.09: synlig hero-tittel er forhandlernavn.
       * «Verkstedet» / «Her er dagen din» beholdes skjult.
       */}
      <div className="sr-only">
        <h1>Verkstedet</h1>
        <p>Her er dagen din, sjef 👋</p>
        <p>Alt under er hentet fra dine egne saker.</p>
      </div>
      <Link href={'/dashboard?visning=dag' as Route} data-verkstedet-hero className="block">
        <CardShell>
          <div className="px-3 py-4">
            <p className="text-title text-fg">
              {kort.isLoading && !tenantName ? '…' : forhandlernavn}
            </p>
          </div>
        </CardShell>
      </Link>

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

      <AnsattePaJobb
        mekanikere={oversikt.data}
        jobber={bookings.data}
        laster={oversikt.isLoading}
      />

      <Timeplan
        jobber={bookings.data}
        mekName={mekName}
        laster={bookings.isLoading}
        feil={bookings.isError ? bookings.error.message : undefined}
      />

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
            <p className="text-label text-fg">Ingen jobber i dag</p>
            <p className="mt-1 text-[12px] text-fg-muted">
              Dagen er tom. Opprett en jobb uten å forlate verkstedet.
            </p>
            <Link
              href={'/bookinger/ny' as Route}
              className="mt-4 inline-flex h-control items-center rounded-control bg-fg px-4 text-label text-bg"
            >
              Ny jobb
            </Link>
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
          {laster ? (
            <span className="inline-block h-7 w-10 animate-pulse rounded-sm bg-surface-2" />
          ) : (
            verdi
          )}
        </p>
      </div>
    </CardShell>
  );
}
