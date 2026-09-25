'use client';

import type { EndringKind } from '@endwise/modules/booking/changes';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { invalidateHjemPulse, meldingBookingLagret } from '../_shell/hjem-pulse-sync';
import { harVentendeAvvik, harVentendeForespor } from '../_shell/phone-home-pulse';
import { endringerHref } from '../jobber/_faner';

/**
 * Jobbdetalj — meld avvik eller forespørsel via `bookings.reportChange`.
 */
export function MeldEndringSkjema({
  bookingId,
  notes,
}: {
  bookingId: string;
  notes?: string | null;
}) {
  const utils = trpc.useUtils();
  const report = trpc.bookings.reportChange.useMutation({
    onSuccess: () => {
      void utils.bookings.byId.invalidate({ id: bookingId });
      void utils.bookings.list.invalidate();
      invalidateHjemPulse(utils);
      meldingBookingLagret();
      setTekst('');
    },
  });
  const [apen, setApen] = useState(false);
  const [kind, setKind] = useState<EndringKind>('avvik');
  const [tekst, setTekst] = useState('');

  const ventendeAvvik = harVentendeAvvik(notes);
  const ventendeForespor = harVentendeForespor(notes);

  return (
    <div
      data-jobb-meld-endring
      className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <p className="font-medium text-fg-faint text-xs">Endring</p>
      {ventendeAvvik ? (
        <Link
          href={endringerHref('avvik', bookingId) as Route}
          className="text-[12px] text-fg underline-offset-2 hover:underline"
        >
          Se innmeldt avvik
        </Link>
      ) : null}
      {ventendeForespor ? (
        <Link
          href={endringerHref('forespor', bookingId) as Route}
          className="text-[12px] text-fg underline-offset-2 hover:underline"
        >
          Se innmeldt forespørsel
        </Link>
      ) : null}

      {!apen ? (
        <button
          type="button"
          data-jobb-meld-apne
          onClick={() => setApen(true)}
          className="inline-flex h-10 items-center justify-center rounded-lg border border-border text-label text-fg"
        >
          Meld avvik eller forespørsel
        </button>
      ) : (
        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!tekst.trim()) return;
            report.mutate({ bookingId, kind, message: tekst.trim() });
          }}
        >
          <div className="flex gap-2">
            <button
              type="button"
              aria-pressed={kind === 'avvik'}
              onClick={() => setKind('avvik')}
              className={`h-8 rounded-full px-3 text-[12px] ${
                kind === 'avvik' ? 'bg-fg text-bg' : 'border border-border text-fg-muted'
              }`}
            >
              Avvik
            </button>
            <button
              type="button"
              aria-pressed={kind === 'forespor'}
              onClick={() => setKind('forespor')}
              className={`h-8 rounded-full px-3 text-[12px] ${
                kind === 'forespor' ? 'bg-fg text-bg' : 'border border-border text-fg-muted'
              }`}
            >
              Forespørsel
            </button>
          </div>
          <textarea
            value={tekst}
            onChange={(e) => setTekst(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder={kind === 'avvik' ? 'Hva er avviket?' : 'Hva spør du om?'}
            className="ew-felt ew-felt-md min-h-[4.5rem] resize-none py-2"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={report.isPending || !tekst.trim()}
              className="h-10 flex-1 rounded-md bg-fg text-[12px] font-[650] text-bg disabled:opacity-40"
            >
              {report.isPending ? 'Sender …' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setApen(false)}
              className="h-10 rounded-md border border-border px-4 text-[12px] text-fg"
            >
              Avbryt
            </button>
          </div>
          {report.isSuccess ? (
            <p className="text-[12px] text-fg">Sendt. Selger ser den under Endringer.</p>
          ) : null}
          {report.isError ? (
            <p className="text-[12px] text-danger">{report.error.message}</p>
          ) : null}
        </form>
      )}
    </div>
  );
}
