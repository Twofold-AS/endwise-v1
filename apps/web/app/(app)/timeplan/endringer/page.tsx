'use client';

import { ArrowLeftRight, CircleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { HJEM_PULSE_REFETCH } from '../../_shell/hjem-pulse-sync';
import { VERKSTED_INNHOLD } from '../../_shell/phone-home';
import { AVVIK_NOTAT_PREFIKS, endringerVindu, harAvvikNotat } from '../../_shell/phone-home-pulse';

/**
 * Timeplan › Endringer — dealer-godkjenning av ventende endringer.
 *
 * Kilde (ekte): `bookings.list` · notat med `[AVVIK ` fra
 * `mechanic.reportDeviation` (F7-05).
 *
 * Hull (dokumentert):
 * - Ekstra-tid-forespørsel på Min dag er simulert — ingen rad i basen.
 * - Godkjenn-knappen er stub: ingen notes-update-rute ennå (F7-05 selger-konsument).
 * - Registreringsendring utenom avvik-notat finnes ikke som egen tabell.
 */
export default function TimeplanEndringerPage() {
  const vindu = useMemo(() => endringerVindu(new Date()), []);
  const bookings = trpc.bookings.list.useQuery(
    { from: vindu.fra, to: vindu.til, limit: 200 },
    HJEM_PULSE_REFETCH,
  );
  const [stubGodkjent, setStubGodkjent] = useState<ReadonlySet<string>>(() => new Set());

  const rader = (bookings.data ?? []).filter(
    (j) => j.status !== 'cancelled' && harAvvikNotat(j.notes) && !stubGodkjent.has(j.id),
  );

  return (
    <div
      data-timeplan-endringer
      className={`${VERKSTED_INNHOLD} flex min-h-0 flex-1 flex-col gap-4 py-5`}
    >
      <div className="flex items-center gap-2">
        <ArrowLeftRight size={18} strokeWidth={1.75} aria-hidden />
        <h1 className="text-title text-fg">Endringer</h1>
        <span data-endringer-antall className="ml-auto text-[12px] text-fg-muted tabular-nums">
          {bookings.isLoading ? '…' : `${rader.length} ventende`}
        </span>
      </div>
      <p className="text-[12px] text-fg-muted leading-relaxed">
        Forespørsler og avvik mekanikere logger på jobben. Telleren på hjem er ekte{' '}
        <code className="text-fg">{AVVIK_NOTAT_PREFIKS.trim()}</code>-notat — ikke mock. Godkjenning
        skrives ikke tilbake ennå (F7-05).
      </p>

      {bookings.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster endringer …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen ventende endringer.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li
              key={j.id}
              data-endringer-rad={j.id}
              className="flex flex-col gap-2 rounded-[16px] border border-divide bg-card px-4 py-3"
            >
              <div className="flex items-baseline justify-between gap-2">
                <p className="min-w-0 truncate text-label text-fg">
                  {j.serviceName ?? 'Jobb'}
                  {j.regNumber ? ` · ${j.regNumber}` : ''}
                </p>
                <span className="shrink-0 text-[11px] text-fg-muted">{j.status}</span>
              </div>
              <p className="whitespace-pre-wrap text-[12px] text-fg-muted">
                {avvikUtdrag(j.notes)}
              </p>
              <div className="flex items-center justify-between gap-2">
                <Link
                  href={`/bookinger/${j.id}` as Route}
                  className="text-[12px] text-fg underline-offset-2 hover:underline"
                >
                  Åpne jobb
                </Link>
                <button
                  type="button"
                  data-endringer-godkjenn
                  className="inline-flex h-8 items-center rounded-full bg-fg px-3 text-[12px] font-[650] text-bg"
                  onClick={() => {
                    setStubGodkjent((forrige) => new Set([...forrige, j.id]));
                  }}
                >
                  Godkjenn
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="flex items-start gap-2 text-[12px] text-fg-muted">
        <CircleAlert size={14} strokeWidth={1.75} className="mt-0.5 shrink-0" />
        Godkjenn er lokal stub i denne økta. Ekstra tid fra mekaniker er prototype og teller ikke.
        Avvik-listen leser ekte booking-notat.
      </p>
    </div>
  );
}

function avvikUtdrag(notes: string | null | undefined): string {
  if (!notes) return 'Avvik uten tekst.';
  const linjer = notes
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.includes(AVVIK_NOTAT_PREFIKS.trim()));
  return linjer.join('\n') || notes;
}
