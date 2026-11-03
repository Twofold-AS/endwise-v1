'use client';

import { DrawerFooter } from '@endwise/ui';
import type { ReactNode } from 'react';
import { OpprettSkuff } from '../opprett-skuff';

/**
 * Felles stegvis oppretter. Bunn-skuff på mobil, «Steg n av m», maks 4 steg.
 */
export function OppretterSkuff({
  tittel,
  apen,
  onLukk,
  stegIndeks,
  stegAntall,
  stegTittel,
  hjelp,
  onTilbake,
  onNeste,
  onOpprett,
  kanGaaVidere,
  siste,
  opprettLabel = 'Opprett',
  venter,
  deaktivert,
  deaktivertHint,
  children,
}: {
  tittel: string;
  apen: boolean;
  onLukk: () => void;
  stegIndeks: number;
  stegAntall: number;
  stegTittel?: string;
  hjelp?: string;
  onTilbake: () => void;
  onNeste: () => void;
  onOpprett: () => void;
  kanGaaVidere: boolean;
  siste: boolean;
  opprettLabel?: string;
  venter?: boolean;
  deaktivert?: boolean;
  deaktivertHint?: string;
  children: ReactNode;
}) {
  const visSteg = stegAntall > 1;

  return (
    <OpprettSkuff
      tittel={tittel}
      apen={apen}
      onLukk={onLukk}
      tvingSkuff
      footer={
        <DrawerFooter className="gap-2">
          {stegIndeks > 0 ? (
            <button
              type="button"
              onClick={onTilbake}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-pill border border-border text-body text-fg"
            >
              Tilbake
            </button>
          ) : (
            <button
              type="button"
              onClick={onLukk}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-pill border border-border text-body text-fg"
            >
              Avbryt
            </button>
          )}
          {siste ? (
            <button
              type="button"
              disabled={!kanGaaVidere || venter || deaktivert}
              onClick={onOpprett}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-pill bg-fg text-body text-bg disabled:opacity-40"
            >
              {venter ? 'Lagrer …' : opprettLabel}
            </button>
          ) : (
            <button
              type="button"
              disabled={!kanGaaVidere}
              onClick={onNeste}
              className="inline-flex h-12 flex-1 items-center justify-center rounded-pill bg-fg text-body text-bg disabled:opacity-40"
            >
              Neste
            </button>
          )}
        </DrawerFooter>
      }
    >
      {visSteg ? (
        <p data-oppretter-steg className="text-meta text-fg-muted">
          Steg {stegIndeks + 1} av {stegAntall}
          {stegTittel ? ` · ${stegTittel}` : ''}
        </p>
      ) : null}
      {visSteg ? (
        <ol className="flex gap-1.5" aria-hidden>
          {Array.from({ length: stegAntall }, (_, i) => (
            <li
              key={`steg-${i + 1}`}
              className={`h-1.5 flex-1 rounded-full ${i <= stegIndeks ? 'bg-fg' : 'bg-surface-2'}`}
            />
          ))}
        </ol>
      ) : null}
      {hjelp ? <p className="text-meta text-fg-muted">{hjelp}</p> : null}
      <div className="flex flex-col gap-4">{children}</div>
      {deaktivert && deaktivertHint ? (
        <p className="text-meta text-fg-muted">{deaktivertHint}</p>
      ) : null}
    </OpprettSkuff>
  );
}
