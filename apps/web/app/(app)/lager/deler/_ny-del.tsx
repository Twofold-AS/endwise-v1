'use client';

import { StatefulButton } from '@endwise/ui';
import { type FormEvent, useState } from 'react';
import { trpc } from '@/lib/trpc';

/** Ny del mot ekte `inventory.createPart` (admin). */
export function NyDel({ onFerdig }: { onFerdig: () => void }) {
  const utils = trpc.useUtils();
  const [sku, setSku] = useState('');
  const [navn, setNavn] = useState('');
  const [min, setMin] = useState('');
  const opprett = trpc.inventory.createPart.useMutation({
    onSuccess: () => {
      void utils.inventory.listParts.invalidate();
      void utils.inventory.summary.invalidate();
      onFerdig();
    },
  });

  function submit(e: FormEvent) {
    e.preventDefault();
    if (!sku.trim() || !navn.trim()) return;
    const minStock = min.trim() ? Number(min) : undefined;
    opprett.mutate({
      sku: sku.trim(),
      name: navn.trim(),
      minStock: Number.isFinite(minStock) ? minStock : undefined,
    });
  }

  return (
    <form
      data-ny-del
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-xl border border-border bg-bg p-4"
    >
      <label className="flex flex-col gap-1">
        <span className="text-fg-faint text-xs">Delenummer</span>
        <input
          value={sku}
          onChange={(e) => setSku(e.target.value)}
          className="h-control ew-felt ew-felt-md px-2.5"
          placeholder="OLJE-5W40"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-fg-faint text-xs">Navn</span>
        <input
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
          className="h-control ew-felt ew-felt-md px-2.5"
          placeholder="Motorolje 5W-40"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-fg-faint text-xs">Minimum</span>
        <input
          value={min}
          onChange={(e) => setMin(e.target.value)}
          type="number"
          min={0}
          className="h-control ew-felt ew-felt-md px-2.5"
        />
      </label>
      {opprett.isError ? <p className="text-danger text-xs">{opprett.error.message}</p> : null}
      <StatefulButton
        type="submit"
        disabled={!sku.trim() || !navn.trim() || opprett.isPending}
        state={opprett.isPending ? 'loading' : opprett.isError ? 'error' : 'idle'}
        loadingText="Lagrer…"
        errorText="Feilet"
      >
        Lagre del
      </StatefulButton>
    </form>
  );
}
