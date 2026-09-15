'use client';

import { Switch } from '@endwise/ui';
import { useState } from 'react';

export const INNBYGGING_INTEGRASJONER = [
  { id: 'hellanor', navn: 'Hellanor', merknad: 'Reservedeler og innkjøp.' },
  { id: 'finn', navn: 'Finn.no', merknad: 'Annonser for kjøretøy til salgs.' },
  { id: 'vipps', navn: 'Vipps', merknad: 'Betaling i kasse og widget.' },
  { id: 'tripletex', navn: 'Tripletex', merknad: 'Regnskap og faktura.' },
  { id: 'svv', navn: 'SVV', merknad: 'Statens vegvesen / Autosys-oppslag.' },
] as const;

/**
 * Integrasjoner: av/på + merknad under eksisterende Integrasjoner-pille.
 * Bryterne er økt-lokale — katalog-API har ikke av/på ennå.
 */
export function InnbyggingIntegrasjonRader({
  aktiveNokler = [],
}: {
  aktiveNokler?: readonly string[];
}) {
  const start = new Set(aktiveNokler);
  const [paa, setPaa] = useState<ReadonlySet<string>>(() => start);

  return (
    <section data-org-integrasjoner-brytere className="flex flex-col gap-2">
      <h3 className="text-label text-fg">Koblinger</h3>
      <p className="text-[12px] text-fg-muted">
        Av/på er merket mock der integrasjonen ikke har egen bryter ennå.
      </p>
      <div className="overflow-hidden rounded-[24px] border border-divide bg-card shadow-none">
        {INNBYGGING_INTEGRASJONER.map((rad, i) => {
          const aktiv = paa.has(rad.id);
          return (
            <div
              key={rad.id}
              data-integrasjon-rad={rad.id}
              className={`flex min-h-11 items-center gap-3 px-4 py-3 ${
                i > 0 ? 'border-divide border-t' : ''
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="text-label text-fg">{rad.navn}</p>
                <p className="text-[12px] text-fg-muted">{rad.merknad}</p>
              </div>
              <Switch
                checked={aktiv}
                onCheckedChange={(v) => {
                  setPaa((forrige) => {
                    const neste = new Set(forrige);
                    if (v) neste.add(rad.id);
                    else neste.delete(rad.id);
                    return neste;
                  });
                }}
                aria-label={`${rad.navn} av eller på`}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
}
