'use client';

import { Grainient } from '@endwise/ui';
import { trpc } from '@/lib/trpc';
import { useTema } from '../_lib/bruk-tema';
import { GRAINIENT_LYS, GRAINIENT_MORK, visKortFelt } from './forhandler-kort';

/**
 * Forhandler-kort med Grainient som bakgrunn — hero-kort, ikke 1080-kvadrat.
 * Samme kort på Forhandler / Mekaniker / Selger / Support-hjem.
 */
export function ForhandlerGrainientKort() {
  const tema = useTema();
  const kort = trpc.forhandler.kort.useQuery();
  const palett = tema === 'dark' ? GRAINIENT_MORK : GRAINIENT_LYS;
  const navn = kort.data?.name?.trim() || 'Forhandleren';
  const felt = visKortFelt(kort.data ?? {});
  const lys = tema !== 'dark';

  return (
    <article
      data-forhandler-grainient
      data-forhandlernavn
      className="relative isolate min-h-[140px] w-full overflow-hidden rounded-xl"
    >
      <div className="absolute inset-0" aria-hidden>
        <Grainient
          className="h-full w-full"
          timeSpeed={0.25}
          colorBalance={0.2}
          warpStrength={1}
          color1={palett.color1}
          color2={palett.color2}
          color3={palett.color3}
          lightMode={lys}
        />
      </div>
      <div
        className={`relative z-10 flex flex-col gap-1.5 p-4 ${
          lys ? 'text-[#111111]' : 'text-white'
        }`}
      >
        <h2 className="text-title">{navn}</h2>
        {kort.isLoading ? <p className="text-[12px] opacity-70">Laster …</p> : null}
        {felt.map((f) => (
          <p
            key={f.label}
            className={`text-[12px] leading-snug ${lys ? 'text-[#333333]' : 'text-[#ededed]'}`}
          >
            <span className="text-label">{f.label}: </span>
            {f.verdi}
          </p>
        ))}
      </div>
    </article>
  );
}
