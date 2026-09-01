'use client';

import { trpc } from '@/lib/trpc';
import { visKortFelt } from './forhandler-kort';

/**
 * Forhandler-info som vanlig kort — ikke Grainient, ikke ShaderGradient.
 * Samme felt som før. Hero-strip for AI er eget (workshop-boksen).
 */
export function ForhandlerInfoKort() {
  const kort = trpc.forhandler.kort.useQuery();
  const navn = kort.data?.name?.trim() || 'Forhandleren';
  const felt = visKortFelt(kort.data ?? {});

  return (
    <article
      data-forhandler-info
      data-forhandlernavn
      className="w-full rounded-xl border border-border bg-card px-4 py-3"
    >
      <h2 className="text-title text-fg">{navn}</h2>
      {kort.isLoading ? <p className="text-[12px] text-fg-muted">Laster …</p> : null}
      <div className="mt-1.5 flex flex-col gap-1">
        {felt.map((f) => (
          <p key={f.label} className="text-[12px] leading-snug text-fg-muted">
            <span className="text-label text-fg">{f.label}: </span>
            {f.verdi}
          </p>
        ))}
      </div>
    </article>
  );
}
