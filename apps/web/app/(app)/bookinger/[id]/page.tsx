'use client';

import { Activity, Car, CreditCard, Users, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { trpc } from '@/lib/trpc';
import { BevelButton } from '../../_shell/cards';
import {
  ALLOWED_TRANSITIONS,
  type BookingStatus,
  estMinutes,
  fmtDateTime,
  fmtMinor,
  fmtServices,
  fmtTime,
  STATUS_LABEL,
  STATUS_TONE,
  TRANSITION_LABEL,
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
      utils.bookings.list.invalidate();
    },
  });

  if (q.isLoading) return <div className="px-8 py-7 text-fg-faint text-sm">Laster …</div>;
  if (q.isError)
    return (
      <div className="px-8 py-7">
        <p className="text-danger text-sm">Kunne ikke hente bookingen: {q.error.message}</p>
        <BackLink />
      </div>
    );
  const b = q.data;
  if (!b)
    return (
      <div className="px-8 py-7">
        <p className="text-fg-muted text-sm">Fant ikke bookingen.</p>
        <BackLink />
      </div>
    );

  const allowed = ALLOWED_TRANSITIONS[b.status] ?? [];
  const setStatus = (to: BookingStatus) => transition.mutate({ bookingId: b.id, to });

  return (
    <div className="mx-auto flex w-full max-w-[880px] flex-col gap-4 px-8 py-7">
      <BackLink />

      <div className="flex flex-wrap items-center gap-3">
        <Car size={20} className="text-fg-muted" />
        <h1 className="font-semibold text-fg text-xl tracking-tight">
          {b.regNumber ?? 'Uten regnr'}
        </h1>
        {b.vehicleType && <span className="text-fg-faint text-xs uppercase">{b.vehicleType}</span>}
        <span
          className={`ml-auto rounded-md px-2.5 py-1 font-medium text-xs ${STATUS_TONE[b.status] ?? 'bg-surface-2 text-fg-muted'}`}
        >
          {STATUS_LABEL[b.status] ?? b.status}
        </span>
      </div>

      {/* Statusknapper — kun lovlige overganger. */}
      {allowed.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {allowed.map((to) => (
            <BevelButton
              key={to}
              className={to === 'cancelled' || to === 'no_show' ? 'opacity-90' : ''}
              onClick={() => setStatus(to)}
            >
              {TRANSITION_LABEL[to] ?? STATUS_LABEL[to]}
            </BevelButton>
          ))}
          {transition.isPending && (
            <span className="self-center text-fg-faint text-xs">Lagrer …</span>
          )}
          {transition.isError && (
            <span className="self-center text-danger text-xs">{transition.error.message}</span>
          )}
        </div>
      )}

      {/* Fakta-rutenett */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Fact icon={<Users size={15} />} label="Kunde" value={b.customerName ?? '—'} />
        <Fact icon={<Wrench size={15} />} label="Mekaniker" value={b.mechanicName ?? '—'} />
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
          <p className="mb-1 font-medium text-fg-faint text-xs">Notat</p>
          <p className="text-fg text-sm">{b.notes}</p>
        </div>
      )}

      {/* Historikk (audit-loggen, append-only F1-06). */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="mb-2 flex items-center gap-1.5 font-medium text-fg-faint text-xs">
          <Activity size={13} /> Historikk
        </p>
        {b.history.length === 0 ? (
          <p className="text-fg-faint text-xs">
            Ingen statusendringer ennå. Opprettet {fmtDateTime(b.createdAt)} (kilde: {b.source}).
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {b.history.map((h) => {
              const to = String(h.action).replace('booking.', '');
              const from = (h.metadata as { from?: string } | null)?.from;
              return (
                <li key={h.id} className="flex items-center gap-2 text-xs">
                  <span className="w-28 shrink-0 text-fg-faint tabular-nums">
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
    </div>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-border bg-card px-3.5 py-3">
      <span className="mt-0.5 text-fg-faint">{icon}</span>
      <div className="min-w-0">
        <p className="text-fg-faint text-xs">{label}</p>
        <p className="truncate text-fg text-sm">{value}</p>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link href={'/saker' as Route} className="text-fg-faint text-xs hover:text-fg">
      ← Jobber
    </Link>
  );
}
