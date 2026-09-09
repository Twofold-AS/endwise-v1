'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { TimeplanAvvik } from './_avvik';
import { ENDRINGER_DELER, type EndringerDelId, endringerHref } from './_faner';
import { TimeplanForespor } from './_forespor';

/**
 * Timeplan › Endringer — Innstillinger-inndeling (underline-faner + panel).
 * Avvik og Forespørsler er innholdsfaner, ikke destinasjoner i Timeplan-baren.
 */
export function TimeplanEndringer({ del }: { del: EndringerDelId }) {
  const def = ENDRINGER_DELER.find((f) => f.id === del) ?? ENDRINGER_DELER[0];
  return (
    <div data-timeplan-endringer-flate className="flex flex-col gap-5">
      <div role="tablist" aria-label="Endringer" className="flex flex-wrap gap-5">
        {ENDRINGER_DELER.map((f) => {
          const valgt = f.id === del;
          return (
            <Link
              key={f.id}
              href={endringerHref(f.id) as Route}
              role="tab"
              aria-selected={valgt}
              scroll={false}
              data-endringer-fane={f.id}
              className={`inline-flex items-center border-b-2 pb-1 text-label ${
                valgt ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>
      <section role="tabpanel" aria-label={def?.label ?? 'Avvik'} className="flex flex-col gap-5">
        <div>
          <h2 className="text-title text-fg">{def?.label ?? 'Avvik'}</h2>
          {def?.ingress ? <p className="text-body text-fg-muted">{def.ingress}</p> : null}
        </div>
        {del === 'forespor' ? <TimeplanForespor /> : <TimeplanAvvik />}
      </section>
    </div>
  );
}
