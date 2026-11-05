'use client';

import { Inbox, Package, Users } from '@endwise/ui';
import { useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { BOOKING_LAGRET_EVENT, HJEM_PULSE_REFETCH, invalidateHjemPulse } from './hjem-pulse-sync';
import { HJEM_SCROLL_FLATE, PHONE_KORT_META, VERKSTED_INNHOLD } from './phone-home';
import {
  ansattePulse,
  avvikTeller,
  endringerVindu,
  foresporTeller,
  idagVisning,
  innboksRad,
  lagerRad,
  pulsdagOverskrift,
  tallKortStats,
} from './phone-home-pulse';
import {
  PulseAnalyserKort,
  PulseBunntekst,
  PulseHeroFlate,
  PulseJobbFlis,
  PulseRadKort,
} from './pulse-kort';

/**
 * Forhandler-hjem — Verkstedet / `/home`.
 * Claude-designet: toppkort · Analyse · Innboks · Lager · På jobb + Ny Jobb.
 * Tom dag = ekte 0, ikke PULSE_PLAUSIBEL. Boksene står.
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
  const mekanikerListe = trpc.mechanics.list.useQuery(undefined, HJEM_PULSE_REFETCH);
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
  const avvik = avvikTeller(jobber);
  const forespor = foresporTeller(jobber);
  const innboks = innboksRad(threads.data ?? []);
  const lager = lagerRad(deler.data ?? []);
  const ansatte = ansattePulse(mekanikerListe.data ?? oversikt.data ?? []);
  const analyser = tallKortStats(jobber, naa);

  return {
    bookings,
    threads,
    oversikt,
    mekanikerListe,
    deler,
    idag,
    dag,
    avvik,
    forespor,
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
    mekanikerListe,
    deler,
    idag,
    dag,
    avvik,
    forespor,
    innboks,
    lager,
    ansatte,
    analyser,
  } = useDealerHjemKort();
  const { tenantName } = useOrgRole();
  const lasterJobber = bookings.isLoading;

  return (
    <div className={className ?? 'flex flex-col gap-2.5'}>
      <PulseHeroFlate
        href={PHONE_KORT_META.idag.href}
        ukedag={dag.ukedag}
        dato={dag.dato}
        planlagt={idag.planlagt}
        paagaar={idag.paagaar}
        ferdig={idag.ferdig}
        lasterJobber={lasterJobber}
        avvik={avvik}
        forespor={forespor}
        lasterEndringer={lasterJobber}
      />

      <PulseAnalyserKort
        stats={analyser}
        href={PHONE_KORT_META.analyser.href}
        forhandlerNavn={tenantName}
        laster={lasterJobber}
        mobil
      />

      <PulseRadKort
        href={PHONE_KORT_META.innboks.href}
        ikon={Inbox}
        tittel="Uleste meldinger"
        teller={innboks.meldinger}
        laster={threads.isLoading}
        mobil
      />

      <PulseRadKort
        href={PHONE_KORT_META.lager.href}
        ikon={Package}
        tittel={lager.tittel}
        teller={lager.antall}
        laster={deler.isLoading}
        mobil
      />

      <div data-pulse-bunn className="flex w-full gap-3">
        <div className="min-w-0 flex-1 basis-0">
          <PulseRadKort
            href={PHONE_KORT_META.team.href}
            ikon={Users}
            tittel="På Jobb"
            teller={
              mekanikerListe.isLoading && oversikt.isLoading
                ? undefined
                : `${ansatte.paJobb}/${ansatte.totalt}`
            }
            laster={mekanikerListe.isLoading && oversikt.isLoading}
            kompakt
            mobil
          />
        </div>
        <div className="min-w-0 flex-1 basis-0">
          <PulseJobbFlis />
        </div>
      </div>

      <PulseBunntekst />
    </div>
  );
}

/** Bakoverkompatibelt alias — samme pulse-flate. */
export const DealerDestinasjonskort = DealerPulseKort;

export function PhoneHomeDealer() {
  return (
    <div className="flex min-h-full flex-col md:hidden">
      <h1 className="sr-only">Verkstedet</h1>
      <DealerPulseKort
        className={`${HJEM_SCROLL_FLATE} ${VERKSTED_INNHOLD} flex flex-1 flex-col gap-3 px-4 pt-3.5 pb-0`}
      />
    </div>
  );
}
