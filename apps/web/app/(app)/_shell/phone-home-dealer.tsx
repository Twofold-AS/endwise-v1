'use client';

import { Inbox, Package, Users } from '@endwise/ui';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { HJEM_SCROLL_FLATE, PHONE_KORT_META, VERKSTED_INNHOLD } from './phone-home';
import {
  ansattePulse,
  dagerVindu,
  idagVisning,
  innboksRad,
  lagerRad,
  siste30dSpark,
} from './phone-home-pulse';
import { Pulse30dSpark, PulseJobbFlis, PulseKort, PulseRadKort, PulseTall } from './pulse-kort';

/**
 * Forhandler-hjem — Verkstedet / `/home`.
 * Fem flater: toppkort · Innboks-rad · Lager-rad · ansatte + Jobb 50/50.
 */
export function useDealerHjemKort() {
  const vindu = useMemo(() => dagerVindu(new Date()), []);

  const bookings = trpc.bookings.list.useQuery({
    from: vindu.fra,
    to: vindu.til,
    limit: 200,
  });
  const threads = trpc.messages.listThreads.useQuery();
  const oversikt = trpc.mechanics.oversikt.useQuery();
  const deler = trpc.inventory.listParts.useQuery({
    kunLav: true,
    sorter: 'sku',
    retning: 'asc',
    limit: 100,
  });

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const idag = idagVisning(jobber, naa);
  const spark = siste30dSpark(jobber, naa);
  const innboks = innboksRad(threads.data ?? []);
  const lager = lagerRad(deler.data ?? []);
  const ansatte = ansattePulse(oversikt.data ?? []);

  return {
    bookings,
    threads,
    oversikt,
    deler,
    idag,
    spark,
    innboks,
    lager,
    ansatte,
  };
}

export function DealerPulseKort({ className }: { className?: string }) {
  const { bookings, threads, oversikt, deler, idag, spark, innboks, lager, ansatte } =
    useDealerHjemKort();
  const lasterJobber = bookings.isLoading;

  return (
    <div className={className ?? 'flex flex-col gap-5'}>
      <PulseKort href={PHONE_KORT_META.idag.href} variant="hero">
        <p className="text-label font-[650] text-fg">Siste 30 dager</p>
        <div className="grid min-w-0 grid-cols-3 divide-x divide-divide">
          <PulseTall label="Planlagt" verdi={idag.planlagt} laster={lasterJobber} />
          <PulseTall label="Pågår" verdi={idag.paagaar} laster={lasterJobber} />
          <PulseTall label="Ferdig" verdi={idag.ferdig} laster={lasterJobber} />
        </div>
        <Pulse30dSpark verdier={spark} />
      </PulseKort>

      <PulseRadKort
        href={PHONE_KORT_META.innboks.href}
        ikon={Inbox}
        tittel="Les alle siste meldinger"
        teller={innboks.meldinger}
        laster={threads.isLoading}
      />

      <PulseRadKort
        href={PHONE_KORT_META.lager.href}
        ikon={Package}
        tittel={lager.tittel}
        teller={lager.antall}
        laster={deler.isLoading}
      />

      <div data-pulse-bunn className="flex w-full gap-3">
        <div className="min-w-0 flex-1 basis-0">
          <PulseRadKort
            href={PHONE_KORT_META.team.href}
            ikon={Users}
            tittel="På jobb"
            teller={oversikt.isLoading ? undefined : `${ansatte.paJobb} / ${ansatte.totalt}`}
            laster={oversikt.isLoading}
            kompakt
          />
        </div>
        <div className="min-w-0 flex-1 basis-0">
          <PulseJobbFlis />
        </div>
      </div>
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
