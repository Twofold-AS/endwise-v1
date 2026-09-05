'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import {
  dealerPhoneHjemRader,
  HJEM_KORT_TOM,
  PHONE_KORT_META,
  type PhoneKortKey,
  VERKSTED_INNHOLD,
} from './phone-home';
import {
  innboksMeta,
  jobberMeta,
  kunderMeta,
  lagerMeta,
  organisasjonMeta,
  statistikkSetning,
  timeplanRader,
  verkstedHeroTall,
} from './phone-home-data';
import { PhoneKort } from './phone-kort';

/**
 * Forhandlerens destinasjonskort — telefon-hjem og desktop-hjem.
 * Jonas Apple-hjem 05.09: hero + 2-og-2, fylt fra eksisterende tRPC.
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

  const naa = useMemo(() => new Date(), []);
  const jobber = bookings.data ?? [];
  const hero = verkstedHeroTall(jobber, naa);
  const innboks = innboksMeta(threads.data ?? []);
  const plan = timeplanRader(jobber, naa, 4);
  const rader = dealerPhoneHjemRader(shopEnabled);

  const metaFor = (key: PhoneKortKey): { text?: string; ulest?: number } => {
    if (key === 'statistikk') return { text: statistikkSetning(jobber, naa) };
    if (key === 'innboks') return { text: innboks.linje, ulest: innboks.ulest };
    if (key === 'timeplan') {
      return { text: plan.length === 0 ? HJEM_KORT_TOM.timeplan : undefined };
    }
    if (key === 'jobber') return { text: jobberMeta(jobber, naa) };
    if (key === 'kunder') return { text: kunderMeta(customers.data ?? []) };
    if (key === 'organisasjon') return { text: organisasjonMeta(oversikt.data ?? []) };
    if (key === 'lager') return { text: lagerMeta(lave.data ?? [], bevegelser.data ?? []) };
    if (key === 'butikk') return { text: 'Katalog og kasse' };
    if (key === 'hjelp') return { text: HJEM_KORT_TOM.hjelp };
    if (key === 'samarbeid') return { text: 'Åpne samarbeid' };
    return { text: 'Åpne destinasjonen' };
  };

  return {
    tenantName,
    kort,
    bookings,
    hero,
    plan,
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
  const { tenantName, kort, bookings, hero, plan, rader, metaFor } = useDealerHjemKort();

  return (
    <div className={className ?? 'flex flex-col gap-4'}>
      {rader.map((rad) => {
        if (rad.keys[0] === 'verkstedet') {
          if (utenHero) return null;
          const dest = PHONE_KORT_META.verkstedet;
          const forhandlernavn = tenantName?.trim() || kort.data?.name?.trim() || dest.label;
          const tomDag = !bookings.isLoading && hero.idag === 0;
          return (
            <PhoneKort
              key="verkstedet"
              href={dest.href}
              icon={dest.icon}
              navn={forhandlernavn}
              className="w-full"
              variant="hero"
              meta={tomDag ? HJEM_KORT_TOM.hero : undefined}
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
            data-hjem-rad={par.join('|')}
            className={par.length === 1 ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-2 gap-4'}
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
                >
                  {key === 'timeplan' && plan.length > 0 ? (
                    <ul className="flex flex-col gap-1">
                      {plan.map((radRad) => (
                        <li
                          key={radRad.id}
                          className="flex gap-2 text-[12px] text-fg-muted leading-snug"
                        >
                          <span className="shrink-0 text-fg tabular-nums">{radRad.time}</span>
                          <span className="min-w-0 truncate">{radRad.what}</span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </PhoneKort>
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
    <DealerDestinasjonskort className={`${VERKSTED_INNHOLD} flex flex-col gap-4 py-4 md:hidden`} />
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
