'use client';

import { Inbox, Package, Plus, Users } from '@endwise/ui';
import { useEffect } from 'react';
import { useTema } from '../_lib/tema-provider';
import {
  PulseFooter,
  PulseKort,
  PulseLinjeKort,
  PulseMaanedBoble,
  PulseTall,
} from '../(app)/_shell/pulse-kort';

/**
 * Midlertidig visuell GO-flate for pulse v2 (uten innlogging).
 * Ikke en produkt-rute.
 */
export default function PulseV2Preview() {
  const { los, sett, veksle } = useTema();
  useEffect(() => {
    if (new URLSearchParams(window.location.search).has('mork')) sett('dark');
  }, [sett]);
  return (
    <div className="min-h-dvh bg-bg text-fg">
      <div className="mx-auto flex w-full max-w-[520px] flex-col gap-5 px-3 py-5 md:max-w-[1120px] md:px-8 md:py-7">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Pulse v2 preview</p>
          <button type="button" className="text-label text-fg-muted" onClick={veksle}>
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>

        <PulseKort href="#idag" navn="I dag" variant="hero" mock>
          <div className="flex items-end justify-between gap-4">
            <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-divide">
              <PulseTall label="Planlagt" verdi={3} laster={false} />
              <PulseTall label="Pågår" verdi={2} laster={false} />
              <PulseTall label="Ferdig" verdi={1} laster={false} />
            </div>
            <PulseMaanedBoble denne={12} forrige={8} mork={los === 'dark'} />
          </div>
        </PulseKort>

        <PulseLinjeKort
          href="#innboks"
          ikon={Inbox}
          tekst="Les alle siste meldinger"
          tall={7}
          trend={{ antall: 5, tone: 'green', ratio: 0.72, mock: true }}
          mock
        />

        <PulseLinjeKort href="#lager" ikon={Package} tekst="Trenger godkjenning" tall={3} />

        <PulseLinjeKort href="#team" ikon={Users} tekst="Ansatte på jobb" tall="2/5" />

        <PulseLinjeKort href="#jobb" ikon={Plus} ikonVariant="box" tekst="Jobb" />

        <PulseFooter />
      </div>
    </div>
  );
}
