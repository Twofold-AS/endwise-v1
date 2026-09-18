'use client';

import { Dialog, DialogContent, DialogTitle } from '@endwise/ui';
import { useState } from 'react';

export function BestillDelArk({
  del,
  onBestilt,
  onLukk,
}: {
  del: { id: string; name: string; sku: string };
  onBestilt: (id: string) => void;
  onLukk: () => void;
}) {
  const [antall, setAntall] = useState(1);
  return (
    <Dialog open onOpenChange={(o) => !o && onLukk()}>
      <DialogContent className="top-1/2 left-1/2 w-[min(400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
        <DialogTitle className="text-title text-fg">Bestill {del.name}</DialogTitle>
        <p className="mt-1 text-[12px] text-fg-muted">
          {del.sku} · merket mock — ingen innkjøps-API ennå.
        </p>
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-label text-fg">Antall</span>
          <input
            type="number"
            min={1}
            value={antall}
            onChange={(e) => setAntall(Math.max(1, Number(e.target.value) || 1))}
            className="h-control ew-felt ew-felt-md px-3"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onLukk} className="text-label text-fg-muted">
            Avbryt
          </button>
          <button
            type="button"
            data-lager-bestill-send
            onClick={() => {
              onBestilt(del.id);
              onLukk();
            }}
            className="inline-flex h-8 items-center rounded-full bg-fg px-3 text-[12px] font-[650] text-bg"
          >
            Bestill
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EndreMinimumArk({
  del,
  onLagre,
  onLukk,
}: {
  del: { id: string; name: string; minStock: number | null };
  onLagre: (id: string, min: number) => void;
  onLukk: () => void;
}) {
  const [min, setMin] = useState(del.minStock ?? 0);
  return (
    <Dialog open onOpenChange={(o) => !o && onLukk()}>
      <DialogContent className="top-1/2 left-1/2 w-[min(400px,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 p-5">
        <DialogTitle className="text-title text-fg">Endre minimum</DialogTitle>
        <p className="mt-1 text-[12px] text-fg-muted">
          {del.name} · økt-lokalt til updatePart finnes.
        </p>
        <label className="mt-3 flex flex-col gap-1.5">
          <span className="text-label text-fg">Minimum</span>
          <input
            type="number"
            min={0}
            value={min}
            onChange={(e) => setMin(Math.max(0, Number(e.target.value) || 0))}
            className="h-control ew-felt ew-felt-md px-3"
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onLukk} className="text-label text-fg-muted">
            Avbryt
          </button>
          <button
            type="button"
            data-lager-minimum-lagre
            onClick={() => {
              onLagre(del.id, min);
              onLukk();
            }}
            className="inline-flex h-8 items-center rounded-full bg-fg px-3 text-[12px] font-[650] text-bg"
          >
            Lagre
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
