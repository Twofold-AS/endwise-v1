'use client';

import { Dialog, DialogContent, DialogTitle } from '@endwise/ui';
import { useState } from 'react';
import { InviterAnsatt } from '../innboks/_inviter-ansatt';

/**
 * Deltaker-ark: Inviter ansatt · Fjern · Forlat · Marker løst · Gjenåpne.
 * Inviter bruker ekte forkThread. Øvrige er økt-lokale til tråd-API finnes.
 */
export function DeltakerArk({
  threadId,
  lost,
  onLost,
  onGjenapne,
}: {
  threadId: string;
  lost: boolean;
  onLost: () => void;
  onGjenapne: () => void;
}) {
  const [apen, setApen] = useState(false);
  const [lokal, setLokal] = useState<string | null>(null);

  return (
    <>
      <button
        type="button"
        data-deltaker-apne
        onClick={() => setApen(true)}
        className="inline-flex h-control items-center rounded-full border border-divide px-3 text-label text-fg"
      >
        Deltakere
      </button>
      <Dialog open={apen} onOpenChange={(o) => !o && setApen(false)}>
        <DialogContent className="top-1/2 left-1/2 w-[min(400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
          <DialogTitle className="text-title text-fg">Deltakere</DialogTitle>
          <div className="mt-3 flex flex-col gap-2" data-deltaker-ark>
            <InviterAnsatt threadId={threadId} />
            <button
              type="button"
              data-deltaker-fjern
              onClick={() => setLokal('Fjernet i denne økta — ingen API ennå.')}
              className="h-10 rounded-[16px] bg-surface-2 px-3 text-left text-label text-fg"
            >
              Fjern
            </button>
            <button
              type="button"
              data-deltaker-forlat
              onClick={() => setLokal('Forlatt i denne økta — ingen API ennå.')}
              className="h-10 rounded-[16px] bg-surface-2 px-3 text-left text-label text-fg"
            >
              Forlat
            </button>
            {lost ? (
              <button
                type="button"
                data-deltaker-gjenapne
                onClick={() => {
                  onGjenapne();
                  setLokal('Tråden er gjenåpnet i denne økta.');
                }}
                className="h-10 rounded-[16px] bg-surface-2 px-3 text-left text-label text-fg"
              >
                Gjenåpne
              </button>
            ) : (
              <button
                type="button"
                data-deltaker-lost
                onClick={() => {
                  onLost();
                  setLokal('Markert løst i denne økta.');
                }}
                className="h-10 rounded-[16px] bg-fg px-3 text-left text-label text-bg"
              >
                Marker løst
              </button>
            )}
          </div>
          {lokal ? <p className="mt-3 text-[12px] text-fg-muted">{lokal}</p> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
