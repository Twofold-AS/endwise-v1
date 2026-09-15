'use client';

import type { Route } from 'next';
import Link from 'next/link';
import { TimeplanAvvik } from './_avvik';
import { ENDRINGER_DELER, type EndringerDelId, endringerHref, timeplanHref } from './_faner';
import { TimeplanForespor } from './_forespor';
import { TimeplanAlleEndringer } from './_alle-endringer';

/**
 * Timeplan › Endringer — Innstillinger-inndeling (underline-faner + panel).
 * Avvik og Forespørsler er innholdsfaner, ikke destinasjoner i Timeplan-baren.
 * `/jobber?fane=endringer` viser alle fire typer.
 */
export function TimeplanEndringer({ del }: { del: EndringerDelId }) {
  const def =
    del === 'alle'
      ? {
          label: 'Endringer',
          ingress: 'Utvidet tid · Bytte mekaniker · Flytte jobb · Avvik.',
        }
      : (ENDRINGER_DELER.find((f) => f.id === del) ?? ENDRINGER_DELER[0]);
  return (
    <div data-timeplan-endringer-flate className="flex flex-col gap-5">
      <div role="tablist" aria-label="Endringer" className="flex flex-wrap gap-5">
        <Link
          href={timeplanHref('endringer') as Route}
          role="tab"
          aria-selected={del === 'alle'}
          scroll={false}
          data-endringer-fane="alle"
          className={`inline-flex items-center border-b-2 pb-1 text-label ${
            del === 'alle' ? 'border-fg font-[650] text-fg' : 'border-transparent text-fg-muted'
          }`}
        >
          Alle
        </Link>
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
      <section role="tabpanel" aria-label={def?.label ?? 'Endringer'} className="flex flex-col gap-5">
        <div>
          <h2 className="text-title text-fg">{def?.label ?? 'Endringer'}</h2>
          {def?.ingress ? <p className="text-body text-fg-muted">{def.ingress}</p> : null}
        </div>
        {del === 'forespor' ? (
          <TimeplanForespor />
        ) : del === 'avvik' ? (
          <TimeplanAvvik />
        ) : (
          <TimeplanAlleEndringer />
        )}
      </section>
    </div>
  );
}
