'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import {
  dealerPhoneHjemRader,
  PHONE_KORT_META,
  type PhoneKortKey,
  VERKSTED_INNHOLD,
} from './phone-home';
import {
  innboksMeta,
  kunderMeta,
  lagerMeta,
  organisasjonMeta,
  statistikkSetning,
  timeplanMeta,
  tjenesterMeta,
  verkstedHeroTall,
} from './phone-home-data';
import { PhoneKort } from './phone-kort';

/**
 * Forhandlerens destinasjonskort — telefon-hjem og desktop-hjem.
 * Fylt med ekte meta fra eksisterende tRPC-ruter.
 */
export function useDealerHjemKort() {
  const { shopEnabled, tenantName } = useOrgRole();
  const kort = trpc.forhandler.kort.useQuery();
  const bookings = trpc.bookings.list.useQuery({ limit: 100 });
  const threads = trpc.messages.listThreads.useQuery();
  const customers = trpc.customers.list.useQuery({
    sorter: 'opprettet',
    retning: 'desc',
    kilde: 'alle',
    limit: 50,
  });
  const oversikt = trpc.mechanics.oversikt.useQuery();
  const lave = trpc.inventory.listParts.useQuery({
    kunLav: true,
    sorter: 'sku',
    retning: 'asc',
    limit: 5,
  });
  const bevegelser = trpc.inventory.listMovements.useQuery({ limit: 5 });
  const tjenester = trpc.services.list.useQuery();

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const hero = verkstedHeroTall(jobber, naa);
  const innboks = innboksMeta(threads.data ?? []);
  const rader = dealerPhoneHjemRader(shopEnabled);

  const metaFor = (key: PhoneKortKey): { text?: string; ulest?: number } => {
    if (key === 'statistikk') return { text: statistikkSetning(jobber, naa) };
    if (key === 'tjenester') return { text: tjenesterMeta(tjenester.data ?? []) };
    if (key === 'innboks') return { text: innboks.linje, ulest: innboks.ulest };
    if (key === 'timeplan' || key === 'jobber') return { text: timeplanMeta(jobber, naa) };
    if (key === 'kunder') return { text: kunderMeta(customers.data ?? []) };
    if (key === 'organisasjon') return { text: organisasjonMeta(oversikt.data ?? []) };
    if (key === 'lager') return { text: lagerMeta(lave.data ?? [], bevegelser.data ?? []) };
    if (key === 'butikk') return { text: 'Katalog og kasse' };
    if (key === 'hjelp') return { text: 'Artikler og support' };
    return { text: 'Åpne destinasjonen' };
  };

  return {
    tenantName,
    kort,
    bookings,
    hero,
    rader,
    metaFor,
  };
}

export function DealerDestinasjonskort({
  utenHero = false,
  className,
}: {
  utenHero?: boolean;
  className?: string;
}) {
  const { tenantName, kort, bookings, hero, rader, metaFor } = useDealerHjemKort();

  return (
    <div className={className ?? 'flex flex-col gap-3'}>
      {rader.map((rad) => {
        if (rad.keys[0] === 'verkstedet') {
          if (utenHero) return null;
          const dest = PHONE_KORT_META.verkstedet;
          const forhandlernavn = tenantName?.trim() || kort.data?.name?.trim() || dest.label;
          return (
            <PhoneKort
              key="verkstedet"
              href={dest.href}
              icon={dest.icon}
              navn={forhandlernavn}
              className="w-full"
            >
              <div className="grid grid-cols-3 gap-2">
                <HeroTall label="I dag" verdi={hero.idag} laster={bookings.isLoading} />
                <HeroTall label="Pågår" verdi={hero.paagaar} laster={bookings.isLoading} />
                <HeroTall label="Fullført" verdi={hero.fullfort} laster={bookings.isLoading} />
              </div>
            </PhoneKort>
          );
        }

        const par = rad.keys;
        return (
          <div
            key={par.join('|')}
            className={par.length === 1 ? 'grid grid-cols-1 gap-3' : 'grid grid-cols-2 gap-3'}
          >
            {par.map((key) => {
              const dest = PHONE_KORT_META[key];
              const fyll = metaFor(key);
              return (
                <PhoneKort
                  key={key}
                  href={dest.href}
                  icon={dest.icon}
                  navn={dest.label}
                  meta={fyll.text}
                  ulest={fyll.ulest}
                />
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function PhoneHomeDealer() {
  return (
    <DealerDestinasjonskort className={`${VERKSTED_INNHOLD} flex flex-col gap-3 py-3 md:hidden`} />
  );
}

function HeroTall({ label, verdi, laster }: { label: string; verdi: number; laster: boolean }) {
  return (
    <div className="rounded-lg bg-surface-2 p-2">
      <p className="text-[12px] text-fg-muted">{label}</p>
      <p className="text-title text-fg tabular-nums">
        {laster ? (
          <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-border" />
        ) : (
          verdi
        )}
      </p>
    </div>
  );
}
