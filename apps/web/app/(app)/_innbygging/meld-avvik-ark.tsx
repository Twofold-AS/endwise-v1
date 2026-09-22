'use client';

import { Dialog, DialogContent, DialogTitle } from '@endwise/ui';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { invalidateHjemPulse, meldingBookingLagret } from '../_shell/hjem-pulse-sync';

const TYPER = [
  { id: 'avvik', label: 'Avvik' },
  { id: 'utvidet', label: 'Utvidet tid' },
  { id: 'bytte', label: 'Bytte mekaniker' },
  { id: 'flytte', label: 'Flytte jobb' },
] as const;

/**
 * «Meld avvik eller forespørsel» fra jobbdetalj.
 * Avvik fra mekaniker → reportDeviation.
 * Forespørsel / staff → bookings.requestChange (Godkjenn kan skrive om jobben).
 */
export function MeldAvvikForesporsel({
  bookingId,
  kanSendeAvvik = false,
}: {
  bookingId: string;
  kanSendeAvvik?: boolean;
}) {
  const utils = trpc.useUtils();
  const [apen, setApen] = useState(false);
  const [type, setType] = useState<(typeof TYPER)[number]['id']>('avvik');
  const [tekst, setTekst] = useState('');
  const [nyStart, setNyStart] = useState('');
  const [mekanikerId, setMekanikerId] = useState('');
  const [ekstraMin, setEkstraMin] = useState('30');
  const mekanikere = trpc.mechanics.oversikt.useQuery();
  const avvik = trpc.mechanic.reportDeviation.useMutation({
    onSuccess: () => {
      invalidateHjemPulse(utils);
      meldingBookingLagret();
      setApen(false);
      setTekst('');
    },
  });
  const forespor = trpc.bookings.requestChange.useMutation({
    onSuccess: () => {
      invalidateHjemPulse(utils);
      void utils.bookings.byId.invalidate({ id: bookingId });
      setApen(false);
      setTekst('');
    },
  });

  function send() {
    const melding = tekst.trim();
    if (!melding) return;
    if (type === 'avvik' && kanSendeAvvik) {
      avvik.mutate({ bookingId, message: melding });
      return;
    }
    const proposedStartsAt = type === 'flytte' && nyStart ? new Date(nyStart) : undefined;
    const proposedMechanicId = type === 'bytte' && mekanikerId ? mekanikerId : undefined;
    const meldingUt =
      type === 'utvidet' && Number(ekstraMin) > 0 ? `${melding} (+${ekstraMin} min)` : melding;
    forespor.mutate({
      bookingId,
      type,
      message: meldingUt,
      proposedStartsAt,
      proposedMechanicId,
    });
  }

  const pending = avvik.isPending || forespor.isPending;

  return (
    <>
      <button
        type="button"
        data-meld-avvik-apne
        onClick={() => setApen(true)}
        className="inline-flex h-control items-center rounded-full border border-divide px-3 text-label text-fg"
      >
        Meld avvik eller forespørsel
      </button>
      <Dialog open={apen} onOpenChange={(o) => !o && setApen(false)}>
        <DialogContent className="top-1/2 left-1/2 w-[min(420px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
          <DialogTitle className="text-title text-fg">Meld avvik eller forespørsel</DialogTitle>
          <fieldset className="mt-3 flex flex-col gap-1.5 border-0 p-0">
            <legend className="sr-only">Type</legend>
            {TYPER.map((t) => (
              <button
                key={t.id}
                type="button"
                aria-pressed={type === t.id}
                data-meld-type={t.id}
                onClick={() => setType(t.id)}
                className={`h-10 rounded-[16px] px-3 text-left text-label ${
                  type === t.id ? 'bg-sidebar-active text-fg' : 'text-fg-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </fieldset>
          {type === 'flytte' ? (
            <label className="mt-3 flex flex-col gap-1 text-[12px] text-fg-muted">
              Foreslått start
              <input
                type="datetime-local"
                value={nyStart}
                onChange={(e) => setNyStart(e.target.value)}
                className="ew-felt ew-felt-md"
              />
            </label>
          ) : null}
          {type === 'bytte' ? (
            <label className="mt-3 flex flex-col gap-1 text-[12px] text-fg-muted">
              Foreslått mekaniker
              <select
                value={mekanikerId}
                onChange={(e) => setMekanikerId(e.target.value)}
                className="ew-felt ew-felt-md"
              >
                <option value="">— velg —</option>
                {(mekanikere.data ?? []).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {type === 'utvidet' ? (
            <label className="mt-3 flex flex-col gap-1 text-[12px] text-fg-muted">
              Ekstra minutter
              <input
                type="number"
                min={15}
                step={15}
                value={ekstraMin}
                onChange={(e) => setEkstraMin(e.target.value)}
                className="ew-felt ew-felt-md"
              />
            </label>
          ) : null}
          <textarea
            data-meld-tekst
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={3}
            placeholder="Hva skal selgeren vite?"
            className="ew-felt ew-felt-md mt-3 min-h-[4.5rem] w-full resize-none py-2"
          />
          {type === 'avvik' && !kanSendeAvvik ? (
            <p className="mt-2 text-[12px] text-fg-muted">
              Lagres som forespørsel på jobben (ikke mekaniker-avvik).
            </p>
          ) : null}
          {avvik.isError ? (
            <p className="mt-2 text-[12px] text-danger">{avvik.error.message}</p>
          ) : null}
          {forespor.isError ? (
            <p className="mt-2 text-[12px] text-danger">{forespor.error.message}</p>
          ) : null}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setApen(false)}
              className="inline-flex h-8 items-center rounded-full px-3 text-[12px] text-fg-muted"
            >
              Avbryt
            </button>
            <button
              type="button"
              data-meld-send
              disabled={!tekst.trim() || pending}
              onClick={send}
              className="inline-flex h-8 items-center rounded-full bg-fg px-3 text-[12px] font-[650] text-bg disabled:opacity-40"
            >
              {pending ? 'Sender …' : 'Send'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
