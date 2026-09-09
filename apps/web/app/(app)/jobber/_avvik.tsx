'use client';

import { CircleAlert } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { HJEM_PULSE_REFETCH } from '../_shell/hjem-pulse-sync';
import { AVVIK_NOTAT_PREFIKS, endringerVindu, harAvvikNotat } from '../_shell/phone-home-pulse';

/**
 * Timeplan › Avvik — ekte `[AVVIK `-notat fra mechanic.reportDeviation (F7-05).
 * Godkjenn er stub (ingen notes-update ennå).
 */
export function TimeplanAvvik() {
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
    <div data-timeplan-avvik data-timeplan-endringer className="flex flex-col gap-4">
      <p className="text-[12px] text-fg-muted leading-relaxed">
        Avvik mekanikere logger på jobben. Telleren leser ekte{' '}
        <code className="text-fg">{AVVIK_NOTAT_PREFIKS.trim()}</code>-notat — ikke mock. Godkjenning
        skrives ikke tilbake ennå (F7-05).
      </p>

      {bookings.isLoading ? (
        <p className="py-8 text-center text-[12px] text-fg-muted">Laster avvik …</p>
      ) : rader.length === 0 ? (
        <p data-endringer-tom className="py-8 text-center text-label text-fg-muted">
          Ingen ventende avvik.
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
