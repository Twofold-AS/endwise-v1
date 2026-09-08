'use client';

import { Inbox, Package, Users } from '@endwise/ui';
import { useMemo } from 'react';
import { useTema } from '../_lib/tema-provider';
import { analyserMockStats, plausibelSpark, PULSE_UKE_TITTEL } from '../(app)/_shell/phone-home-pulse';
import {
  PulseAnalyserKort,
  PulseJobbFlis,
  PulseKort,
  PulseRadKort,
  PulseTall,
  PulseUkeSpark,
} from '../(app)/_shell/pulse-kort';

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Forhandler-hjem har fortsatt kun de fem flatene.
 */
export default function PulsePreview() {
  const { los, sett } = useTema();
  const naa = useMemo(() => new Date('2026-09-08T10:00:00'), []);
  const spark = useMemo(() => plausibelSpark(naa), [naa]);
  const analyser = useMemo(() => analyserMockStats(naa), [naa]);
  return (
    <div className="min-h-dvh bg-bg text-fg" data-pulse-preview="go">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-3 py-5">
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

        <PulseKort href="#idag" variant="hero">
          <p className="text-center text-label font-[650] text-fg">{PULSE_UKE_TITTEL}</p>
          <div className="grid min-w-0 grid-cols-3 divide-x divide-divide">
            <PulseTall label="Planlagt" verdi={3} laster={false} />
            <PulseTall label="Pågår" verdi={2} laster={false} />
            <PulseTall label="Ferdig" verdi={1} laster={false} />
          </div>
          <PulseUkeSpark verdier={spark} />
        </PulseKort>

        <PulseAnalyserKort stats={analyser} href="#statistikk" />

        <PulseRadKort href="#innboks" ikon={Inbox} tittel="Les alle siste meldinger" teller={7} />
        <PulseRadKort href="#lager" ikon={Package} tittel="Venter på bestilling" teller={3} />
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
