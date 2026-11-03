'use client';

import { FilterChips } from '@endwise/ui';
import type { Route } from 'next';
import Link from 'next/link';
import { useState } from 'react';
import { TimeplanAvvik } from './_avvik';
import { ENDRINGER_DELER, ENDRINGER_LOGG, type EndringerDelId, endringerHref } from './_faner';
import { TimeplanForespor } from './_forespor';
import { TimeplanLogg } from './_logg';

const ENDRINGER_CHIPS = [
  { key: 'alle', label: 'Alle' },
  { key: 'avvik', label: 'Avvik' },
  { key: 'forespor', label: 'Forespørsler' },
] as const;

/**
 * Timeplan › Endringer — Innstillinger-inndeling (underline-faner + panel).
 * Avvik, Forespørsler og Logg er innholdsfaner, ikke destinasjoner i Timeplan-baren.
 */
export function TimeplanEndringer({
  del,
  endringId,
}: {
  del: EndringerDelId;
  endringId?: string | null;
}) {
  const def =
    del === 'logg'
      ? ENDRINGER_LOGG
      : (ENDRINGER_DELER.find((f) => f.id === del) ?? ENDRINGER_DELER[0]);
  const [vis, setVis] = useState<'alle' | 'avvik' | 'forespor'>(
    del === 'forespor' ? 'forespor' : del === 'avvik' ? 'avvik' : 'alle',
  );
  return (
    <div data-timeplan-endringer-flate className="flex flex-col gap-5">
      {del === 'logg' ? null : (
        <FilterChips chips={ENDRINGER_CHIPS} valgt={vis} onChange={setVis} ariaLabel="Vis" />
      )}
      <section role="tabpanel" aria-label={def?.label ?? 'Avvik'} className="flex flex-col gap-5">
        {endringId ? null : (
          <div>
            <h2 className="text-title text-fg">{def?.label ?? 'Avvik'}</h2>
            {def?.ingress ? <p className="text-body text-fg-muted">{def.ingress}</p> : null}
          </div>
        )}
        {del === 'logg' ? (
          <TimeplanLogg endringId={endringId} />
        ) : vis === 'alle' ? (
          <>
            <TimeplanAvvik endringId={endringId} />
            <TimeplanForespor endringId={endringId} />
          </>
        ) : vis === 'forespor' || del === 'forespor' ? (
          <TimeplanForespor endringId={endringId} />
        ) : (
          <TimeplanAvvik endringId={endringId} />
        )}
        {endringId || del === 'logg' ? null : (
          <Link
            href={endringerHref('logg') as Route}
            data-endringer-logg
            className="text-[12px] text-fg-muted underline-offset-2 hover:underline"
          >
            Logg — behandlede avvik og forespørsler
          </Link>
        )}
      </section>
    </div>
  );
}
