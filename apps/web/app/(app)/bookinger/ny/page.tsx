'use client';

import { Car, Check, Search, Sparkles, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { fmtMinor } from '../_status';

/**
 * F3-09 — «Ny booking». EKTE flyt mot slot-lock-motoren (F3-01): velg
 * kunde/kjøretøy/tjeneste/tid → matcheren (F3-02) rangerer mekanikere →
 * `bookings.create` tar slot-låsen og skriver. Vegvesen-oppslag (F2-08) som
 * smart default på regnr. Serveren eier valget og låsen — vi foreslår bare.
 */
export default function NyBookingPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  const [notes, setNotes] = useState('');
  const [regNumber, setRegNumber] = useState('');

  const customers = trpc.customers.list.useQuery({ limit: 200 });
  const vehicles = trpc.vehicles.list.useQuery(
    customerId ? { customerId: customerId as never } : {},
  );
  const services = trpc.services.list.useQuery();
  const mechanics = trpc.mechanics.list.useQuery();

  const service = useMemo(
    () => (services.data ?? []).find((s) => s.id === serviceId),
    [services.data, serviceId],
  );

  // Sluttid = start + tjenestens varighet.
  const window = useMemo(() => {
    if (!startsAt || !service) return null;
    const from = new Date(startsAt);
    const to = new Date(from.getTime() + service.durationMinutes * 60000);
    return { from, to };
  }, [startsAt, service]);

  // Vegvesen-oppslag (smart default). Manuell trigger — vi spammer ikke API-et.
  const lookup = trpc.lookup.vehicleByRegNumber.useQuery(
    { regNumber: regNumber.trim() },
    { enabled: false, retry: false },
  );

  // Matcheren: rangert liste, ikke ett svar (F3-02).
  const match = trpc.mechanics.match.useQuery(
    {
      serviceId: serviceId as never,
      requiredSkills: service?.skills ?? [],
      from: window?.from as never,
      to: window?.to as never,
    },
    { enabled: Boolean(serviceId && window) },
  );

  const mechName = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of mechanics.data ?? []) m.set(x.id, x.name);
    return m;
  }, [mechanics.data]);

  const create = trpc.bookings.create.useMutation({
    onSuccess: (booking) => {
      utils.bookings.list.invalidate();
      router.push(`/bookinger/${booking.id}` as Route);
    },
  });

  const canBook = Boolean(service && window && mechanicId && service.serviceVersionId);

  function book() {
    if (!service || !window || !mechanicId) return;
    create.mutate({
      mechanicId,
      serviceVersionId: service.serviceVersionId,
      startsAt: window.from.toISOString(),
      endsAt: window.to.toISOString(),
      customerId: customerId || undefined,
      vehicleId: vehicleId || undefined,
      notes: notes.trim() || undefined,
      source: 'admin',
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <div>
        <Link href={'/bookinger' as Route} className="text-fg-faint text-xs hover:text-fg">
          ← Bookinger
        </Link>
        <h1 className="mt-1 font-semibold text-fg text-xl tracking-tight">Ny booking</h1>
        <p className="text-fg-muted text-sm">
          Velg tjeneste og tid — matcheren foreslår mekaniker, motoren låser slotet.
        </p>
      </div>

      {/* 1. Kunde + kjøretøy */}
      <Section step={1} title="Kunde og kjøretøy">
        <Field label="Kunde">
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              setVehicleId('');
            }}
            className={selectCls}
          >
            <option value="">— uten kunde —</option>
            {(customers.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kjøretøy">
          <select
            value={vehicleId}
            onChange={(e) => setVehicleId(e.target.value)}
            className={selectCls}
          >
            <option value="">— uten kjøretøy —</option>
            {(vehicles.data ?? []).map((v) => (
              <option key={v.id} value={v.id}>
                {v.regNumber ?? 'uten regnr'} ·{' '}
                {[v.make, v.model].filter(Boolean).join(' ') || v.type}
              </option>
            ))}
          </select>
        </Field>

        {/* Vegvesen-oppslag: smart default på regnr. */}
        <div className="flex items-end gap-2">
          <Field label="Slå opp regnr (Vegvesen)">
            <div className="relative">
              <Car
                size={14}
                className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-3 text-fg-faint"
              />
              <input
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value.toUpperCase())}
                placeholder="EK12345"
                className={`${inputCls} pl-9`}
              />
            </div>
          </Field>
          <button
            type="button"
            disabled={regNumber.trim().length < 2 || lookup.isFetching}
            onClick={() => lookup.refetch()}
            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-border bg-bg px-3 text-fg text-sm hover:bg-surface-2 disabled:opacity-50"
          >
            <Search size={14} />
            {lookup.isFetching ? 'Slår opp …' : 'Slå opp'}
          </button>
        </div>
        {lookup.isError && (
          <p className="text-fg-faint text-xs">
            Oppslag utilgjengelig ({lookup.error.message}). Krever VEGVESEN_API_KEY.
          </p>
        )}
        {lookup.data && (
          <p className="text-success text-xs">
            {lookup.data.make} {lookup.data.model} ({lookup.data.modelYear}) — EU-frist{' '}
            {lookup.data.inspectionDue ?? '—'}
          </p>
        )}
      </Section>

      {/* 2. Tjeneste + tid */}
      <Section step={2} title="Tjeneste og tid">
        <Field label="Tjeneste">
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              setMechanicId('');
            }}
            className={selectCls}
          >
            <option value="">— velg tjeneste —</option>
            {(services.data ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.durationMinutes} min · {fmtMinor(s.priceMinor)}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Starttid">
          <input
            type="datetime-local"
            value={startsAt}
            onChange={(e) => {
              setStartsAt(e.target.value);
              setMechanicId('');
            }}
            className={inputCls}
          />
        </Field>
        {window && service && (
          <p className="text-fg-muted text-xs">
            Slutter {window.to.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}{' '}
            · {service.durationMinutes} min
            {service.skills.length > 0 && ` · krever: ${service.skills.join(', ')}`}
          </p>
        )}
      </Section>

      {/* 3. Matcher → mekaniker */}
      <Section step={3} title="Mekaniker">
        {!serviceId || !window ? (
          <p className="text-fg-faint text-xs">Velg tjeneste og tid, så foreslår matcheren.</p>
        ) : match.isLoading ? (
          <p className="text-fg-faint text-xs">Matcher …</p>
        ) : (match.data ?? []).length === 0 ? (
          <p className="text-warn text-xs">
            Ingen kvalifisert mekaniker er ledig i dette tidsrommet. Prøv en annen tid.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(match.data ?? []).map((cand, i) => {
              const selected = mechanicId === cand.mechanicId;
              return (
                <button
                  key={cand.mechanicId}
                  type="button"
                  onClick={() => setMechanicId(cand.mechanicId)}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                    selected
                      ? 'border-primary bg-primary/10'
                      : 'border-border bg-card hover:bg-surface-2'
                  }`}
                >
                  <Wrench size={15} className="shrink-0 text-fg-muted" />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[13px] text-fg">
                      {mechName.get(cand.mechanicId) ?? cand.mechanicId}
                      {i === 0 && (
                        <span className="inline-flex items-center gap-0.5 rounded bg-primary/15 px-1.5 py-0.5 text-[10px] text-primary">
                          <Sparkles size={9} /> best treff
                        </span>
                      )}
                    </p>
                    {cand.reasons.length > 0 && (
                      <p className="truncate text-fg-faint text-xs">{cand.reasons.join(' · ')}</p>
                    )}
                  </div>
                  <span className="shrink-0 text-fg-muted text-xs tabular-nums">
                    {Math.round(cand.score * 100)}%
                  </span>
                  {selected && <Check size={15} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </Section>

      {/* Notat + book */}
      <Field label="Notat (valgfritt)">
        <input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Intern beskjed til mekanikeren …"
          className={inputCls}
        />
      </Field>

      {create.isError && (
        <p className="text-danger text-sm">
          {create.error.data?.code === 'CONFLICT'
            ? 'Mekanikeren er allerede opptatt i dette tidsrommet. Velg en annen tid eller mekaniker.'
            : create.error.message}
        </p>
      )}

      <button
        type="button"
        disabled={!canBook || create.isPending}
        onClick={book}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-6 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90 disabled:opacity-50"
      >
        <Check size={16} />
        {create.isPending ? 'Booker …' : 'Book'}
      </button>
    </div>
  );
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-bg px-3 text-fg text-sm placeholder:text-fg-faint focus-visible:outline-2 focus-visible:outline-accent';
const selectCls =
  'h-9 w-full rounded-md border border-border bg-bg px-3 text-fg text-sm focus-visible:outline-2 focus-visible:outline-accent';

function Section({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-full bg-surface-2 text-[11px] text-fg-muted tabular-nums">
          {step}
        </span>
        <h2 className="font-medium text-fg text-sm">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: kontrollen sendes inn som children (implisitt kobling).
    <label className="flex w-full flex-col gap-1">
      <span className="text-fg-faint text-xs">{label}</span>
      {children}
    </label>
  );
}
