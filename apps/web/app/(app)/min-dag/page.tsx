'use client';

import { Car, ChevronRight, ShieldCheck } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../_shell/cards';
import { PhoneHomeMekaniker } from '../_shell/phone-home-mekaniker';
import { estMinutes, fmtTime, STATUS_LABEL } from './_status';

/**
 * F7 — Mekanikerens «Min dag». Dagens jobber i rekkefølge, scopet til den
 * innloggede mekanikeren (server: mechanics.userId + RLS). Sertifiseringsvarsel
 * øverst. Ekte backend (bookings); seed gir konkret innhold.
 */
export default function MinDagPage() {
  const day = trpc.mechanic.myDay.useQuery();
  const certs = trpc.mechanic.myCertifications.useQuery();

  const expiring = (certs.data ?? []).filter((c) => {
    if (!c.certificationExpiresAt) return false;
    const days = (new Date(c.certificationExpiresAt).getTime() - Date.now()) / 86_400_000;
    return days < 60;
  });

  const jobs = day.data?.jobs ?? [];

  return (
    <>
      <PhoneHomeMekaniker />
      <div className="mx-auto hidden w-full max-w-[820px] flex-col gap-4 px-6 py-7 md:flex">
        <div>
          <h1 className="font-semibold text-fg text-xl tracking-tight">Min dag</h1>
          <p className="text-fg-muted text-sm">
            {day.data?.mechanic?.name ? `${day.data.mechanic.name} · ` : ''}
            {jobs.length} jobb{jobs.length === 1 ? '' : 'er'} i dag
          </p>
        </div>

        {expiring.length > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-warn/25 bg-warn/10 px-3 py-2 text-sm text-warn">
            <ShieldCheck size={15} />
            {expiring.length} sertifisering{expiring.length === 1 ? '' : 'er'} utløper snart —{' '}
            {expiring.map((c) => c.skillKey).join(', ')}
          </div>
        )}

        {day.isLoading && <p className="text-fg-faint text-sm">Laster …</p>}
        {!day.isLoading && jobs.length === 0 && (
          <p className="text-fg-faint text-sm">Ingen jobber i køen i dag.</p>
        )}

        <div className="flex flex-col gap-3">
          {jobs.map((job, i) => (
            <Link key={job.id} href={`/min-dag/${job.id}` as Route} className="block">
              <CardShell>
                <div className="flex items-center gap-4 rounded-lg bg-inset p-4">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 font-semibold text-fg text-sm tabular-nums">
                    {i + 1}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <Car size={14} className="shrink-0 text-fg-muted" />
                      <span className="truncate font-semibold text-[14px] text-fg">
                        {job.regNumber ?? 'Ukjent regnr'}
                      </span>
                      <span className="text-fg-faint text-xs uppercase">{job.vehicleType}</span>
                    </div>
                    <p className="truncate text-fg-muted text-xs">
                      {job.customerName ?? 'Ukjent kunde'} · {fmtTime(job.startsAt)}–
                      {fmtTime(job.endsAt)} · est. {estMinutes(job.startsAt, job.endsAt)} min
                    </p>
                  </div>
                  <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-[11px] text-fg-muted">
                    {STATUS_LABEL[job.status] ?? job.status}
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-fg-faint" />
                </div>
              </CardShell>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
