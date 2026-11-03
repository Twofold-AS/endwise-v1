'use client';

import { DeaktivertHandling, FilterChips, ListeRad, Side, StatusChip } from '@endwise/ui';
import { useMemo, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { osloDagsvindu, osloKalenderdag } from '../_lib/oslo-dag';
import { timeplanManedDager } from '../_shell/timeplan-dager';
import { TimeplanStripe } from '../_shell/timeplan-stripe';
import { Feil, Laster, Tomt } from '../kunder/_delt';

const VISNING = [
  { key: 'uke', label: 'Uke' },
  { key: 'maned', label: 'Måned' },
] as const;

/**
 * Organisasjon › Timeplan ansatte.
 * Uke/måned med fri, stempling, syk og ferie.
 * Stempling/syk/ferie har ingen API — vises deaktivert. Eksisterende
 * status og dagens bookinger vises ærlig.
 */
export function TimeplanAnsatteFlate() {
  const [valgt, setValgt] = useState(() => osloKalenderdag(new Date()));
  const [visning, setVisning] = useState<(typeof VISNING)[number]['key']>('uke');
  const vindu = osloDagsvindu(valgt);
  const mekanikere = trpc.mechanics.oversikt.useQuery();
  const kalender = trpc.bookings.calendar.useQuery({ from: vindu.from, to: vindu.to });
  const maned = useMemo(() => timeplanManedDager(valgt), [valgt]);

  const jobberPer = new Map<string, number>();
  for (const jobb of kalender.data ?? []) {
    if (!jobb.mechanicId || jobb.status === 'cancelled') continue;
    jobberPer.set(jobb.mechanicId, (jobberPer.get(jobb.mechanicId) ?? 0) + 1);
  }

  return (
    <Side tittel="Timeplan ansatte" className="[&>header]:sr-only max-md:px-0">
      <div data-timeplan-ansatte className="flex flex-col gap-4">
        <p className="text-[13px] text-fg-muted">
          Fri og kapasitet fra eksisterende data. Stempling, syk og ferie kommer senere.
        </p>
        <FilterChips
          ariaLabel="Visning"
          chips={[...VISNING]}
          valgt={visning}
          onChange={setVisning}
        />
        {visning === 'uke' ? (
          <TimeplanStripe valgt={valgt} onValgt={setValgt} />
        ) : (
          <div
            data-timeplan-ansatte-maned
            className="grid grid-cols-7 gap-1 rounded-[24px] border border-border p-3"
          >
            {['Ma', 'Ti', 'On', 'To', 'Fr', 'Lø', 'Sø'].map((d) => (
              <p key={d} className="text-center text-[13px] text-fg-muted">
                {d}
              </p>
            ))}
            {maned.map((d) => {
              const aktiv = d.ymd === valgt;
              return (
                <button
                  key={d.ymd}
                  type="button"
                  onClick={() => setValgt(d.ymd)}
                  className={`h-10 rounded-pill text-[13px] tabular-nums ${
                    aktiv ? 'bg-fg text-bg' : d.iManed ? 'text-fg' : 'text-fg-faint'
                  }`}
                >
                  {d.label}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <DeaktivertHandling forklaring="Ingen sykemelding-API ennå">
            Marker syk
          </DeaktivertHandling>
          <DeaktivertHandling forklaring="Ingen ferie-API ennå">Marker ferie</DeaktivertHandling>
          <DeaktivertHandling forklaring="Ingen stempling-API ennå">
            Registrer stempling
          </DeaktivertHandling>
        </div>

        {mekanikere.isLoading || kalender.isLoading ? (
          <Laster />
        ) : mekanikere.isError ? (
          <Feil melding={mekanikere.error.message} />
        ) : (mekanikere.data?.length ?? 0) === 0 ? (
          <Tomt
            tittel="Ingen ansatte i timeplanen"
            hint="Ansatte vises når mekanikere er opprettet."
          />
        ) : (
          <div className="flex flex-col">
            {mekanikere.data?.map((m) => {
              const fri = !m.active || m.status === 'fri';
              const jobber = jobberPer.get(m.id) ?? 0;
              return (
                <ListeRad
                  key={m.id}
                  tittel={m.name}
                  undertekst={
                    fri
                      ? 'Fri'
                      : `${m.statusLabel}${jobber > 0 ? ` · ${jobber} jobber` : ' · ingen stempling'}`
                  }
                  hoyre={
                    fri ? (
                      <StatusChip status="flyttet" />
                    ) : (
                      <span className="text-[13px] tabular-nums">{jobber}</span>
                    )
                  }
                  chevron={false}
                  initialer={m.name
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((d) => d[0])
                    .join('')
                    .toLocaleUpperCase('nb-NO')}
                />
              );
            })}
          </div>
        )}
      </div>
    </Side>
  );
}
