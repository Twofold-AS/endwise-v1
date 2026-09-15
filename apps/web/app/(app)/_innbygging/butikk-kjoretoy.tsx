'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { useMemo, useState } from 'react';

export type SalgsKjoretoy = {
  id: string;
  tittel: string;
  pris: string;
  km: string;
  finn: boolean;
  reservert: boolean;
  href?: string;
  mock?: boolean;
};

export const BUTIKK_SALG_MOCK: SalgsKjoretoy[] = [
  {
    id: 'mock-r1',
    tittel: 'Yamaha MT-07 · EL12345',
    pris: '89 900 kr',
    km: '12 400 km',
    finn: true,
    reservert: false,
    mock: true,
  },
  {
    id: 'mock-r2',
    tittel: 'Honda CB500 · AB98765',
    pris: '64 500 kr',
    km: '28 100 km',
    finn: false,
    reservert: true,
    mock: true,
  },
];

/**
 * Kjøretøy til salgs under Butikk — pris · km · Finn.no · Reservert · Rediger.
 * Bruker ekte kjøretøy når de finnes; ellers merket mock så preview er klikkbar.
 */
export function ButikkKjoretoySalg({
  kjoretoy,
}: {
  kjoretoy: readonly {
    id: string;
    make?: string | null;
    model?: string | null;
    regNumber?: string | null;
    modelYear?: string | number | null;
  }[];
}) {
  const [reservert, setReservert] = useState<ReadonlySet<string>>(() => new Set());
  const rader = useMemo<SalgsKjoretoy[]>(() => {
    if (kjoretoy.length === 0) return BUTIKK_SALG_MOCK;
    return kjoretoy.slice(0, 8).map((k, i) => ({
      id: k.id,
      tittel: [k.make, k.model, k.regNumber].filter(Boolean).join(' · ') || 'Kjøretøy',
      pris: i % 2 === 0 ? '79 900 kr' : '54 000 kr',
      km: i % 2 === 0 ? '18 200 km' : '41 050 km',
      finn: i % 3 !== 0,
      reservert: reservert.has(k.id),
      href: `/kjoretoy/${k.id}`,
      mock: true,
    }));
  }, [kjoretoy, reservert]);

  return (
    <section data-butikk-kjoretoy className="flex flex-col gap-3">
      <div>
        <h2 className="text-title text-fg">Kjøretøy til salgs</h2>
        <p className="text-[12px] text-fg-muted">
          Pris og Finn.no er merket mock — ingen salgs-API ennå.
        </p>
      </div>
      {rader.length === 0 ? (
        <p className="py-6 text-center text-label text-fg-muted">Ingen kjøretøy til salgs.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((k) => (
            <li
              key={k.id}
              data-butikk-salg={k.id}
              className="flex flex-col gap-2 rounded-[24px] border border-divide bg-card px-4 py-3 shadow-none"
            >
              <p className="text-label font-[650] text-fg">{k.tittel}</p>
              <p className="text-[12px] text-fg-muted">
                {k.pris} · {k.km}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex h-badge items-center rounded-badge px-2 text-[11px] ${
                    k.finn ? 'bg-surface-2 text-fg' : 'bg-surface-2 text-fg-muted'
                  }`}
                >
                  Finn.no {k.finn ? 'publisert' : 'ikke lagt ut'}
                </span>
                <span
                  className={`inline-flex h-badge items-center rounded-badge px-2 text-[11px] ${
                    k.reservert ? 'bg-warn-soft text-warn' : 'bg-surface-2 text-fg-muted'
                  }`}
                >
                  {k.reservert ? 'Reservert' : 'Ledig'}
                </span>
                <button
                  type="button"
                  data-butikk-reserver
                  onClick={() => {
                    setReservert((forrige) => {
                      const neste = new Set(forrige);
                      if (neste.has(k.id)) neste.delete(k.id);
                      else neste.add(k.id);
                      return neste;
                    });
                  }}
                  className="text-[12px] text-fg underline-offset-2 hover:underline"
                >
                  {k.reservert ? 'Frigi' : 'Reserver'}
                </button>
                <Link
                  href={(k.href ?? '/butikk') as Route}
                  className="ml-auto text-[12px] text-fg underline-offset-2 hover:underline"
                >
                  Rediger
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
