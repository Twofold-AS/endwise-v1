'use client';

import { Car, Check, Search, Sparkles, Wrench } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { fmtMinor } from '../_status';

/**
 * F3-09 / P3 — «Ny jobb». Ekte flyt mot slot-lock-motoren (F3-01): velg
 * kunde/kjøretøy/tjenester/tid → matcheren (F3-02) rangerer mekanikere →
 * `bookings.create` tar slot-låsen og skriver. Flere tjenester på én jobb;
 * varighet er katalogsum, overstyrbar manuelt. Vegvesen-oppslag (F2-08) som
 * smart default på regnr. Serveren eier valget og låsen — vi foreslår bare.
 */
export default function NyJobbPage() {
  const router = useRouter();
  const utils = trpc.useUtils();

  const [customerId, setCustomerId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const [serviceIds, setServiceIds] = useState<string[]>([]);
  const [startsAt, setStartsAt] = useState('');
  const [mechanicId, setMechanicId] = useState('');
  const [notes, setNotes] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [durationMinutes, setDurationMinutes] = useState<number | ''>('');
  const [durationManual, setDurationManual] = useState(false);

  const services = trpc.services.list.useQuery();
  const mechanics = trpc.mechanics.list.useQuery();

  const selected = useMemo(
    () => (services.data ?? []).filter((s) => serviceIds.includes(s.id)),
    [services.data, serviceIds],
  );

  const catalogSum = useMemo(
    () => selected.reduce((sum, s) => sum + s.durationMinutes, 0),
    [selected],
  );

  const slotMinutes = useMemo(() => {
    if (durationManual && typeof durationMinutes === 'number' && durationMinutes > 0) {
      return durationMinutes;
    }
    return catalogSum;
  }, [catalogSum, durationManual, durationMinutes]);

  const requiredSkills = useMemo(() => [...new Set(selected.flatMap((s) => s.skills))], [selected]);

  // Sluttid = start + (manuell varighet eller katalogsum).
  const window = useMemo(() => {
    if (!startsAt || slotMinutes <= 0) return null;
    const from = new Date(startsAt);
    const to = new Date(from.getTime() + slotMinutes * 60000);
    return { from, to };
  }, [startsAt, slotMinutes]);

  const lookup = trpc.lookup.vehicleByRegNumber.useQuery(
    { regNumber: regNumber.trim() },
    { enabled: false, retry: false },
  );

  const primary = selected[0];
  const match = trpc.mechanics.match.useQuery(
    {
      serviceId: (primary?.id ?? '') as never,
      requiredSkills,
      from: window?.from as never,
      to: window?.to as never,
    },
    { enabled: Boolean(primary && window) },
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

  const canBook = Boolean(
    selected.length > 0 &&
      window &&
      mechanicId &&
      selected.every((s) => s.serviceVersionId) &&
      slotMinutes >= 5,
  );

  function toggleService(id: string) {
    setServiceIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    setMechanicId('');
    if (!durationManual) setDurationMinutes('');
  }

  function onDurationChange(raw: string) {
    if (raw === '') {
      setDurationMinutes('');
      setDurationManual(false);
      setMechanicId('');
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    setDurationMinutes(Math.round(n));
    setDurationManual(true);
    setMechanicId('');
  }

  function resetDuration() {
    setDurationManual(false);
    setDurationMinutes(catalogSum || '');
    setMechanicId('');
  }

  function book() {
    if (!primary || !window || !mechanicId) return;
    const extra = selected
      .slice(1)
      .map((s) => s.serviceVersionId)
      .filter(Boolean);
    create.mutate({
      mechanicId,
      serviceVersionId: primary.serviceVersionId,
      extraServiceVersionIds: extra,
      startsAt: window.from.toISOString(),
      endsAt: window.to.toISOString(),
      durationMinutes: slotMinutes,
      customerId: customerId || undefined,
      vehicleId: vehicleId || undefined,
      notes: notes.trim() || undefined,
      source: 'admin',
    });
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5 px-8 py-7">
      <div>
        <Link href={'/saker' as Route} className="text-fg-faint text-xs hover:text-fg">
          ← Jobber
        </Link>
        <h1 className="mt-1 font-semibold text-fg text-xl tracking-tight">Ny jobb</h1>
        <p className="text-fg-muted text-sm">
          Velg én eller flere tjenester og tid — matcheren foreslår mekaniker, motoren låser slotet.
        </p>
      </div>

      <Section step={1} title="Kunde og kjøretøy">
        <KundeIFlyt
          customerId={customerId}
          vehicleId={vehicleId}
          onCustomer={(id) => {
            setCustomerId(id);
            setVehicleId('');
          }}
          onVehicle={setVehicleId}
        />

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
          <p className="text-fg-faint text-xs">Klarte ikke slå opp regnr akkurat nå.</p>
        )}
        {lookup.data && (
          <p className="text-success text-xs">
            {lookup.data.make} {lookup.data.model} ({lookup.data.modelYear}) — EU-frist{' '}
            {lookup.data.inspectionDue ?? '—'}
          </p>
        )}
      </Section>

      <Section step={2} title="Tjenester og tid">
        <fieldset className="flex flex-col gap-1.5">
          <legend className="text-fg-faint text-xs">Tjenester</legend>
          {(services.data ?? []).length === 0 ? (
            <p className="text-fg-faint text-xs">Ingen aktive tjenester i katalogen.</p>
          ) : (
            (services.data ?? []).map((s) => {
              const on = serviceIds.includes(s.id);
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleService(s.id)}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                    on ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-surface-2'
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-fg">{s.name}</span>
                    <span className="text-fg-faint text-xs">
                      {s.durationMinutes} min · {fmtMinor(s.priceMinor)}
                    </span>
                  </span>
                  {on && <Check size={15} className="shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </fieldset>

        <Field label="Varighet (minutter)">
          <input
            type="number"
            min={5}
            max={720}
            step={5}
            value={durationManual ? durationMinutes : catalogSum || ''}
            onChange={(e) => onDurationChange(e.target.value)}
            placeholder={catalogSum ? String(catalogSum) : 'Velg tjenester'}
            className={inputCls}
          />
        </Field>
        {selected.length > 0 && (
          <p className="text-fg-muted text-xs">
            Katalogtid {catalogSum} min
            {selected.length > 1 ? ` (sum av ${selected.length} tjenester)` : ''}.
            {durationManual
              ? ' Justeres manuelt for denne jobben.'
              : ' Du kan overstyre tiden selv.'}
            {durationManual && (
              <>
                {' '}
                <button
                  type="button"
                  onClick={resetDuration}
                  className="text-fg underline decoration-border underline-offset-2 hover:text-fg"
                >
                  Bruk katalogtid
                </button>
              </>
            )}
          </p>
        )}

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
        {window && selected.length > 0 && (
          <p className="text-fg-muted text-xs">
            Slutter {window.to.toLocaleTimeString('nb-NO', { hour: '2-digit', minute: '2-digit' })}{' '}
            · {slotMinutes} min
            {requiredSkills.length > 0 && ` · krever: ${requiredSkills.join(', ')}`}
          </p>
        )}
      </Section>

      <Section step={3} title="Mekaniker">
        {!primary || !window ? (
          <p className="text-fg-faint text-xs">Velg tjenester og tid, så foreslår matcheren.</p>
        ) : match.isLoading ? (
          <p className="text-fg-faint text-xs">Matcher …</p>
        ) : (match.data ?? []).length === 0 ? (
          <p className="text-warn text-xs">
            Ingen kvalifisert mekaniker er ledig i dette tidsrommet. Prøv en annen tid.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5">
            {(match.data ?? []).map((cand, i) => {
              const selectedMech = mechanicId === cand.mechanicId;
              return (
                <button
                  key={cand.mechanicId}
                  type="button"
                  onClick={() => setMechanicId(cand.mechanicId)}
                  className={`flex items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                    selectedMech
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
                  {selectedMech && <Check size={15} className="shrink-0 text-primary" />}
                </button>
              );
            })}
          </div>
        )}
      </Section>

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
        {create.isPending ? 'Oppretter …' : 'Opprett jobb'}
      </button>
    </div>
  );
}

const inputCls =
  'h-9 w-full rounded-md border border-border bg-bg px-3 text-fg text-sm placeholder:text-fg-faint focus-visible:outline-2 focus-visible:outline-accent';
const selectCls =
  'h-9 w-full rounded-md border border-border bg-bg px-3 text-fg text-sm focus-visible:outline-2 focus-visible:outline-accent';

function KundeIFlyt({
  customerId,
  vehicleId,
  onCustomer,
  onVehicle,
}: {
  customerId: string;
  vehicleId: string;
  onCustomer: (id: string) => void;
  onVehicle: (id: string) => void;
}) {
  const utils = trpc.useUtils();
  const [sok, setSok] = useState('');
  const [nyKunde, setNyKunde] = useState(false);
  const [nyttKjoretoy, setNyttKjoretoy] = useState(false);
  const [navn, setNavn] = useState('');
  const [telefon, setTelefon] = useState('');
  const [regnr, setRegnr] = useState('');

  const customers = trpc.customers.list.useQuery({
    sok: sok.trim() || undefined,
    limit: 50,
  });
  const vehicles = trpc.vehicles.list.useQuery(
    customerId ? { customerId: customerId as never } : {},
  );
  const opprettKunde = trpc.customers.create.useMutation({
    onSuccess: (kunde) => {
      void utils.customers.list.invalidate();
      if (kunde?.id) onCustomer(kunde.id);
      setNyKunde(false);
      setNavn('');
      setTelefon('');
    },
  });
  const opprettKjoretoy = trpc.vehicles.create.useMutation({
    onSuccess: (v) => {
      void utils.vehicles.list.invalidate();
      if (v?.id) onVehicle(v.id);
      setNyttKjoretoy(false);
      setRegnr('');
    },
  });

  return (
    <>
      <Field label="Søk kunde">
        <input
          value={sok}
          onChange={(e) => setSok(e.target.value)}
          placeholder="Navn eller telefon"
          className={inputCls}
        />
      </Field>
      <Field label="Kunde">
        <select
          value={customerId}
          onChange={(e) => onCustomer(e.target.value)}
          className={selectCls}
        >
          <option value="">— velg kunde —</option>
          {(customers.data ?? []).map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.phone ? ` · ${c.phone}` : ''}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        onClick={() => setNyKunde((v) => !v)}
        className="self-start text-xs text-fg underline decoration-border underline-offset-2 hover:text-fg"
      >
        {nyKunde ? 'Skjul ny kunde' : 'Ny kunde'}
      </button>
      {nyKunde && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
          <Field label="Navn">
            <input
              value={navn}
              onChange={(e) => setNavn(e.target.value)}
              className={inputCls}
              placeholder="Kari Nordmann"
            />
          </Field>
          <Field label="Telefon">
            <input
              value={telefon}
              onChange={(e) => setTelefon(e.target.value)}
              className={inputCls}
              placeholder="+4790000000"
            />
          </Field>
          <button
            type="button"
            disabled={!navn.trim() || !telefon.trim() || opprettKunde.isPending}
            onClick={() =>
              opprettKunde.mutate({ name: navn.trim(), phone: telefon.trim() || undefined })
            }
            className="inline-flex h-9 items-center justify-center rounded-md bg-fg px-3 text-bg text-sm disabled:opacity-50"
          >
            {opprettKunde.isPending ? 'Lagrer …' : 'Lagre kunde'}
          </button>
          {opprettKunde.isError && (
            <p className="text-danger text-xs">Klarte ikke lagre kunden. Prøv igjen.</p>
          )}
        </div>
      )}

      <Field label="Kjøretøy">
        <select
          value={vehicleId}
          onChange={(e) => onVehicle(e.target.value)}
          className={selectCls}
          disabled={!customerId}
        >
          <option value="">{customerId ? '— velg kjøretøy —' : 'Velg kunde først'}</option>
          {(vehicles.data ?? []).map((v) => (
            <option key={v.id} value={v.id}>
              {v.regNumber ?? 'Uten regnr'} ·{' '}
              {[v.make, v.model].filter(Boolean).join(' ') || v.type}
            </option>
          ))}
        </select>
      </Field>
      <button
        type="button"
        disabled={!customerId}
        onClick={() => setNyttKjoretoy((v) => !v)}
        className="self-start text-xs text-fg underline decoration-border underline-offset-2 hover:text-fg disabled:opacity-40"
      >
        {nyttKjoretoy ? 'Skjul nytt kjøretøy' : 'Nytt kjøretøy'}
      </button>
      {nyttKjoretoy && customerId && (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-bg p-3">
          <Field label="Regnr">
            <input
              value={regnr}
              onChange={(e) => setRegnr(e.target.value.toUpperCase())}
              className={inputCls}
              placeholder="EK12345"
            />
          </Field>
          <button
            type="button"
            disabled={regnr.trim().length < 2 || opprettKjoretoy.isPending}
            onClick={() =>
              opprettKjoretoy.mutate({
                customerId: customerId as never,
                type: 'mc',
                regNumber: regnr.trim(),
              })
            }
            className="inline-flex h-9 items-center justify-center rounded-md bg-fg px-3 text-bg text-sm disabled:opacity-50"
          >
            {opprettKjoretoy.isPending ? 'Lagrer …' : 'Lagre kjøretøy'}
          </button>
          {opprettKjoretoy.isError && (
            <p className="text-danger text-xs">Klarte ikke lagre kjøretøyet. Prøv igjen.</p>
          )}
        </div>
      )}
    </>
  );
}

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
