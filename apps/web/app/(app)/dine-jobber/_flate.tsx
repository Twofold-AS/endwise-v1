'use client';

import { trpc } from '@/lib/trpc';
import { ForhandlerGrainientKort } from '../_shell/forhandler-grainient';
import { JobbRad } from './_rad';

/**
 * Dine jobber — én boks per jobb. Pil åpner eksisterende START / FULLFØRT.
 * Forhandlernavn sitter bare på Grainient-kortet, ikke som egen heading.
 */
export function DineJobberFlate() {
  const day = trpc.mechanic.myDay.useQuery();
  const jobs = day.data?.jobs ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-3 px-3 py-4 md:px-6 md:py-7">
      <ForhandlerGrainientKort />
      <h1 className="text-title text-fg">Dine jobber</h1>

      {day.isLoading ? <p className="text-[12px] text-fg-muted">Laster …</p> : null}
      {!day.isLoading && jobs.length === 0 ? (
        <p className="text-[12px] text-fg-muted">Ingen jobber i dag</p>
      ) : null}

      <ul className="flex flex-col gap-2">
        {jobs.map((job) => (
          <li key={job.id}>
            <JobbRad
              id={job.id}
              startsAt={job.startsAt}
              vehicleType={job.vehicleType}
              customerName={job.customerName}
            />
          </li>
        ))}
      </ul>
    </div>
  );
}
