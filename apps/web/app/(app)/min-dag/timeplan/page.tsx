'use client';

import { CalendarDays } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { osloKalenderdag } from '../../_lib/oslo-dag';
import {
  TIMEPLAN_DAG_SLUTT,
  TIMEPLAN_DAG_START,
  TIMEPLAN_PX_PER_TIME,
  TIMEPLAN_TIMELISTE,
  timeplanKloss,
} from '../../_shell/timeplan-dager';
import { TimeplanStripe } from '../../_shell/timeplan-stripe';
import { STATUS_LABEL } from '../_status';

export default function TimeplanPage() {
  const [valgt, setValgt] = useState(() => osloKalenderdag(new Date()));
  const day = trpc.mechanic.myDay.useQuery({ date: valgt });
  const jobs = day.data?.jobs ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-fg" />
        <h1 className="text-title text-fg">Timeplan</h1>
      </div>

      <TimeplanStripe valgt={valgt} onValgt={setValgt} />

      {day.isLoading ? <p className="text-[12px] text-fg-muted">Laster …</p> : null}

      <div className="overflow-hidden rounded-xl border border-border bg-bg">
        <div
          className="relative flex"
          style={{ height: TIMEPLAN_TIMELISTE.length * TIMEPLAN_PX_PER_TIME }}
        >
          <div className="w-14 shrink-0">
            {TIMEPLAN_TIMELISTE.map((time) => (
              <div
                key={time}
                style={{ height: TIMEPLAN_PX_PER_TIME }}
                className="relative border-border border-b text-[11px] text-fg-muted tabular-nums"
              >
                <span className="absolute top-1 right-2">{String(time).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 border-border border-l">
            {TIMEPLAN_TIMELISTE.map((time) => (
              <div
                key={time}
                style={{ height: TIMEPLAN_PX_PER_TIME }}
                className="border-border/60 border-b"
              />
            ))}
            {jobs.map((job) => {
              const { top, height } = timeplanKloss(job.startsAt, job.endsAt);
              return (
                <Link
                  key={job.id}
                  href={`/min-dag/${job.id}` as Route}
                  style={{ top, height }}
                  className="absolute right-1 left-1 overflow-hidden rounded-control border border-border bg-card px-2 py-1"
                >
                  <div className="truncate text-label text-fg">
                    {job.customerName ?? 'Ukjent kunde'}
                  </div>
                  {height > 32 ? (
                    <div className="truncate text-[11px] text-fg-muted">
                      {STATUS_LABEL[job.status] ?? job.status}
                    </div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>
      </div>

      <p className="text-[12px] text-fg-muted">
        Rutenettet er {String(TIMEPLAN_DAG_START).padStart(2, '0')}:00–
        {String(TIMEPLAN_DAG_SLUTT).padStart(2, '0')}:00.
      </p>
    </div>
  );
}
