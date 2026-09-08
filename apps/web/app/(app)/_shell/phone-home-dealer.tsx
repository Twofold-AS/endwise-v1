'use client';

import { Inbox, Package, Plus, Users } from '@endwise/ui';
import { useMemo } from 'react';
import { useTema } from '@/app/_lib/tema-provider';
import { trpc } from '@/lib/trpc';
import { osloKalenderdag, osloStartAvDag } from '../_lib/oslo-dag';
import { HJEM_SCROLL_FLATE, PHONE_KORT_META, VERKSTED_INNHOLD } from './phone-home';
import {
  ansattePaJobb,
  bookingMaanedVsForrige,
  foresporselTrend,
  idagVisning,
  lagerVenter,
  maanedSparkVisning,
  osloForrigeMaanedStart,
  osloNesteMaanedStart,
  sisteMeldinger,
} from './phone-home-pulse';
import { PulseFooter, PulseKort, PulseLinjeKort, PulseMaanedBoble, PulseTall } from './pulse-kort';

/**
 * Forhandler-pulse hjem v2 — Verkstedet / `/home`.
 * I dag + Innboks/Lager/Ansatte/+Jobb. Chrome urørt.
 */
export function useDealerHjemKort() {
  const fra = useMemo(
    () => osloStartAvDag(osloForrigeMaanedStart(osloKalenderdag(new Date()))),
    [],
  );
  const til = useMemo(() => osloStartAvDag(osloNesteMaanedStart(osloKalenderdag(new Date()))), []);

  const bookings = trpc.bookings.list.useQuery({
    from: fra,
    to: til,
    limit: 200,
  });
  const threads = trpc.messages.listThreads.useQuery();
  const oversikt = trpc.mechanics.oversikt.useQuery();
  const deler = trpc.inventory.listParts.useQuery({
    kunLav: false,
    sorter: 'sku',
    retning: 'asc',
    limit: 100,
  });

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const idag = idagVisning(jobber, naa);
  const maaned = maanedSparkVisning(bookingMaanedVsForrige(jobber, naa));
  const innboks = sisteMeldinger(threads.data ?? []);
  const foresporsel = foresporselTrend(jobber, naa);
  const lager = lagerVenter(deler.data ?? []);
  const team = ansattePaJobb(oversikt.data ?? []);

  return {
    bookings,
    threads,
    oversikt,
    deler,
    idag,
    maaned,
    innboks,
    foresporsel,
    lager,
    team,
  };
}

export function DealerPulseKort({ className }: { className?: string }) {
  const {
    bookings,
    threads,
    oversikt,
    deler,
    idag,
    maaned,
    innboks,
    foresporsel,
    lager,
    team,
  } = useDealerHjemKort();
  const { los } = useTema();
  const lasterJobber = bookings.isLoading;

  return (
    <div className={className ?? 'flex flex-col gap-5'}>
      <PulseKort
        href={PHONE_KORT_META.idag.href}
        navn="I dag"
        variant="hero"
        mock={!lasterJobber && (idag.mock || maaned.mock)}
      >
        <div className="flex items-end justify-between gap-4">
          <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-divide">
            <PulseTall label="Planlagt" verdi={idag.planlagt} laster={lasterJobber} />
            <PulseTall label="Pågår" verdi={idag.paagaar} laster={lasterJobber} />
            <PulseTall label="Ferdig" verdi={idag.ferdig} laster={lasterJobber} />
          </div>
          <PulseMaanedBoble denne={maaned.denne} forrige={maaned.forrige} mork={los === 'dark'} />
        </div>
      </PulseKort>

      <PulseLinjeKort
        href={PHONE_KORT_META.innboks.href}
        ikon={Inbox}
        tekst="Les alle siste meldinger"
        tall={innboks.ulest}
        laster={threads.isLoading}
        mock={!threads.isLoading && foresporsel.mock}
        trend={foresporsel}
      />

      <PulseLinjeKort
        href={PHONE_KORT_META.lager.href}
        ikon={Package}
        tekst={lager.tekst}
        tall={lager.antall}
        laster={deler.isLoading}
      />

      <PulseLinjeKort
        href={PHONE_KORT_META.team.href}
        ikon={Users}
        tekst={team.tekst}
        tall={oversikt.isLoading ? undefined : team.tall}
        laster={oversikt.isLoading}
      />

      <PulseLinjeKort
        href={PHONE_KORT_META.jobb.href}
        ikon={Plus}
        ikonVariant="box"
        tekst="Jobb"
      />

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
