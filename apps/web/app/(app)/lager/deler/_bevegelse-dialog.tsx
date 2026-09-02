'use client';

import { CircleAlert, StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useOrgRole } from '../../_lib/use-org-role';

/**
 * Registrer en lagerbevegelse.
 * «Korriger» er admin-only, og det er ikke pynt. Et uttak er sporbart
 * mot en jobb; en korreksjon er et tall noen bestemte. Derfor er den skjult for
 * `dealer_staff` her — og avvist server-side i `inventory.move` uansett, som er
 * den sperren som faktisk teller.
 * Reservasjon er ikke det samme som uttak. «Reserver» binder delen uten
 * å ta den av hylla; «Ut» tar den ut og innfrir reservasjonen. Det er nettopp
 * skillet som hindrer at butikken selger delen mekanikeren nettopp tok
 * (owasp A08).
 */
const TYPER = [
  { key: 'in', label: 'Inn', hint: 'Varemottak — beholdningen øker' },
  { key: 'out', label: 'Ut', hint: 'Uttak til jobb — innfrir reservasjon' },
  { key: 'reserve', label: 'Reserver', hint: 'Bind til jobb, står på hylla' },
  { key: 'release', label: 'Frigi', hint: 'Reservasjon opphevet' },
  { key: 'adjust', label: 'Korriger', hint: 'Opptelling — setter absolutt tall', adminOnly: true },
] as const;

export function BevegelseDialog({
  del,
  onLukk,
  onFerdig,
}: {
  del: { id: string; sku: string; name: string };
  onLukk: () => void;
  onFerdig: () => void;
}) {
  const { isAdmin } = useOrgRole();
  const utils = trpc.useUtils();
  const lokasjoner = trpc.inventory.listLocations.useQuery();

  const [kind, setKind] = useState<(typeof TYPER)[number]['key']>('in');
  const [locationId, setLocationId] = useState('');
  const [antall, setAntall] = useState('1');
  const [note, setNote] = useState('');

  const move = trpc.inventory.move.useMutation({
    onSuccess: () => {
      void utils.inventory.invalidate();
      onFerdig();
    },
  });

  const synligeTyper = TYPER.filter((t) => !('adminOnly' in t && t.adminOnly) || isAdmin);
  const valgtLokasjon = locationId || lokasjoner.data?.[0]?.id || '';

  function submit(e: FormEvent) {
    e.preventDefault();
    move.mutate({
      partId: del.id,
      locationId: valgtLokasjon,
      kind,
      quantity: Number(antall) || 0,
      note: note.trim() || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/*
       * Bakteppet er en ekte knapp, ikke et div med onClick: da får det
       * tastaturfokus og Escape/Enter gratis, og skjermlesere får en handling
       * de kan navngi.
       */}
      <button
        type="button"
        aria-label="Lukk"
        onClick={onLukk}
        className="-z-10 fixed inset-0 cursor-default bg-black/40"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Registrer bevegelse for ${del.name}`}
        className="w-full max-w-md rounded-xl border border-border bg-bg p-5"
      >
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <p className="text-label text-fg">{del.name}</p>
            <p className="font-mono text-[12px] text-fg-muted">{del.sku}</p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-1.5 text-label text-fg">Type</legend>
            <div className="grid grid-cols-2 gap-2">
              {synligeTyper.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setKind(t.key)}
                  aria-pressed={kind === t.key}
                  className={`flex flex-col items-start gap-0.5 rounded-control border px-3 py-2 text-left transition-colors ${
                    kind === t.key
                      ? 'border-fg bg-sidebar-active'
                      : 'border-border hover:bg-surface-2'
                  }`}
                >
                  <span className="text-label text-fg">{t.label}</span>
                  <span className="text-[11px] text-fg-muted leading-tight">{t.hint}</span>
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Lokasjon</span>
            <select
              value={valgtLokasjon}
              onChange={(e) => setLocationId(e.target.value)}
              required
              className="h-control rounded-control border border-border bg-bg px-2 text-body text-fg outline-none focus-visible:border-fg"
            >
              {lokasjoner.data?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.name}
                </option>
              ))}
            </select>
            {(lokasjoner.data?.length ?? 0) === 0 && !lokasjoner.isLoading && (
              <span className="text-[12px] text-warn">
                Ingen lokasjoner ennå — opprett én under Plass først.
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">
              {kind === 'adjust' ? 'Nytt antall (absolutt)' : 'Antall'}
            </span>
            <input
              type="number"
              min={0}
              value={antall}
              onChange={(e) => setAntall(e.target.value)}
              required
              className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg tabular-nums outline-none focus-visible:border-fg"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-label text-fg">Notat</span>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={280}
              placeholder="Valgfritt — f.eks. hvilken jobb"
              className="h-control rounded-control border border-border bg-bg px-2.5 text-body text-fg outline-none placeholder:text-fg-muted/60 focus-visible:border-fg"
            />
          </label>

          {move.error && (
            <p className="flex items-start gap-2 text-body text-danger">
              <CircleAlert size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" />
              {move.error.message}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onLukk}
              className="h-control rounded-control px-3 text-label text-fg-muted transition-colors hover:text-fg"
            >
              Avbryt
            </button>
            <StatefulButton
              type="submit"
              disabled={move.isPending || !valgtLokasjon}
              state={move.isPending ? 'loading' : move.isError ? 'error' : 'idle'}
              loadingText="Lagrer…"
              errorText="Feilet"
            >
              Registrer
            </StatefulButton>
          </div>
        </form>
      </div>
    </div>
  );
}
