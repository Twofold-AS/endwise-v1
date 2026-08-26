'use client';

import { ChevronRight } from '@endwise/ui';
import { DEALERS } from '../_data';

/**
 * Forhandlerliste.
 * ikke I bruk . Sto på forhandlerens forside og viste
 * Andre forhandlere — Endwise-interne data på feil skjerm. Fjernet derfra da
 * Verkstedet ble ryddet. Filen står igjen fordi lista hører hjemme i
 * Endwise-admin-konteksten når den bygges (den er bevisst tom i dag).
 * 44px «stores»-rad (eierens spec): to tekstlinjer i navnekolonnen.
 */
export function DealerList() {
  return (
    <ul className="divide-y divide-border">
      {DEALERS.map((d) => (
        <li
          key={d.id}
          className="flex h-row-store items-center gap-4 px-4 transition-colors hover:bg-surface-2"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-label text-fg">{d.navn}</p>
            <p className="truncate text-[12px] text-fg-muted">{d.sted}</p>
          </div>

          <div className="w-16 shrink-0 text-right">
            <p className="text-label text-fg tabular-nums">{d.bookinger}</p>
            <p className="text-[12px] text-fg-muted">bookinger</p>
          </div>
          <div className="w-14 shrink-0 text-right">
            <p className="text-label text-fg tabular-nums">{d.belegg} %</p>
            <p className={`text-[12px] ${d.trend === 'up' ? 'text-success' : 'text-warn'}`}>
              {d.delta}
            </p>
          </div>
          <ChevronRight size={16} className="shrink-0 text-fg-muted" aria-hidden />
        </li>
      ))}
    </ul>
  );
}
