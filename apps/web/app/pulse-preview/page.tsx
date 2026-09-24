'use client';

import { Inbox, Package } from '@endwise/ui';
import { useMemo } from 'react';
import { useTema } from '../_lib/tema-provider';
import { osloVeggklokke } from '../(app)/_lib/oslo-dag';
import { pulsdagOverskrift, tallCeller } from '../(app)/_shell/phone-home-pulse';
import {
  PulseFooter,
  PulseGulvKort,
  PulseHeroFlate,
  PulseRadKort,
  PulseSvarKort,
  PulseTallKort,
  PulseTeamKort,
} from '../(app)/_shell/pulse-kort';

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Claude-stack: I dag · Innboks · Deler · Svarhastighet · Gulv · Team · Tall.
 */
export default function PulsePreview() {
  const { los, sett } = useTema();
  const celler = useMemo(() => tallCeller([], new Date('2026-09-08T10:00:00')), []);
  const dag = useMemo(() => pulsdagOverskrift(new Date('2026-09-08T10:00:00')), []);
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
          spark={[1, 2, 0, 3, 1, 4, 2]}
        />

        <PulseRadKort href="#innboks" ikon={Inbox} tittel="Uleste meldinger" teller="7 · 2 t" />
        <PulseRadKort href="#lager" ikon={Package} tittel="Venter på bestilling" teller={3} />
        <PulseSvarKort verdi="14 min · 7 dager" />
        <PulseGulvKort
          rader={[
            { id: '1', time: '09:00', what: 'EU-kontroll · EL12345' },
            { id: '2', time: '11:30', what: 'Oljeskift · AB98765' },
            { id: '3', time: '14:00', what: 'Dekk · CD55555' },
          ]}
        />
        <PulseTeamKort
          medlemmer={[
            { id: 'a', name: 'Kari Mek', paJobb: true },
            { id: 'b', name: 'Ola Mek', paJobb: false },
          ]}
        />
        <PulseTallKort celler={celler} href="#statistikk" />
        <PulseFooter />
      </div>
    </div>
  );
}
