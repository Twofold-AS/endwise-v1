'use client';

import { BOOKINGS_30D } from '../_data';

/**
 * Booking-flyt, 30 dager. **Erstatter den stablede dither-arealgrafen**
 * (dither-kit ut av UI-et 03.08.2026).
 *
 * Totalene øverst er det man faktisk leste ut av grafen på ett blikk; tabellen
 * under gir det grafen aldri kunne gi — det eksakte tallet per dag. Ingen
 * canvas, ingen animasjon, ingen RAF-løkke.
 */
const SERIES = [
  { key: 'fullfort', label: 'Fullført', tone: 'text-success' },
  { key: 'planlagt', label: 'Planlagt', tone: 'text-fg' },
  { key: 'avlyst', label: 'Avlyst', tone: 'text-warn' },
] as const;

export function BookingsTable() {
  const totals = {
    fullfort: BOOKINGS_30D.reduce((s, d) => s + d.fullfort, 0),
    planlagt: BOOKINGS_30D.reduce((s, d) => s + d.planlagt, 0),
    avlyst: BOOKINGS_30D.reduce((s, d) => s + d.avlyst, 0),
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Sammendrag — det grafen kommuniserte på ett blikk. */}
      <div className="grid grid-cols-3 gap-2">
        {SERIES.map((s) => (
          <div key={s.key} className="rounded-control border border-border bg-inset px-3 py-2">
            <p className="text-[12px] text-fg-muted">{s.label}</p>
            <p className={`font-medium text-[20px] leading-tight tabular-nums ${s.tone}`}>
              {totals[s.key]}
            </p>
          </div>
        ))}
      </div>

      {/* Dag for dag. 40px datarader (eierens spec). */}
      <div className="max-h-64 overflow-y-auto rounded-control border border-border">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-bg">
            <tr className="border-border border-b">
              <th className="h-row px-3 text-left text-label text-fg-muted">Dag</th>
              {SERIES.map((s) => (
                <th key={s.key} className="h-row px-3 text-right text-label text-fg-muted">
                  {s.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {BOOKINGS_30D.map((d) => (
              <tr key={d.dag} className="border-border border-b last:border-b-0">
                <td className="h-row px-3 text-body text-fg tabular-nums">{d.dag}</td>
                <td className="h-row px-3 text-right text-body text-fg tabular-nums">
                  {d.fullfort}
                </td>
                <td className="h-row px-3 text-right text-body text-fg tabular-nums">
                  {d.planlagt}
                </td>
                <td className="h-row px-3 text-right text-body text-fg tabular-nums">{d.avlyst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
