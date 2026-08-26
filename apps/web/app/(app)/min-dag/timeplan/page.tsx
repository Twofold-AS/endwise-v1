'use client';

import { CalendarDays, Car } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { estMinutes, fmtTime, STATUS_LABEL } from '../_status';

/** Timeplan: velg dag i strip, se den dagens jobber (mekaniker-scopet). */
function dayList(): { iso: string; label: string; weekday: string }[] {
  const out: { iso: string; label: string; weekday: string }[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    out.push({
      iso: d.toISOString(),
      label: d.toLocaleDateString('nb-NO', { day: '2-digit', month: 'short' }),
      weekday: d.toLocaleDateString('nb-NO', { weekday: 'short' }),
    });
  }
  return out;
}

export default function TimeplanPage() {
  const days = dayList();
  const [selected, setSelected] = useState(days[0].iso);
  const day = trpc.mechanic.myDay.useQuery({ date: selected });
  const jobs = day.data?.jobs ?? [];

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <CalendarDays size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Timeplan</h1>
      </div>

      {/* Dag-strip — store trykkmål. */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {days.map((d) => {
          const active = d.iso === selected;
          return (
            <button
              type="button"
              key={d.iso}
              onClick={() => setSelected(d.iso)}
              className={`flex min-w-[56px] shrink-0 flex-col items-center gap-0.5 rounded-xl border px-3 py-2 ${
                active
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-card text-fg-muted'
              }`}
            >
              <span className="text-[10px] uppercase">{d.weekday}</span>
              <span className="font-semibold text-[13px]">{d.label}</span>
            </button>
          );
        })}
      </div>

      {day.isLoading && <p className="text-fg-faint text-sm">Laster …</p>}
      {!day.isLoading && jobs.length === 0 && (
        <p className="text-fg-faint text-sm">Ingen jobber denne dagen.</p>
      )}

      <div className="flex flex-col gap-2.5">
        {jobs.map((job) => (
          <Link key={job.id} href={`/min-dag/${job.id}` as Route} className="block">
            <CardShell>
              <div className="flex items-center gap-3 rounded-lg bg-inset p-3.5">
                <div className="w-14 shrink-0 text-center font-semibold text-[13px] text-primary tabular-nums">
                  {fmtTime(job.startsAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <Car size={13} className="shrink-0 text-fg-muted" />
                    <span className="truncate font-semibold text-[13px] text-fg">
                      {job.regNumber ?? 'Ukjent regnr'}
                    </span>
                  </div>
                  <p className="truncate text-fg-faint text-xs">
                    {job.customerName ?? 'Ukjent kunde'} · est.{' '}
                    {estMinutes(job.startsAt, job.endsAt)} min
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[10px] text-fg-muted">
                  {STATUS_LABEL[job.status] ?? job.status}
                </span>
              </div>
            </CardShell>
          </Link>
        ))}
      </div>
    </div>
  );
}
