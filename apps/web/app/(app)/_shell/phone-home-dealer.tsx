'use client';

import { Inbox, Package, Users } from '@endwise/ui';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { HJEM_SCROLL_FLATE, PHONE_KORT_META, VERKSTED_INNHOLD } from './phone-home';
import {
  ansattePulse,
  idagVisning,
  innboksRad,
  lagerRad,
  manedBookingTall,
  manedVindu,
} from './phone-home-pulse';
import { PulseJobbFlis, PulseKort, PulseManedBoble, PulseRadKort, PulseTall } from './pulse-kort';

/**
 * Forhandler-hjem — Verkstedet / `/home`.
 * Fem flater: toppkort · Innboks-rad · Lager-rad · ansatte + Jobb.
 * Chrome urørt. Ronny/profil urørt.
 */
export function useDealerHjemKort() {
  const vindu = useMemo(() => manedVindu(new Date()), []);

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
  const maned = manedBookingTall(jobber, naa);
  const innboks = innboksRad(threads.data ?? [], naa);
  const lager = lagerRad(deler.data ?? []);
  const ansatte = ansattePulse(oversikt.data ?? []);

  return {
    bookings,
    threads,
    oversikt,
    deler,
    idag,
    maned,
    innboks,
    lager,
    ansatte,
  };
}

export function DealerPulseKort({ className }: { className?: string }) {
  const { bookings, threads, oversikt, deler, idag, maned, innboks, lager, ansatte } =
    useDealerHjemKort();
  const lasterJobber = bookings.isLoading;
  const mockHero = !lasterJobber && (idag.mock || maned.mock);

  return (
    <div className={className ?? 'flex flex-col gap-5'}>
      <PulseKort href={PHONE_KORT_META.idag.href} variant="hero" mock={mockHero}>
        <div className="flex items-end justify-between gap-4">
          <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-divide">
            <PulseTall label="Planlagt" verdi={idag.planlagt} laster={lasterJobber} />
            <PulseTall label="Pågår" verdi={idag.paagaar} laster={lasterJobber} />
            <PulseTall label="Ferdig" verdi={idag.ferdig} laster={lasterJobber} />
          </div>
          <PulseManedBoble denne={maned.denne} forrige={maned.forrige} mock={maned.mock} />
        </div>
      </PulseKort>

      <PulseRadKort
        href={PHONE_KORT_META.innboks.href}
        ikon={Inbox}
        tittel="Les alle siste meldinger"
        teller={innboks.meldinger}
        bar={innboks.bar}
        nye={innboks.nye}
        tone={innboks.tone}
        laster={threads.isLoading}
        mock={!threads.isLoading && innboks.mock}
      />

      <PulseRadKort
        href={PHONE_KORT_META.lager.href}
        ikon={Package}
        tittel={lager.tittel}
        teller={lager.antall}
        nye={lager.godkjenning > 0 ? lager.godkjenning : undefined}
        laster={deler.isLoading}
      />

      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
        <PulseRadKort
          href={PHONE_KORT_META.team.href}
          ikon={Users}
          tittel="På jobb"
          teller={oversikt.isLoading ? undefined : `${ansatte.paJobb} / ${ansatte.totalt}`}
          laster={oversikt.isLoading}
        />
        <PulseJobbFlis />
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
