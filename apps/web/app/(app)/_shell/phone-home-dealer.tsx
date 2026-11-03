'use client';

import { flertall, ListeRad, Side, StatusChip, statusFraBooking } from '@endwise/ui';
import { useEffect, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { fmtTime } from '../bookinger/_status';
import { osloKalenderdag } from '../_lib/oslo-dag';
import { BOOKING_LAGRET_EVENT, HJEM_PULSE_REFETCH, invalidateHjemPulse } from './hjem-pulse-sync';
import { HJEM_SCROLL_FLATE, VERKSTED_INNHOLD } from './phone-home';
import {
  avvikTeller,
  endringerVindu,
  foresporTeller,
  idagVisning,
  innboksRad,
  lagerRad,
} from './phone-home-pulse';

/**
 * Forhandler-hjem — «Dagen din».
 * Hero med dagens jobber, «Trenger deg» kun når tallet > 0, én Ny jobb.
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
    }
    window.addEventListener(BOOKING_LAGRET_EVENT, oppfrisk);
    return () => window.removeEventListener(BOOKING_LAGRET_EVENT, oppfrisk);
  }, [utils, bookings]);

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const idag = idagVisning(jobber, naa);
  const avvik = avvikTeller(jobber);
  const forespor = foresporTeller(jobber);
  const innboks = innboksRad(threads.data ?? []);
  const lager = lagerRad(deler.data ?? []);
  const iDagYmd = osloKalenderdag(naa);
  const dagens = jobber
    .filter((j) => j.status !== 'cancelled' && osloKalenderdag(j.startsAt) === iDagYmd)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
  const neste = dagens.find((j) => j.status !== 'completed') ?? dagens[0] ?? null;
  const jobbAntall = idag.planlagt + idag.paagaar + idag.ferdig;

  return {
    bookings,
    threads,
    deler,
    idag,
    avvik,
    forespor,
    innboks,
    lager,
    neste,
    jobbAntall,
  };
}

export function DealerPulseKort({ className }: { className?: string }) {
  const { bookings, threads, deler, avvik, forespor, innboks, lager, neste, jobbAntall } =
    useDealerHjemKort();

  const trenger: { href: string; tittel: string }[] = [];
  if (avvik > 0) trenger.push({ href: '/jobber?fane=avvik', tittel: flertall(avvik, 'avvik', 'avvik') });
  if (forespor > 0) {
    trenger.push({
      href: '/jobber?fane=forespor',
      tittel: flertall(forespor, 'forespørsel', 'forespørsler'),
    });
  }
  if (innboks.meldinger > 0) {
    trenger.push({
      href: '/innboks',
      tittel: flertall(innboks.meldinger, 'ulest melding', 'uleste meldinger'),
    });
  }
  if (lager.antall > 0) {
    trenger.push({
      href: '/lager',
      tittel: flertall(lager.antall, 'del under minimum', 'deler under minimum'),
    });
  }

  return (
    <div data-dagen-din className={className ?? 'flex flex-col gap-4'}>
      <section
        data-dagen-hero
        className="rounded-[24px] border border-border bg-bg p-4"
      >
        <p className="text-title text-fg">
          I dag: {flertall(jobbAntall, 'jobb', 'jobber')}
        </p>
        {bookings.isLoading ? (
          <p className="mt-2 text-body text-fg-muted">Henter jobbene …</p>
        ) : neste ? (
          <p className="mt-2 text-body text-fg">
            Neste: {fmtTime(neste.startsAt)} · {neste.customerName ?? 'Kunde'} ·{' '}
            {neste.serviceName ?? 'Tjeneste'}
            <StatusChip status={statusFraBooking(neste.status)} />
          </p>
        ) : (
          <p className="mt-2 text-body text-fg-muted">Ingen jobber i dag.</p>
        )}
        <a
          href="/jobber?ny=1"
          data-ny-jobb
          className="mt-4 inline-flex h-12 w-full items-center justify-center rounded-pill bg-fg text-body text-bg"
        >
          Ny jobb
        </a>
      </section>

      <section data-trenger-deg>
        <h2 className="text-title text-fg">Trenger deg</h2>
        {threads.isLoading || deler.isLoading || bookings.isLoading ? (
          <p className="mt-2 text-body text-fg-muted">Sjekker …</p>
        ) : trenger.length === 0 ? (
          <p className="mt-2 text-body text-fg-muted">Alt er i orden.</p>
        ) : (
          <div className="mt-1">
            {trenger.map((rad) => (
              <ListeRad key={rad.href} tittel={rad.tittel} href={rad.href} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

/** Bakoverkompatibelt alias — samme pulse-flate. */
export const DealerDestinasjonskort = DealerPulseKort;

export function PhoneHomeDealer() {
  return (
    <Side tittel="Dagen din" undertekst="Her er det som gjelder i dag.">
      <DealerPulseKort
        className={`${HJEM_SCROLL_FLATE} ${VERKSTED_INNHOLD} flex flex-col gap-4 py-0`}
      />
    </Side>
  );
}
