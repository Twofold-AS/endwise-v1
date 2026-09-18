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
 * Avvik går mot mechanic.reportDeviation når bookingId finnes;
 * forespørsel-typene er økt-lokal til F7-05 har egen rute.
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
  const [sendtLokal, setSendtLokal] = useState(false);
  const avvik = trpc.mechanic.reportDeviation.useMutation({
    onSuccess: () => {
      invalidateHjemPulse(utils);
      meldingBookingLagret();
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
    setSendtLokal(true);
  }

  return (
    <>
      <button
        type="button"
        data-meld-avvik-apne
        onClick={() => {
          setSendtLokal(false);
          setApen(true);
        }}
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
          <textarea
            data-meld-tekst
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={3}
            placeholder="Hva skal selgeren vite?"
            className="ew-felt ew-felt-md mt-3 min-h-[4.5rem] w-full resize-none py-2"
          />
          {type !== 'avvik' || !kanSendeAvvik ? (
            <p className="mt-2 text-[12px] text-fg-muted">
              Forespørsel lagres lokalt i denne økta — ingen egen API ennå.
            </p>
          ) : null}
          {sendtLokal ? <p className="mt-2 text-[12px] text-fg">Sendt i forhåndsvisning.</p> : null}
          {avvik.isError ? (
            <p className="mt-2 text-[12px] text-danger">{avvik.error.message}</p>
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
              disabled={!tekst.trim() || avvik.isPending}
              onClick={send}
              className="inline-flex h-8 items-center rounded-full bg-fg px-3 text-[12px] font-[650] text-bg disabled:opacity-40"
            >
              {avvik.isPending ? 'Sender …' : 'Send'}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
