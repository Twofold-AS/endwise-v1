'use client';

import {
  Activity,
  Car,
  CreditCard,
  DeaktivertHandling,
  hexForFarge,
  Side,
  StatusChip,
  statusFraBooking,
  Users,
  Wrench,
} from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { invalidateHjemPulse, meldingBookingLagret } from '../../_shell/hjem-pulse-sync';
import { MeldEndringSkjema } from '../_meld-endring';
import {
  ALLOWED_TRANSITIONS,
  type BookingStatus,
  estMinutes,
  fmtDateTime,
  fmtMinor,
  fmtServices,
  fmtTime,
  overgangLabel,
  STATUS_LABEL,
} from '../_status';

/**
 * Bookingdetalj. Ekte data (`bookings.byId`): kunde, kjøretøy, tjeneste,
 * mekaniker, status + append-only historikk fra audit-loggen. Statusendringer går
 * gjennom `bookings.transition` — samme livssyklus som «Min dag». Klienten viser
 * kun lovlige overganger; serveren håndhever maskinen.
 */
export default function BookingDetaljPage() {
  const params = useParams<{ id: string }>();
  const utils = trpc.useUtils();
  const q = trpc.bookings.byId.useQuery({ id: params.id });
  const transition = trpc.bookings.transition.useMutation({
    onSuccess: () => {
      utils.bookings.byId.invalidate({ id: params.id });
      invalidateHjemPulse(utils);
      meldingBookingLagret();
    },
  });

  if (q.isLoading)
    return (
      <Side tittel="Jobb" tilbakeHref="/jobber" tilbakeLabel="Tilbake til timeplan">
        <p className="text-body text-fg-muted">Laster …</p>
      </Side>
    );
  if (q.isError)
    return (
      <Side tittel="Jobb" tilbakeHref="/jobber" tilbakeLabel="Tilbake til timeplan">
        <p className="text-body text-danger">Kunne ikke hente bookingen: {q.error.message}</p>
      </Side>
    );
  const b = q.data;
  if (!b)
    return (
      <Side tittel="Jobb" tilbakeHref="/jobber" tilbakeLabel="Tilbake til timeplan">
        <p className="text-body text-fg-muted">Fant ikke bookingen.</p>
      </Side>
    );

  const allowed = ALLOWED_TRANSITIONS[b.status] ?? [];
  const setStatus = (to: BookingStatus) => transition.mutate({ bookingId: b.id, to });

  return (
    <Side
      tittel={b.regNumber ?? 'Uten regnr'}
      undertekst={b.vehicleType ?? undefined}
      tilbakeHref="/jobber"
      tilbakeLabel="Tilbake til timeplan"
      handling={
        <StatusChip status={statusFraBooking(b.status)}>
          {STATUS_LABEL[b.status] ?? b.status}
        </StatusChip>
      }
      className="mx-auto w-full max-w-[880px] md:px-8 md:py-7"
    >
      <div className="flex flex-col gap-2" data-jobb-status-ekstra>
        {allowed.map((to) => (
          <button
            key={to}
            type="button"
            className="inline-flex h-12 items-center justify-center rounded-pill bg-fg px-4 text-body text-bg disabled:opacity-40"
            onClick={() => setStatus(to)}
          >
            {overgangLabel(b.status, to)}
          </button>
        ))}
        <DeaktivertHandling forklaring="Kommer senere">Flyttet</DeaktivertHandling>
        <DeaktivertHandling forklaring="Kommer senere">Hentet</DeaktivertHandling>
        <Link
          href={`/innboks?ny=1&jobb=${encodeURIComponent(b.id)}` as Route}
          data-jobb-send-melding
          className="inline-flex h-12 items-center justify-center rounded-pill border border-border px-4 text-body text-fg"
        >
          Send melding om jobben
        </Link>
        {transition.isPending && <span className="text-meta text-fg-muted">Lagrer …</span>}
        {transition.isError && (
          <span className="text-body text-danger">{transition.error.message}</span>
        )}
      </div>

      {/* Fakta-rutenett */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact icon={<Users size={15} />} label="Kunde" value={b.customerName ?? '—'} />
        <Fact
          icon={<Wrench size={15} />}
          label="Mekaniker"
          value={b.mechanicName ?? '—'}
          farge={b.farge}
          seed={b.mechanicId}
        />
        <Fact
          icon={<CreditCard size={15} />}
          label={b.services && b.services.length > 1 ? 'Tjenester' : 'Tjeneste'}
          value={
            b.services && b.services.length > 0
              ? b.services
                  .map(
                    (s) =>
                      `${s.name ?? 'Tjeneste'}${s.version ? ` · v${s.version}` : ''} (${s.durationMinutes} min)`,
                  )
                  .join(' + ')
              : fmtServices(b)
          }
        />
        <Fact
          icon={<CreditCard size={15} />}
          label="Pris"
          value={fmtMinor(
            b.services && b.services.length > 0
              ? b.services.reduce((sum, s) => sum + (s.priceMinor ?? 0), 0) || null
              : b.priceMinor,
          )}
        />
        <Fact
          icon={<Car size={15} />}
          label="Kjøretøy"
          value={[b.make, b.model].filter(Boolean).join(' ') || b.regNumber || '—'}
        />
        <Fact
          icon={<Activity size={15} />}
          label="Tid"
          value={`${fmtDateTime(b.startsAt)} – ${fmtTime(b.endsAt)} (${estMinutes(b.startsAt, b.endsAt)} min)`}
        />
      </div>

      {b.notes && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="mb-1 text-meta text-fg-muted">Notat</p>
          <p className="text-body text-fg">{b.notes}</p>
        </div>
      )}

      <MeldEndringSkjema bookingId={b.id} notes={b.notes} />

      {/* Historikk (audit-loggen, append-only F1-06). */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 text-meta text-fg-muted">
          <Activity size={13} /> Historikk
        </p>
        {b.history.length === 0 ? (
          <p className="text-meta text-fg-muted">
            Ingen statusendringer ennå. Opprettet {fmtDateTime(b.createdAt)} (kilde: {b.source}).
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {b.history.map((h) => {
              const to = String(h.action).replace('booking.', '');
              const from = (h.metadata as { from?: string } | null)?.from;
              return (
                <li key={h.id} className="flex items-center gap-2 text-meta">
                  <span className="w-28 shrink-0 text-fg-muted tabular-nums">
                    {fmtDateTime(h.occurredAt)}
                  </span>
                  <span className="text-fg">
                    {from ? `${STATUS_LABEL[from] ?? from} → ` : ''}
                    <span className="font-medium">{STATUS_LABEL[to] ?? to}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Side>
  );
}

function Fact({
  icon,
  label,
  value,
  farge,
  seed,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  farge?: string | null;
  seed?: string | null;
}) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3">
      <span className="mt-0.5 text-fg-faint">{icon}</span>
      <div className="min-w-0">
        <p className="text-meta text-fg-muted">{label}</p>
        <p className="flex items-center gap-1.5 truncate text-body text-fg">
          {farge != null || seed ? (
            <span
              aria-hidden
              className="inline-block size-2 shrink-0 rounded-full"
              style={{ backgroundColor: hexForFarge(farge, seed ?? undefined) }}
            />
          ) : null}
          {value}
        </p>
      </div>
    </div>
  );
}
