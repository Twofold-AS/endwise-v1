'use client';

import {
  type EndringKind,
  parseVentendeOnske,
  utdragEndring,
} from '@endwise/modules/booking/changes';
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
 * Logg har Angre behandling via `bookings.undoChange`.
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
  const oppfrisk = () => {
    void utils.bookings.list.invalidate();
    void utils.bookings.byId.invalidate({ id: jobb.id });
    invalidateHjemPulse(utils);
    meldingBookingLagret();
  };
  const resolve = trpc.bookings.resolveChange.useMutation({ onSuccess: oppfrisk });
  const angre = trpc.bookings.undoChange.useMutation({ onSuccess: oppfrisk });
  const onske = parseVentendeOnske(jobb.notes, kind);
  const typeLabel = kind === 'forespor' ? 'Forespørsel' : 'Avvik';
  const pending = resolve.isPending || angre.isPending;

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
        {onske?.startsAt ? <Rad label="Ønsket tid" verdi={fmtDateTime(onske.startsAt)} /> : null}
        {onske?.mechanicId ? <Rad label="Ønsket mekaniker" verdi="Ny mekaniker" /> : null}
      </dl>

      <div className="rounded-[16px] border border-divide bg-card px-4 py-3">
        <p className="mb-1 text-[12px] text-fg-muted">Meldt</p>
        <p className="whitespace-pre-wrap text-label text-fg">{utdragEndring(jobb.notes, kind)}</p>
      </div>

      {tilbake === 'logg' ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-endringer-angre
            disabled={pending}
            className="inline-flex h-12 items-center rounded-pill border border-border px-4 text-body font-[650] text-fg disabled:opacity-40"
            onClick={() => angre.mutate({ bookingId: jobb.id, kind })}
          >
            {angre.isPending ? 'Angrer …' : 'Angre behandling'}
          </button>
          <Link
            href={`/bookinger/${jobb.id}` as Route}
            className="inline-flex h-12 items-center px-3 text-body text-fg underline-offset-2 hover:underline"
          >
            Åpne jobb
          </Link>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            data-endringer-godkjenn
            disabled={pending}
            className="inline-flex h-12 items-center rounded-pill bg-fg px-4 text-body font-[650] text-bg disabled:opacity-40"
            onClick={() => resolve.mutate({ bookingId: jobb.id, kind, decision: 'godkjent' })}
          >
            {resolve.isPending ? 'Lagrer …' : 'Godkjenn'}
          </button>
          <button
            type="button"
            data-endringer-avsla
            disabled={pending}
            className="inline-flex h-12 items-center rounded-pill border border-border px-4 text-body font-[650] text-fg disabled:opacity-40"
            onClick={() => resolve.mutate({ bookingId: jobb.id, kind, decision: 'avslatt' })}
          >
            Avslå
          </button>
          <Link
            href={`/bookinger/${jobb.id}` as Route}
            className="inline-flex h-12 items-center px-3 text-body text-fg underline-offset-2 hover:underline"
          >
            Åpne jobb
          </Link>
        </div>
      )}

      {resolve.isSuccess ? (
        <p className="text-[12px] text-fg">
          {resolve.data.decision === 'godkjent'
            ? 'Godkjent og skrevet til jobben.'
            : 'Avslått. Jobben er uendret.'}
        </p>
      ) : null}
      {angre.isSuccess ? <p className="text-[12px] text-fg">Behandlingen er angret.</p> : null}
      {resolve.isError ? <p className="text-[12px] text-danger">{resolve.error.message}</p> : null}
      {angre.isError ? <p className="text-[12px] text-danger">{angre.error.message}</p> : null}
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
