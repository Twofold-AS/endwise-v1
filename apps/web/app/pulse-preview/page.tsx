'use client';

import { Inbox, Package, Users } from '@endwise/ui';
import { useMemo } from 'react';
import { useTema } from '../_lib/tema-provider';
import { osloVeggklokke } from '../(app)/_lib/oslo-dag';
import { analyserMockStats, pulsdagOverskrift } from '../(app)/_shell/phone-home-pulse';
import {
  PulseAnalyserKort,
  PulseHeroFlate,
  PulseJobbFlis,
  PulseRadKort,
} from '../(app)/_shell/pulse-kort';

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Forhandler-hjem: toppkort + Analyser over Jobb.
 */
export default function PulsePreview() {
  const { los, sett } = useTema();
  const analyser = useMemo(() => analyserMockStats(new Date('2026-09-08T10:00:00')), []);
  const dag = useMemo(() => pulsdagOverskrift(new Date('2026-09-08T10:00:00')), []);
  /** Midt i 08–19 så GO-skjermbildet viser klokkevis bue venstre→høyre. */
  const sirkelNaa = useMemo(() => osloVeggklokke('2026-09-08', 13, 30), []);
  return (
    <div className="min-h-dvh bg-bg text-fg" data-pulse-preview="go">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-2.5 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Forhandler-hjem preview</p>
          <button
            type="button"
            className="text-label text-fg-muted"
            onClick={() => sett(los === 'dark' ? 'light' : 'dark')}
          >
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>

        <PulseHeroFlate
          href="#idag"
          ukedag={dag.ukedag}
          dato={dag.dato}
          planlagt={3}
          paagaar={2}
          ferdig={1}
          lasterJobber={false}
          avvik={2}
          forespor={0}
          sirkelNaa={sirkelNaa}
        />

        <PulseRadKort href="#innboks" ikon={Inbox} tittel="Les alle siste meldinger" teller={7} />
        <PulseRadKort href="#lager" ikon={Package} tittel="Venter på bestilling" teller={3} />
        <PulseAnalyserKort stats={analyser} href="#statistikk" forhandlerNavn="Nordvik MC" />
        <div data-pulse-bunn className="flex w-full gap-3">
          <div className="min-w-0 flex-1 basis-0">
            <PulseRadKort href="#team" ikon={Users} tittel="På jobb" teller="2 / 4" kompakt />
          </div>
          <div className="min-w-0 flex-1 basis-0">
            <PulseJobbFlis />
          </div>
        </div>
      </div>
    </div>
  );
}
