'use client';

import { Grainient } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { GRAINIENT_FARGER, visKortFelt } from './forhandler-kort';

/**
 * Forhandler-kort med Grainient som bakgrunn — hero-kort, ikke 1080-kvadrat.
 * Samme kort på Forhandler / Mekaniker / Selger / Support-hjem.
 * Lys og mørk bruker samme grå (#777/#333/#111). Tekst er lys på kornet.
 */
export function ForhandlerGrainientKort() {
  const kort = trpc.forhandler.kort.useQuery();
  const navn = kort.data?.name?.trim() || 'Forhandleren';
  const felt = visKortFelt(kort.data ?? {});

  return (
    <article
      data-forhandler-grainient
      data-forhandlernavn
      className="relative isolate min-h-[220px] w-full overflow-hidden rounded-xl"
    >
      <div className="absolute inset-0" aria-hidden>
        <Grainient
          className="h-full w-full"
          timeSpeed={0.25}
          colorBalance={0.2}
          warpStrength={1}
          color1={GRAINIENT_FARGER.color1}
          color2={GRAINIENT_FARGER.color2}
          color3={GRAINIENT_FARGER.color3}
        />
      </div>
      <div className="relative z-10 flex flex-col gap-1.5 p-4 text-white">
        <h2 className="text-title">{navn}</h2>
        {kort.isLoading ? <p className="text-[12px] opacity-70">Laster …</p> : null}
        {felt.map((f) => (
          <p key={f.label} className="text-[12px] leading-snug text-[#ededed]">
            <span className="text-label">{f.label}: </span>
            {f.verdi}
          </p>
        ))}
      </div>
    </article>
  );
}
