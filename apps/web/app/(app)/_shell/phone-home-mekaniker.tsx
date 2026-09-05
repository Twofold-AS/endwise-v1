'use client';

import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { DineJobberHjemKort } from '../dine-jobber/_hjem-kort';
import { ForhandlerInfoKort } from './forhandler-info-kort';
import { MEKANIKER_TIMEPLAN_HREF, mekanikerHurtigKort, PHONE_KORT_META } from './phone-home';
import { hjelpMeta, lagerMeta, minDagMeta } from './phone-home-data';
import { PhoneKort } from './phone-kort';

/**
 * Mekanikerens telefon-hjem. Forhandler-info, stort Dine jobber-kort, Lager full
 * bredde, deretter små destinasjonskort. Ingen Min dag-hero, ingen accordion.
 */
export function PhoneHomeMekaniker() {
  const { shopEnabled } = useOrgRole();
  const hurtig = mekanikerHurtigKort(shopEnabled);
  const lager = PHONE_KORT_META.lager;
  const day = trpc.mechanic.myDay.useQuery();
  const certs = trpc.mechanic.myCertifications.useQuery();
  const artikler = trpc.helpdesk.list.useQuery({ limit: 8 }, { retry: false });
  const lave = trpc.inventory.listParts.useQuery({
    kunLav: true,
    sorter: 'sku',
    retning: 'asc',
    limit: 5,
  });
  const bevegelser = trpc.inventory.listMovements.useQuery({ limit: 5 });
  const naa = useMemo(() => new Date(), []);

  const jobber = (day.data?.jobs ?? []).map((j) => ({
    id: j.id,
    status: j.status,
    startsAt: j.startsAt,
    regNumber: j.regNumber,
    customerName: j.customerName,
  }));

  const metaFor = (key: (typeof hurtig)[number]): string => {
    if (key === 'timeplan') return minDagMeta(jobber, naa);
    if (key === 'hjelp') {
      return hjelpMeta((artikler.data ?? []).map((a) => ({ title: a.title, ulest: a.ulest })));
    }
    if (key === 'kompetanse') {
      const n = certs.data?.length ?? 0;
      return n === 0 ? 'Ingen sertifikater ennå' : `${n} sertifikat${n === 1 ? '' : 'er'}`;
    }
    if (key === 'butikk') return 'Katalog og kasse';
    return 'Åpne destinasjonen';
  };

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-3 py-3 md:hidden">
      <ForhandlerInfoKort />
      <DineJobberHjemKort />
      <PhoneKort
        href={lager.href}
        icon={lager.icon}
        navn={lager.label}
        className="w-full"
        meta={lagerMeta(lave.data ?? [], bevegelser.data ?? [])}
      />
      <div className="grid grid-cols-2 gap-3">
        {hurtig.map((key) => {
          const dest = PHONE_KORT_META[key];
          const href = key === 'timeplan' ? MEKANIKER_TIMEPLAN_HREF : dest.href;
          return (
            <PhoneKort
              key={key}
              href={href}
              icon={dest.icon}
              navn={dest.label}
              meta={metaFor(key)}
            />
          );
        })}
      </div>
    </div>
  );
}
