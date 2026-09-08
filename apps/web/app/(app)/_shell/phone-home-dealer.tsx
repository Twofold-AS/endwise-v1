'use client';

import { Inbox, Package, Users } from '@endwise/ui';
import { useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { BOOKING_LAGRET_EVENT, HJEM_PULSE_REFETCH, invalidateHjemPulse } from './hjem-pulse-sync';
import { HJEM_SCROLL_FLATE, PHONE_KORT_META, VERKSTED_INNHOLD } from './phone-home';
import {
  analyserMockStats,
  ansattePulse,
  endringerTeller,
  endringerVindu,
  idagVisning,
  innboksRad,
  lagerRad,
  pulsdagOverskrift,
} from './phone-home-pulse';
import { PulseAnalyserKort, PulseHeroFlate, PulseJobbFlis, PulseRadKort } from './pulse-kort';

/**
 * Forhandler-hjem — Verkstedet / `/home`.
 * Låste flater: toppkort · Innboks · Lager · ansatte + Jobb · Analyser nederst.
 */
export function useDealerHjemKort() {
  const utils = trpc.useUtils();
  const vindu = useMemo(() => endringerVindu(new Date()), []);

  const bookings = trpc.bookings.list.useQuery(
    {
      from: vindu.fra,
      to: vindu.til,
      limit: 200,
    },
    HJEM_PULSE_REFETCH,
  );
  const threads = trpc.messages.listThreads.useQuery(undefined, HJEM_PULSE_REFETCH);
  const oversikt = trpc.mechanics.oversikt.useQuery(undefined, HJEM_PULSE_REFETCH);
  const deler = trpc.inventory.listParts.useQuery(
    {
      kunLav: true,
      sorter: 'sku',
      retning: 'asc',
      limit: 100,
    },
    HJEM_PULSE_REFETCH,
  );

  useEffect(() => {
    function oppfrisk() {
      invalidateHjemPulse(utils);
      void bookings.refetch();
      void oversikt.refetch();
    }
    window.addEventListener(BOOKING_LAGRET_EVENT, oppfrisk);
    return () => window.removeEventListener(BOOKING_LAGRET_EVENT, oppfrisk);
  }, [utils, bookings, oversikt]);

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const idag = idagVisning(jobber, naa);
  const dag = pulsdagOverskrift(naa);
  const endringer = endringerTeller(jobber);
  const innboks = innboksRad(threads.data ?? []);
  const lager = lagerRad(deler.data ?? []);
  const ansatte = ansattePulse(oversikt.data ?? [], jobber, naa);
  const analyser = analyserMockStats(naa);

  return {
    bookings,
    threads,
    oversikt,
    deler,
    idag,
    dag,
    endringer,
    innboks,
    lager,
    ansatte,
    analyser,
  };
}

export function DealerPulseKort({ className }: { className?: string }) {
  const {
    bookings,
    threads,
    oversikt,
    deler,
    idag,
    dag,
    endringer,
    innboks,
    lager,
    ansatte,
    analyser,
  } = useDealerHjemKort();
  const lasterJobber = bookings.isLoading;

  return (
    <div className={className ?? 'flex flex-col gap-5'}>
      <PulseHeroFlate
        href={PHONE_KORT_META.idag.href}
        ukedag={dag.ukedag}
        dato={dag.dato}
        planlagt={idag.planlagt}
        paagaar={idag.paagaar}
        ferdig={idag.ferdig}
        lasterJobber={lasterJobber}
        endringer={endringer}
        lasterEndringer={lasterJobber}
      />

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

      <PulseAnalyserKort stats={analyser} href={PHONE_KORT_META.analyser.href} />
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
