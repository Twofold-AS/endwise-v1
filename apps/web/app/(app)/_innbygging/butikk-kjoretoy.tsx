'use client';

import type { Route } from 'next';
import Link from 'next/link';
import type { ReactNode } from 'react';

export type SalgsKjoretoy = {
  id: string;
  tittel: string;
  href: string;
};

/**
 * Kjøretøy til salgs under Butikk-hub.
 * Ærlige tommer — ingen mock-rader når registeret er tomt.
 */
export function ButikkKjoretoySalg({
  kjoretoy,
  seAlle,
}: {
  kjoretoy: readonly {
    id: string;
    make?: string | null;
    model?: string | null;
    regNumber?: string | null;
  }[];
  seAlle?: ReactNode;
}) {
  const rader: SalgsKjoretoy[] = kjoretoy.map((k) => ({
    id: k.id,
    tittel: [k.make, k.model, k.regNumber].filter(Boolean).join(' · ') || 'Kjøretøy',
    href: `/butikk/salg/${k.id}`,
  }));

  return (
    <section data-butikk-kjoretoy className="flex flex-col gap-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-title text-fg">Kjøretøy til salgs</h2>
          <p className="text-[12px] text-fg-muted">
            Registeret. Kjørt og kanal er ikke registrert ennå.
          </p>
        </div>
        {seAlle}
      </div>
      {rader.length === 0 ? (
        <p className="py-6 text-center text-label text-fg-muted">Ingen kjøretøy til salgs.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rader.map((k) => (
            <li key={k.id} data-butikk-salg={k.id}>
              <Link
                href={k.href as Route}
                className="flex items-center justify-between gap-3 rounded-[24px] border border-divide bg-card px-4 py-3 shadow-none"
              >
                <span className="min-w-0">
                  <span className="block truncate text-label font-[650] text-fg">{k.tittel}</span>
                  <span className="block text-[12px] text-fg-muted">
                    Ikke registrert · Ingen kanal
                  </span>
                </span>
                <span className="shrink-0 text-[12px] text-fg-muted">Ingen pris</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
