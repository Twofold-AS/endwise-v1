'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import {
  dealerPhoneHjemRader,
  PHONE_KORT_FYLL,
  PHONE_KORT_META,
  type PhoneKortKey,
} from './phone-home';
import {
  hjelpMeta,
  innboksMeta,
  kunderMeta,
  lagerMeta,
  nesteJobb,
  organisasjonMeta,
  rapporterSetning,
  statistikkSetning,
  timeplanRader,
  verkstedHeroTall,
} from './phone-home-data';
import { PhoneKort } from './phone-kort';

/**
 * Forhandlerens telefon-hjem. Fylte kort med ekte meta.
 * Verkstedet-hero er tellere, ikke en jobbliste. Tap = dagen.
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
  const artikler = trpc.helpdesk.list.useQuery({ limit: 20 });
  const lave = trpc.inventory.listParts.useQuery({
    kunLav: true,
    sorter: 'sku',
    retning: 'asc',
    limit: 5,
  });
  const bevegelser = trpc.inventory.listMovements.useQuery({ limit: 5 });

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const hero = verkstedHeroTall(jobber, naa);
  const plan = timeplanRader(jobber, naa, 4);
  const neste = nesteJobb(jobber, naa);
  const innboks = innboksMeta(threads.data ?? []);
  const rader = dealerPhoneHjemRader(shopEnabled);

  const metaFor = (key: PhoneKortKey): { text?: string; ulest?: number } => {
    if (key === 'statistikk') return { text: statistikkSetning(jobber, naa) };
    if (key === 'rapporter') return { text: rapporterSetning() };
    if (key === 'innboks') return { text: innboks.linje, ulest: innboks.ulest };
    if (key === 'jobber') {
      return { text: neste ? `${neste.time} · ${neste.what}` : 'Ingen jobber i dag' };
    }
    if (key === 'kunder') return { text: kunderMeta(customers.data ?? []) };
    if (key === 'organisasjon') return { text: organisasjonMeta(oversikt.data ?? []) };
    if (key === 'samarbeid') return { text: 'Ingen delt informasjon ennå' };
    if (key === 'hjelp') return { text: hjelpMeta(artikler.data ?? []) };
    if (key === 'lager') return { text: lagerMeta(lave.data ?? [], bevegelser.data ?? []) };
    if (key === 'butikk') return { text: 'Katalog og kasse' };
    return {};
  };

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-3 py-3 md:hidden">
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

        if (rad.keys[0] === 'timeplan') {
          const dest = PHONE_KORT_META.timeplan;
          return (
            <div key="timeplan" className="relative">
              <PhoneKort href={dest.href} icon={dest.icon} navn={dest.label} className="w-full">
                {plan.length === 0 ? (
                  <p className="text-[12px] opacity-90">Ingen jobber i dag</p>
                ) : (
                  <ul className="flex flex-col gap-1">
                    {plan.map((r) => (
                      <li key={`${r.time}-${r.what}`} className="flex gap-2 text-[12px]">
                        <span className="w-10 shrink-0 tabular-nums">{r.time}</span>
                        <span className="min-w-0 truncate">{r.what}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </PhoneKort>
              {plan.length === 0 ? (
                <Link
                  href={'/bookinger/ny' as Route}
                  className="absolute right-3 bottom-3 inline-flex h-control items-center rounded-control bg-accent-fg px-3 text-label text-accent"
                >
                  Ny jobb
                </Link>
              ) : null}
            </div>
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
    <div className={`${PHONE_KORT_FYLL} bg-accent-fg/10 p-2`}>
      <p className="text-[12px] opacity-90">{label}</p>
      <p className="text-title tabular-nums">
        {laster ? (
          <span className="inline-block h-4 w-6 animate-pulse rounded-sm bg-accent-fg/20" />
        ) : (
          verdi
        )}
      </p>
    </div>
  );
}
