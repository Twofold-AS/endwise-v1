'use client';

import { type EndringKind, utdragEndring } from '@endwise/modules/booking/changes';
import type { Route } from 'next';
import Link from 'next/link';
import { trpc } from '@/lib/trpc';
import { invalidateHjemPulse, meldingBookingLagret } from '../_shell/hjem-pulse-sync';
import { fmtDateTime } from '../bookinger/_status';
import { type EndringerDelId, endringerHref } from './_faner';

type BookingRad = {
  id: string;
  notes?: string | null;
  serviceName?: string | null;
  customerName?: string | null;
  mechanicName?: string | null;
  startsAt: Date | string;
  status: string;
  regNumber?: string | null;
};

/**
 * Timeplan › Endring-detalj. Godkjenn/Avslå kaller `bookings.resolveChange`.
 */
export function TimeplanEndringDetalj({
  jobb,
  kind,
  tilbake,
}: {
  jobb: BookingRad;
  kind: EndringKind;
  tilbake: EndringerDelId;
}) {
  const utils = trpc.useUtils();
  const resolve = trpc.bookings.resolveChange.useMutation({
    onSuccess: () => {
      void utils.bookings.list.invalidate();
      void utils.bookings.byId.invalidate({ id: jobb.id });
      invalidateHjemPulse(utils);
      meldingBookingLagret();
    },
  });

  const typeLabel = kind === 'forespor' ? 'Forespørsel' : 'Avvik';

  return (
    <div data-endringer-detalj={jobb.id} className="flex flex-col gap-4">
      <Link
        href={endringerHref(tilbake) as Route}
        className="text-[12px] text-fg-muted hover:text-fg"
      >
        ← {tilbake === 'logg' ? 'Logg' : typeLabel}
      </Link>

      <div>
        <h2 className="text-title text-fg">{typeLabel}</h2>
        <p className="text-body text-fg-muted">
          {jobb.serviceName ?? 'Jobb'}
          {jobb.regNumber ? ` · ${jobb.regNumber}` : ''}
        </p>
      </div>

      <dl className="flex flex-col gap-2 rounded-[16px] border border-divide bg-card px-4 py-3 text-label">
        <Rad label="Type" verdi={typeLabel} />
        <Rad label="Jobb" verdi={jobb.serviceName ?? '—'} />
        <Rad label="Kunde" verdi={jobb.customerName ?? '—'} />
        <Rad label="Mekaniker" verdi={jobb.mechanicName ?? '—'} />
        <Rad label="Tid" verdi={fmtDateTime(jobb.startsAt)} />
        <Rad label="Status" verdi={jobb.status} />
      </dl>

      <div className="rounded-[16px] border border-divide bg-card px-4 py-3">
        <p className="mb-1 text-[12px] text-fg-muted">Meldt</p>
        <p className="whitespace-pre-wrap text-label text-fg">{utdragEndring(jobb.notes, kind)}</p>
      </div>

      {tilbake === 'logg' ? (
        <p className="text-[12px] text-fg-muted">Behandlet. Angre finnes ikke ennå.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-endringer-godkjenn
            disabled={resolve.isPending}
            className="inline-flex h-10 items-center rounded-full bg-fg px-4 text-[12px] font-[650] text-bg disabled:opacity-40"
            onClick={() => resolve.mutate({ bookingId: jobb.id, kind, decision: 'godkjent' })}
          >
            {resolve.isPending ? 'Lagrer …' : 'Godkjenn'}
          </button>
          <button
            type="button"
            data-endringer-avsla
            disabled={resolve.isPending}
            className="inline-flex h-10 items-center rounded-full border border-border px-4 text-[12px] font-[650] text-fg disabled:opacity-40"
            onClick={() => resolve.mutate({ bookingId: jobb.id, kind, decision: 'avslatt' })}
          >
            Avslå
          </button>
          <Link
            href={`/bookinger/${jobb.id}` as Route}
            className="inline-flex h-10 items-center px-2 text-[12px] text-fg underline-offset-2 hover:underline"
          >
            Åpne jobb
          </Link>
        </div>
      )}

      {resolve.isSuccess ? (
        <p className="text-[12px] text-fg">
          {resolve.data.decision === 'godkjent'
            ? 'Godkjent og skrevet til jobben.'
            : 'Avslått og skrevet til jobben.'}
        </p>
      ) : null}
      {resolve.isError ? <p className="text-[12px] text-danger">{resolve.error.message}</p> : null}
    </div>
  );
}

function Rad({ label, verdi }: { label: string; verdi: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="truncate text-fg">{verdi}</dd>
    </div>
  );
}
