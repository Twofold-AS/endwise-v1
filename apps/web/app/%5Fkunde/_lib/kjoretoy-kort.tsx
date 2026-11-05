'use client';

import { jobbFremdriftProsent } from '@endwise/modules/kunde/fase';
import { type PointerEvent, useMemo, useRef, useState } from 'react';
import { trpc } from '@/lib/trpc';
import { ContextMeter } from './bencho/ContextMeter.tsx';
import { StepPlayer } from './bencho/StepPlayer.tsx';
import { type KjoretoyKortData, kjoretoyTrefferSok, medDemoFyll } from './kjoretoy-kort-data.ts';
import { useKundeSok } from './sok.tsx';

function faseStegAv(prosent: number | null): number | null {
  if (prosent === null) return null;
  if (prosent >= 100) return 2;
  if (prosent >= 66) return 1;
  return 0;
}

export function KjoretoySeksjon() {
  const { sok } = useKundeSok();
  const kjoretoy = trpc.kunde.kjoretoy.useQuery(undefined, { retry: false });
  const aktivJobb = trpc.kunde.aktivJobb.useQuery(undefined, { retry: false });
  const [aktiv, setAktiv] = useState(0);
  const nedX = useRef<number | null>(null);

  const kort = useMemo(() => {
    const jobbTekst = aktivJobb.data?.kjoretoy ?? null;
    const jobbSteg = aktivJobb.data
      ? faseStegAv(jobbFremdriftProsent(aktivJobb.data.fase.steg))
      : null;
    const ekte: KjoretoyKortData[] = (kjoretoy.data ?? []).map((k) => {
      const navn = [k.make, k.model].filter(Boolean).join(' ');
      const tekst = [navn || null, k.regNumber].filter(Boolean).join(' · ');
      return {
        id: k.id,
        type: k.type ?? null,
        merke: k.make ?? null,
        modell: k.model ?? null,
        aarsmodell: k.modelYear ?? null,
        regnr: k.regNumber ?? null,
        faseSteg: jobbTekst && tekst && jobbTekst === tekst ? jobbSteg : null,
      };
    });
    return medDemoFyll(ekte);
  }, [kjoretoy.data, aktivJobb.data]);

  const treff = useMemo(() => kort.filter((k) => kjoretoyTrefferSok(k, sok)), [kort, sok]);
  const valgt = Math.min(aktiv, Math.max(0, treff.length - 1));

  if (kjoretoy.isLoading) return null;

  function velg(i: number) {
    setAktiv(Math.min(Math.max(i, 0), treff.length - 1));
  }

  function onPointerNed(e: PointerEvent<HTMLDivElement>) {
    nedX.current = e.clientX;
  }

  function onPointerOpp(e: PointerEvent<HTMLDivElement>) {
    if (nedX.current === null) return;
    const dx = e.clientX - nedX.current;
    nedX.current = null;
    if (Math.abs(dx) < 40) return;
    velg(valgt + (dx < 0 ? 1 : -1));
  }

  return (
    <section
      data-kunde-kjoretoy-seksjon
      data-bencho-kjoretoy
      className="mx-auto flex w-full max-w-lg flex-col gap-3 px-4 pt-3"
    >
      {treff.length === 0 ? (
        sok.trim() ? (
          <p className="px-1 py-2 text-body text-fg-muted max-md:text-[16px]">
            Ingen kjøretøy matcher «{sok.trim()}».
          </p>
        ) : (
          <ContextMeter kort={null} />
        )
      ) : (
        <>
          <div onPointerDown={onPointerNed} onPointerUp={onPointerOpp}>
            <ContextMeter kort={treff[valgt] ?? null} />
          </div>
          <StepPlayer antall={treff.length} aktiv={valgt} onVelg={velg} />
        </>
      )}
    </section>
  );
}
