'use client';

import { Bell, Car, ShieldCheck } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../_shell/cards';
import { fmtTime } from '../_status';

/**
 * F7-06 — Varsler-fane. Utledet feed fra mekanikerens egne data (RLS-scopet):
 * utløpende sertifiseringer + pågående jobber som trenger oppmerksomhet. En ekte
 * sanntids-push-strøm (SSE, kobles til F7-05-avvik/F6-02) kommer senere.
 */
export default function VarslerPage() {
  const certs = trpc.mechanic.myCertifications.useQuery();
  const day = trpc.mechanic.myDay.useQuery();

  const expiring = (certs.data ?? []).filter((c) => {
    if (!c.certificationExpiresAt) return false;
    return (new Date(c.certificationExpiresAt).getTime() - Date.now()) / 86_400_000 < 60;
  });
  const active = (day.data?.jobs ?? []).filter((j) => j.status === 'in_progress');

  const empty = expiring.length === 0 && active.length === 0;

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-4 px-4 py-6">
      <div className="flex items-center gap-2">
        <Bell size={18} className="text-primary" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">Varsler</h1>
      </div>

      {empty && <p className="text-fg-faint text-sm">Ingen varsler akkurat nå.</p>}

      {expiring.map((c) => (
        <CardShell key={c.skillKey}>
          <div className="flex items-start gap-3 rounded-lg bg-[#0e0e0e] p-4">
            <ShieldCheck size={16} className="mt-0.5 shrink-0 text-warn" />
            <div>
              <p className="font-semibold text-[13px] text-fg">Sertifisering utløper snart</p>
              <p className="text-fg-muted text-xs">
                {c.skillKey} — t.o.m.{' '}
                {c.certificationExpiresAt
                  ? new Date(c.certificationExpiresAt).toLocaleDateString('nb-NO')
                  : '—'}
              </p>
            </div>
          </div>
        </CardShell>
      ))}

      {active.map((j) => (
        <Link key={j.id} href={`/min-dag/${j.id}` as Route} className="block">
          <CardShell>
            <div className="flex items-start gap-3 rounded-lg bg-[#0e0e0e] p-4">
              <Car size={16} className="mt-0.5 shrink-0 text-primary" />
              <div>
                <p className="font-semibold text-[13px] text-fg">Jobb pågår</p>
                <p className="text-fg-muted text-xs">
                  {j.regNumber ?? 'Ukjent regnr'} · startet {fmtTime(j.startsAt)}
                </p>
              </div>
            </div>
          </CardShell>
        </Link>
      ))}
    </div>
  );
}
