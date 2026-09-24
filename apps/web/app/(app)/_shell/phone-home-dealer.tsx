'use client';

import { Inbox, Package } from '@endwise/ui';
import { useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { fmtSlaAlder, fmtSvarMs } from './claude-tokens';
import { BOOKING_LAGRET_EVENT, HJEM_PULSE_REFETCH, invalidateHjemPulse } from './hjem-pulse-sync';
import { HJEM_SCROLL_FLATE, PHONE_KORT_META, VERKSTED_INNHOLD } from './phone-home';
import {
  avvikTeller,
  endringerVindu,
  foresporTeller,
  gulvRader,
  idagVisning,
  innboksRad,
  lagerRad,
  pulsdagOverskrift,
  siste7dSpark,
  tallCeller,
  tallVindu,
  teamRader,
} from './phone-home-pulse';
import {
  PulseFooter,
  PulseGulvKort,
  PulseHeroFlate,
  PulseRadKort,
  PulseSvarKort,
  PulseTallKort,
  PulseTeamKort,
} from './pulse-kort';

/**
 * Forhandler-hjem — Verkstedet / `/home`.
 * Claude-stack: I dag · Innboks · Deler · Svarhastighet · Gulv · Team · Tall · footer.
 */
export function useDealerHjemKort() {
  const utils = trpc.useUtils();
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const tall = useMemo(() => tallVindu(new Date()), []);

  const bookings = trpc.bookings.list.useQuery(
    {
      from: vindu.fra,
      to: vindu.til,
      limit: 200,
    },
    HJEM_PULSE_REFETCH,
  );
  const tallBookings = trpc.bookings.list.useQuery(
    {
      from: tall.fra,
      to: tall.til,
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
  const svar = trpc.messages.svarhastighet.useQuery(undefined, HJEM_PULSE_REFETCH);

  useEffect(() => {
    function oppfrisk() {
      invalidateHjemPulse(utils);
      void bookings.refetch();
      void tallBookings.refetch();
      void oversikt.refetch();
    }
    window.addEventListener(BOOKING_LAGRET_EVENT, oppfrisk);
    return () => window.removeEventListener(BOOKING_LAGRET_EVENT, oppfrisk);
  }, [utils, bookings, tallBookings, oversikt]);

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const idag = idagVisning(jobber, naa);
  const dag = pulsdagOverskrift(naa);
  const avvik = avvikTeller(jobber);
  const forespor = foresporTeller(jobber);
  const innboks = innboksRad(threads.data ?? [], naa);
  const lager = lagerRad(deler.data ?? []);
  const spark = siste7dSpark(jobber, naa);
  const gulv = gulvRader(jobber, naa, 3);
  const team = teamRader(oversikt.data ?? [], jobber, naa);
  const celler = tallCeller(tallBookings.data ?? [], naa);

  return {
    bookings,
    threads,
    oversikt,
    deler,
    svar,
    idag,
    dag,
    avvik,
    forespor,
    innboks,
    lager,
    spark,
    gulv,
    team,
    celler,
  };
}

export function DealerPulseKort({ className }: { className?: string }) {
  const {
    bookings,
    threads,
    oversikt,
    deler,
    svar,
    idag,
    dag,
    avvik,
    forespor,
    innboks,
    lager,
    spark,
    gulv,
    team,
    celler,
  } = useDealerHjemKort();
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
        spark={spark}
      />

      <PulseRadKort
        href={PHONE_KORT_META.innboks.href}
        ikon={Inbox}
        tittel={innboks.meldinger > 0 ? 'Uleste meldinger' : 'Ingen uleste'}
        teller={
          threads.isLoading
            ? undefined
            : innboks.meldinger > 0
              ? `${innboks.meldinger}${innboks.slaMs != null ? ` · ${fmtSlaAlder(new Date(Date.now() - innboks.slaMs))}` : ''}`
              : 0
        }
        laster={threads.isLoading}
      />

      <PulseRadKort
        href={PHONE_KORT_META.deler.href}
        ikon={Package}
        tittel={lager.tittel}
        teller={lager.antall}
        laster={deler.isLoading}
      />

      <PulseSvarKort
        verdi={
          svar.data?.medianMs == null
            ? 'For lite data'
            : `${fmtSvarMs(svar.data.medianMs)} · 7 dager`
        }
        laster={svar.isLoading}
      />

      <PulseGulvKort rader={gulv} laster={lasterJobber} jobbHref="/bookinger/ny" />
      <PulseTeamKort medlemmer={team} laster={oversikt.isLoading} />
      <PulseTallKort celler={celler} href={PHONE_KORT_META.tall.href} />
      <PulseFooter />
    </div>
  );
}

/** Bakoverkompatibelt alias — samme pulse-flate. */
export const DealerDestinasjonskort = DealerPulseKort;

export function PhoneHomeDealer() {
  return (
    <DealerPulseKort
      className={`${HJEM_SCROLL_FLATE} ${VERKSTED_INNHOLD} flex flex-col gap-2.5 py-3 md:hidden`}
    />
  );
}
