'use client';

import { useMemo, useState } from 'react';
import { useTema } from '../_lib/tema-provider';
import { osloKalenderdag } from '../(app)/_lib/oslo-dag';
import { SorteringArk, SorteringGruppe, SorteringValg } from '../(app)/_shell/sortering-ark';
import { TimeplanStripe } from '../(app)/_shell/timeplan-stripe';
import {
  DAGSLISTE_SORTER,
  DAGSLISTE_SORTER_LABEL,
  type DagslisteSorter,
  sorterDagsliste,
} from '../(app)/jobber/_sorter';

const MOCK = [
  {
    id: '1',
    startsAt: '2026-09-11T07:00:00.000Z',
    customerName: 'Anne Gill',
    status: 'confirmed',
    mechanicName: 'Kari',
    tjeneste: 'EU-kontroll',
  },
  {
    id: '2',
    startsAt: '2026-09-11T09:00:00.000Z',
    customerName: 'Bjørn Holm',
    status: 'in_progress',
    mechanicName: 'Ola',
    tjeneste: 'Service',
  },
];

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Claude BIT 3: uke-rail + dagsliste-sortering + Endringer-liste.
 */
export default function JobberPreview() {
  const { los, sett } = useTema();
  const [valgt, setValgt] = useState('2026-09-11');
  const [sorter, setSorter] = useState<DagslisteSorter>('tid');
  const [sorterApen, setSorterApen] = useState(false);
  const rader = useMemo(() => sorterDagsliste(MOCK, sorter), [sorter]);

  return (
    <div className="min-h-dvh bg-bg text-fg" data-jobber-preview="go">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-4 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Timeplan preview</p>
          <button
            type="button"
            className="text-label text-fg-muted"
            onClick={() => sett(los === 'dark' ? 'light' : 'dark')}
          >
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>

        <p className="text-[12px] text-fg-muted">
          {osloKalenderdag(valgt)} · {rader.length} jobber. Live flate: /jobber
        </p>

        <TimeplanStripe valgt={valgt} onValgt={setValgt} />

        <div className="relative flex justify-end">
          <button
            type="button"
            data-timeplan-sortering
            aria-expanded={sorterApen}
            onClick={() => setSorterApen((v) => !v)}
            className="border-b-2 border-fg pb-1 text-label text-fg"
          >
            {DAGSLISTE_SORTER_LABEL[sorter]}
          </button>
          <SorteringArk apen={sorterApen} onLukk={() => setSorterApen(false)}>
            <SorteringGruppe>
              {DAGSLISTE_SORTER.map((key) => (
                <SorteringValg
                  key={key}
                  valgt={sorter === key}
                  onVelg={() => {
                    setSorter(key);
                    setSorterApen(false);
                  }}
                >
                  {DAGSLISTE_SORTER_LABEL[key]}
                </SorteringValg>
              ))}
            </SorteringGruppe>
          </SorteringArk>
        </div>

        <ul className="flex flex-col gap-2">
          {rader.map((j) => (
            <li
              key={j.id}
              data-timeplan-dag-rad={j.id}
              className="rounded-[16px] border border-divide bg-card px-4 py-3 text-label"
            >
              {j.customerName} · {j.mechanicName} · {j.status}
            </li>
          ))}
        </ul>

        <section data-timeplan-endringer-flate className="flex flex-col gap-3">
          <p className="text-title text-fg">Endringer</p>
          <p className="text-[12px] text-fg-muted">
            Godkjenn/Avslå på /jobber?fane=avvik kaller bookings.resolveChange — ikke stub.
          </p>
          <div className="rounded-[16px] border border-divide bg-card px-4 py-3">
            <p className="text-label text-fg">EU-kontroll · AB12345</p>
            <p className="text-[12px] text-fg-muted">[AVVIK] Trenger del</p>
          </div>
        </section>
      </div>
    </div>
  );
}
