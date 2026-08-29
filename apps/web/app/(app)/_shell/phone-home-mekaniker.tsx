'use client';

import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../_lib/use-org-role';
import { fmtTime, STATUS_LABEL } from '../bookinger/_status';
import {
  MEKANIKER_TIMEPLAN_HREF,
  mekanikerHurtigKort,
  PHONE_KORT_FYLL,
  PHONE_KORT_META,
} from './phone-home';
import { jobbHva, minDagMeta } from './phone-home-data';
import { PhoneKort } from './phone-kort';

/**
 * Mekanikerens telefon-hjem. Samme fylte kortdesign som forhandler,
 * men ikke et destinasjonsrutenett: hero Min dag, hurtigkort, så jobber nedover.
 * Detaljer er accordion på raden — én åpen, ingen swipe, ingen tidslinje.
 */
export function PhoneHomeMekaniker() {
  const { shopEnabled } = useOrgRole();
  const day = trpc.mechanic.myDay.useQuery();
  const naa = useMemo(() => new Date(), []);
  const jobs = day.data?.jobs ?? [];
  const hurtig = mekanikerHurtigKort(shopEnabled);
  const [aapen, setAapen] = useState<string | null>(null);

  return (
    <div className="mx-auto flex w-full max-w-[520px] flex-col gap-3 px-3 py-3 md:hidden">
      <div className={`${PHONE_KORT_FYLL} flex flex-col gap-2 p-3`}>
        <h1 className="text-title">Min dag</h1>
        <p className="text-[12px] opacity-90">{minDagMeta(jobs, naa)}</p>
      </div>

      <div className={`grid gap-3 ${hurtig.length > 4 ? 'grid-cols-2' : 'grid-cols-2'}`}>
        {hurtig.map((key) => {
          const dest = PHONE_KORT_META[key];
          const href = key === 'timeplan' ? MEKANIKER_TIMEPLAN_HREF : dest.href;
          return <PhoneKort key={key} href={href} icon={dest.icon} navn={dest.label} />;
        })}
      </div>

      <section className="flex flex-col gap-2" aria-label="Jobber i dag">
        {day.isLoading ? <p className="text-[12px] text-fg-muted">Laster …</p> : null}
        {!day.isLoading && jobs.length === 0 ? (
          <p className="text-[12px] text-fg-muted">Ingen jobber i dag</p>
        ) : null}
        {jobs.map((job) => {
          const open = aapen === job.id;
          return (
            <article key={job.id} className={`${PHONE_KORT_FYLL} flex flex-col gap-2 p-3`}>
              <div className="flex items-center gap-2">
                <span className="shrink-0 text-title tabular-nums">{fmtTime(job.startsAt)}</span>
                <span className="min-w-0 flex-1 truncate text-title">{jobbHva(job)}</span>
                <button
                  type="button"
                  aria-expanded={open}
                  className="inline-flex h-control shrink-0 items-center rounded-control bg-accent-fg px-3 text-label text-accent"
                  onClick={() => setAapen((forrige) => (forrige === job.id ? null : job.id))}
                >
                  Detaljer
                </button>
              </div>
              {open ? (
                <div className="flex flex-col gap-1 text-[12px] opacity-90">
                  <p>{job.customerName ?? 'Ukjent kunde'}</p>
                  <p>
                    {job.regNumber ?? 'Uten regnr'}
                    {job.vehicleType ? ` · ${job.vehicleType}` : ''}
                  </p>
                  <p>
                    {fmtTime(job.startsAt)}–{fmtTime(job.endsAt)} ·{' '}
                    {STATUS_LABEL[job.status] ?? job.status}
                  </p>
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </div>
  );
}
