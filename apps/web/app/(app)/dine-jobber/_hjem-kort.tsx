'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { hjemJobbSlots } from './_hjem';
import { JobbRad } from './_rad';

/**
 * Stort Dine jobber-kort på mekaniker-hjem (telefon + desktop).
 * Fast høyde: tre h-row-store-spor. Tomme spor forblir tomme.
 */
export function DineJobberHjemKort() {
  const day = trpc.mechanic.myDay.useQuery();
  const jobs = day.data?.jobs ?? [];
  const slots = hjemJobbSlots(jobs);
  const tom = !day.isLoading && jobs.length === 0;

  return (
    <article
      data-dine-jobber-hjem
      className="flex w-full flex-col gap-3 rounded-xl border border-border bg-card p-3"
    >
      <h2 className="text-title text-fg">Dine jobber</h2>
      <ul className="flex h-[148px] shrink-0 flex-col gap-2">
        {slots.map((job, i) => (
          <li key={job?.id ?? `tom-${i}`} className="h-row-store min-h-row-store">
            {job ? (
              <JobbRad
                id={job.id}
                startsAt={job.startsAt}
                vehicleType={job.vehicleType}
                customerName={job.customerName}
              />
            ) : day.isLoading && i === 0 ? (
              <p className="flex h-row-store items-center text-[12px] text-fg-muted">Laster …</p>
            ) : tom && i === 0 ? (
              <p className="flex h-row-store items-center text-[12px] text-fg-muted">
                Ingen jobber i dag
              </p>
            ) : null}
          </li>
        ))}
      </ul>
      <Link
        href={'/dine-jobber' as Route}
        data-se-alle-jobber
        data-hjem-hig-primaer=""
        className="inline-flex h-11 min-h-11 w-full shrink-0 items-center justify-center rounded-control bg-fg text-bg text-label"
      >
        Se alle jobber
      </Link>
    </article>
  );
}
