'use client';

import type { EndringKind } from '@endwise/modules/booking/changes';
import { FeltDato, FeltKlokke, FeltSelect, FeltTekst, FilterChips, SelectItem } from '@endwise/ui';
import { parseDate, Time } from '@internationalized/date';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { osloVeggklokke } from '../_lib/oslo-dag';
import { invalidateHjemPulse, meldingBookingLagret } from '../_shell/hjem-pulse-sync';
import { harVentendeAvvik, harVentendeForespor } from '../_shell/phone-home-pulse';
import { endringerHref } from '../jobber/_faner';

const KIND_CHIPS = [
  { key: 'avvik', label: 'Avvik' },
  { key: 'forespor', label: 'Forespørsel' },
] as const;

/**
 * Jobbdetalj — meld avvik eller forespørsel via `bookings.reportChange`.
 * Valgfri ny tid og mekaniker blir med i ønsket, og godkjennes på Endringer.
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
      setYmd('');
      setKlokke('');
      setMechanicId('');
    },
  });
  const mekanikere = trpc.mechanics.list.useQuery();
  const [apen, setApen] = useState(false);
  const [kind, setKind] = useState<EndringKind>('avvik');
  const [tekst, setTekst] = useState('');
  const [ymd, setYmd] = useState('');
  const [klokke, setKlokke] = useState('');
  const [mechanicId, setMechanicId] = useState('');

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
            const [t, m] = klokke.split(':').map(Number);
            const startsAt =
              ymd && Number.isFinite(t) && Number.isFinite(m)
                ? osloVeggklokke(ymd, t, m)
                : undefined;
            report.mutate({
              bookingId,
              kind,
              message: tekst.trim(),
              startsAt,
              mechanicId: mechanicId || undefined,
            });
          }}
        >
          <FilterChips chips={KIND_CHIPS} valgt={kind} onChange={setKind} ariaLabel="Type" />
          <div className="flex flex-col gap-1">
            <span className="text-[12px] text-fg-muted">Ny dato (valgfritt)</span>
            <FeltDato
              aria-label="Ny dato"
              value={ymd ? parseDate(ymd) : null}
              onChange={(d) => setYmd(d ? d.toString() : '')}
            />
          </div>
          <FeltKlokke
            label="Ny tid (valgfritt)"
            granularity="minute"
            value={
              klokke
                ? new Time(Number(klokke.split(':')[0] ?? 0), Number(klokke.split(':')[1] ?? 0))
                : null
            }
            onChange={(t) => {
              if (!t) {
                setKlokke('');
                return;
              }
              setKlokke(`${String(t.hour).padStart(2, '0')}:${String(t.minute).padStart(2, '0')}`);
            }}
          />
          <FeltSelect
            label="Ny mekaniker (valgfritt)"
            selectedKey={mechanicId || null}
            onSelectionChange={(key) => setMechanicId(String(key ?? ''))}
            placeholder="Samme mekaniker"
          >
            {(mekanikere.data ?? [])
              .filter((m) => m.active)
              .map((m) => (
                <SelectItem key={m.id} id={m.id}>
                  {m.name}
                </SelectItem>
              ))}
          </FeltSelect>
          <FeltTekst
            value={tekst}
            onChange={setTekst}
            rows={3}
            maxLength={500}
            placeholder={kind === 'avvik' ? 'Hva er avviket?' : 'Hva spør du om?'}
            aria-label="Melding"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={report.isPending || !tekst.trim()}
              className="h-10 flex-1 rounded-full bg-fg text-[12px] font-[650] text-bg disabled:opacity-40"
            >
              {report.isPending ? 'Sender …' : 'Send'}
            </button>
            <button
              type="button"
              onClick={() => setApen(false)}
              className="h-10 rounded-full border border-border px-4 text-[12px] text-fg"
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
