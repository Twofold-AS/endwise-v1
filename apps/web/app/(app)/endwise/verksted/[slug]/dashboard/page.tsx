'use client';

import { CalendarCheck, ClipboardList, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { CardShell } from '../../../../_shell/cards';
import { fmtTime, STATUS_LABEL, STATUS_TONE } from '../../../../bookinger/_status';
import { LesingFeil } from '../_lesing';

export default function VerkstedDashboardPage() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const slug = params?.slug ?? '';
  const fra = search?.get('fra');
  const q = fra ? `?fra=${encodeURIComponent(fra)}` : '';
  const data = trpc.verksted.dashboard.useQuery({ slug }, { enabled: Boolean(slug), retry: false });

  const { idag, paagaar, ferdigIdag, rader } = useMemo(() => {
    const alle = data.data?.bookings ?? [];
    const naa = new Date();
    const sammeDag = (d: Date | string) => new Date(d).toDateString() === naa.toDateString();
    const dagens = alle
      .filter((b) => sammeDag(b.startsAt))
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    return {
      idag: dagens.length,
      paagaar: dagens.filter((b) => b.status === 'in_progress').length,
      ferdigIdag: dagens.filter((b) => b.status === 'completed').length,
      rader: dagens,
    };
  }, [data.data]);

  if (data.isError) return <LesingFeil melding={data.error.message} />;

  return (
    <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-5 px-8 py-7">
      <div>
        <h1 className="sr-only">Verkstedet</h1>
        <p className="text-title text-fg">{data.data?.tenant.name ?? 'Verkstedet'}</p>
        <p className="text-body text-fg-muted">
          Kun lesing. Ingen skriving mot denne forhandleren.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Teller icon={CalendarCheck} label="Saker i dag" verdi={idag} laster={data.isLoading} />
        <Teller icon={Wrench} label="Pågår nå" verdi={paagaar} laster={data.isLoading} />
        <Teller
          icon={ClipboardList}
          label="Fullført i dag"
          verdi={ferdigIdag}
          laster={data.isLoading}
        />
      </div>
      <section className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-title text-fg">Dagens saker</h2>
          <Link
            href={`/endwise/verksted/${slug}/saker${q}` as Route}
            className="text-[12px] text-fg-muted hover:text-fg"
          >
            Se alle →
          </Link>
        </div>
        {data.isLoading ? (
          <p className="py-12 text-center text-body text-fg-muted">Laster …</p>
        ) : rader.length === 0 ? (
          <CardShell className="p-10 text-center">
            <p className="text-label text-fg">Ingen saker i dag</p>
          </CardShell>
        ) : (
          <div className="overflow-hidden rounded-xl border border-border">
            {rader.map((b, i) => (
              <div
                key={b.id}
                className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                  i > 0 ? 'border-border border-t' : ''
                }`}
              >
                <span className="w-12 shrink-0 text-label tabular-nums">{fmtTime(b.startsAt)}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-label text-fg">{b.regNumber ?? 'Uten regnr'}</span>
                  <span className="truncate text-[12px] text-fg-muted">
                    {b.serviceName ?? 'Tjeneste'} · {b.mechanicName}
                  </span>
                </div>
                <span
                  className={`inline-flex h-badge items-center rounded-badge px-2 font-medium text-[11px] ${
                    STATUS_TONE[b.status] ?? 'bg-surface-2 text-fg-muted'
                  }`}
                >
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Teller({
  icon: Icon,
  label,
  verdi,
  laster,
}: {
  icon: typeof Wrench;
  label: string;
  verdi: number;
  laster: boolean;
}) {
  return (
    <CardShell>
      <div className="flex flex-col gap-2 p-3">
        <p className="flex items-center gap-2 text-label text-fg-muted">
          <Icon size={16} strokeWidth={1.75} className="shrink-0" />
          {label}
        </p>
        <p className="font-medium text-[28px] text-fg leading-none tabular-nums">
          {laster ? '—' : verdi}
        </p>
      </div>
    </CardShell>
  );
}
