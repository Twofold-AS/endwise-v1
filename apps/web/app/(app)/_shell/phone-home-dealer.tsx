'use client';

import { DitherGrowthChart } from '@endwise/ui';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { osloKalenderdag, osloPlusDager, osloStartAvDag } from '../_lib/oslo-dag';
import { PeopleShowcase } from './people-showcase';
import { HJEM_KORT_TOM, HJEM_SCROLL_FLATE, PHONE_KORT_META, VERKSTED_INNHOLD } from './phone-home';
import {
  delerPaApneJobber,
  ferdigSpark7d,
  idagTall,
  innboksPulse,
  nesteTreJobber,
  svarhastighetVisning,
  teamPulse,
} from './phone-home-pulse';
import { PulseFooter, PulseKort, PulseTall } from './pulse-kort';

const INK = '#141414';

/**
 * Forhandler-pulse hjem — Verkstedet / `/home`.
 * Seks operative kort + footer-tekst. Chrome urørt.
 */
export function useDealerHjemKort() {
  const fra = useMemo(() => osloStartAvDag(osloPlusDager(osloKalenderdag(new Date()), -6)), []);
  const til = useMemo(() => osloStartAvDag(osloPlusDager(osloKalenderdag(new Date()), 8)), []);

  const bookings = trpc.bookings.list.useQuery({
    from: fra,
    to: til,
    limit: 200,
  });
  const threads = trpc.messages.listThreads.useQuery();
  const svar = trpc.messages.svarhastighet.useQuery();
  const oversikt = trpc.mechanics.oversikt.useQuery();
  const deler = trpc.inventory.listParts.useQuery({
    kunLav: false,
    sorter: 'sku',
    retning: 'asc',
    limit: 100,
  });

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const idag = idagTall(jobber, naa);
  const spark = ferdigSpark7d(jobber, naa);
  const innboks = innboksPulse(threads.data ?? [], naa);
  const delerKort = delerPaApneJobber(deler.data ?? [], jobber);
  const svarKort = svarhastighetVisning(svar.data?.medianMs ?? null);
  const plan = nesteTreJobber(jobber, naa, 3);
  const team = teamPulse(oversikt.data ?? []);

  return {
    bookings,
    threads,
    svar,
    oversikt,
    idag,
    spark,
    innboks,
    delerKort,
    svarKort,
    plan,
    team,
  };
}

export function DealerPulseKort({ className }: { className?: string }) {
  const {
    bookings,
    threads,
    svar,
    oversikt,
    idag,
    spark,
    innboks,
    delerKort,
    svarKort,
    plan,
    team,
  } = useDealerHjemKort();
  const lasterJobber = bookings.isLoading;

  return (
    <div className={className ?? 'flex flex-col gap-5'}>
      <PulseKort href={PHONE_KORT_META.idag.href} navn="I dag" variant="hero">
        <div className="grid grid-cols-3 divide-x divide-divide">
          <PulseTall label="Starter" verdi={idag.starter} laster={lasterJobber} />
          <PulseTall label="Pågår" verdi={idag.paagaar} laster={lasterJobber} />
          <PulseTall label="Ferdig" verdi={idag.ferdig} laster={lasterJobber} />
        </div>
        <div className="pointer-events-none h-12 w-full" aria-hidden>
          <DitherGrowthChart
            theme="light"
            compact
            values={spark.values}
            labels={spark.labels}
            color={INK}
          />
        </div>
      </PulseKort>

      <PulseKort
        href={PHONE_KORT_META.innboks.href}
        navn="Innboks"
        verdi={innboks.ulest}
        meta={innboks.sla}
        laster={threads.isLoading}
      />

      <PulseKort
        href={PHONE_KORT_META.deler.href}
        navn="Deler"
        verdi={delerKort.antall}
        meta={delerKort.meta}
        laster={lasterJobber}
      />

      <PulseKort
        href={PHONE_KORT_META.svarhastighet.href}
        navn="Svarhastighet"
        verdi={svarKort.tall}
        meta={svarKort.meta}
        laster={svar.isLoading}
      />

      <PulseKort
        href={PHONE_KORT_META.timeplan.href}
        navn="Timeplan-gulv"
        meta={plan.length === 0 ? HJEM_KORT_TOM.timeplan : undefined}
      >
        {plan.length > 0 ? (
          <ul className="flex flex-col gap-1.5">
            {plan.map((rad) => (
              <li key={rad.id} className="flex gap-2 text-[12px] text-fg-muted leading-snug">
                <span className="shrink-0 text-fg tabular-nums">{rad.time}</span>
                <span className="min-w-0 truncate">{rad.what}</span>
                <span className="shrink-0 text-fg-faint">{rad.who}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </PulseKort>

      <PulseKort
        href={PHONE_KORT_META.team.href}
        navn="Team"
        verdi={oversikt.isLoading ? undefined : `${team.ledig}/${team.opptatt}`}
        meta={team.meta}
        laster={oversikt.isLoading}
      >
        <PeopleShowcase folk={oversikt.data ?? []} />
      </PulseKort>

      <PulseFooter />
    </div>
  );
}

/** Bakoverkompatibelt alias — samme pulse-flate. */
export const DealerDestinasjonskort = DealerPulseKort;

export function PhoneHomeDealer() {
  return (
    <DealerPulseKort
      className={`${HJEM_SCROLL_FLATE} ${VERKSTED_INNHOLD} flex flex-col gap-5 py-5 md:hidden`}
    />
  );
}
