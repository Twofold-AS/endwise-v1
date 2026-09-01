'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { ForhandlerInfoKort } from './forhandler-info-kort';
import { dealerPhoneHjemRader, PHONE_KORT_META, type PhoneKortKey } from './phone-home';
import {
  innboksMeta,
  kunderMeta,
  lagerMeta,
  organisasjonMeta,
  statistikkSetning,
  verkstedHeroTall,
} from './phone-home-data';
import { PhoneKort } from './phone-kort';

/**
 * Forhandlerens telefon-hjem. Fylte kort med ekte meta.
 * Verkstedet-hero er tellere, ikke en jobbliste. Tap = dagen.
 * Timeplan-kortet er destinasjon (ikon + navn) — ingen jobbliste på kortet.
 */
export function PhoneHomeDealer() {
  const { shopEnabled } = useOrgRole();
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
    if (key === 'tjenester') {
      const n = (tjenester.data ?? []).filter((t) => t.active).length;
      return { text: n === 0 ? 'Ingen tjenester ennå' : `${n} bookbare` };
    }
    if (key === 'innboks') return { text: innboks.linje, ulest: innboks.ulest };
    if (key === 'timeplan') return {};
    if (key === 'kunder') return { text: kunderMeta(customers.data ?? []) };
    if (key === 'organisasjon') return { text: organisasjonMeta(oversikt.data ?? []) };
    if (key === 'lager') return { text: lagerMeta(lave.data ?? [], bevegelser.data ?? []) };
    if (key === 'butikk') return { text: 'Katalog og kasse' };
    return {};
  };

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-3 py-3 md:hidden">
      <ForhandlerInfoKort />
      {rader.map((rad) => {
        if (rad.keys[0] === 'verkstedet') {
          const dest = PHONE_KORT_META.verkstedet;
          return (
            <PhoneKort
              key="verkstedet"
              href={dest.href}
              icon={dest.icon}
              navn={dest.label}
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
