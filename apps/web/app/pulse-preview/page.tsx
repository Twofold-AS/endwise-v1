'use client';

import { Inbox, Package, Users } from '@endwise/ui';
import { useTema } from '../_lib/tema-provider';
import {
  PulseJobbFlis,
  PulseKort,
  PulseManedBoble,
  PulseRadKort,
  PulseTall,
} from '../(app)/_shell/pulse-kort';

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Forhandler-hjem har fortsatt kun de fem flatene.
 */
export default function PulsePreview() {
  const { los, sett } = useTema();
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

        <PulseKort href="#idag" variant="hero" mock>
          <div className="flex items-end justify-between gap-4">
            <div className="grid min-w-0 flex-1 grid-cols-3 divide-x divide-divide">
              <PulseTall label="Planlagt" verdi={3} laster={false} />
              <PulseTall label="Pågår" verdi={2} laster={false} />
              <PulseTall label="Ferdig" verdi={1} laster={false} />
            </div>
            <PulseManedBoble denne={18} forrige={14} mock />
          </div>
        </PulseKort>

        <PulseRadKort
          href="#innboks"
          ikon={Inbox}
          tittel="Les alle siste meldinger"
          teller={7}
          mock
        />
        <PulseRadKort href="#lager" ikon={Package} tittel="Venter på bestilling" teller={3} />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
          <PulseRadKort href="#team" ikon={Users} tittel="På jobb" teller="2 / 4" />
          <PulseJobbFlis />
        </div>
      </div>
    </div>
  );
}
