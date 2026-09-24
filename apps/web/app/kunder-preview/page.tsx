'use client';

import { useMemo, useState } from 'react';
import { useTema } from '../_lib/tema-provider';
import { PhoneSokFelt } from '../(app)/_shell/phone-sok-felt';
import {
  filtrerKunderAlfa,
  KUNDER_SIDE_STORRELSE,
  type KunderAlfa,
  kunderSide,
  kunderSideEtikett,
  kunderSider,
} from '../(app)/kunder/_alfa';
import { KunderAlfaRail } from '../(app)/kunder/_alfa-rail';

const MOCK = [
  { id: '1', name: 'Anne Gill', phone: '900 11 001' },
  { id: '2', name: 'Bjørn Holm', phone: '900 11 002' },
  { id: '3', name: 'Cecilie Ruud', phone: '900 11 003' },
  { id: '4', name: 'Dag Berg', phone: '900 11 004' },
  { id: '5', name: 'Espen Dahl', phone: '900 11 005' },
  { id: '6', name: 'Frida Aas', phone: '900 11 006' },
  { id: '7', name: 'Guro Vik', phone: '900 11 007' },
  { id: '8', name: 'Hans Moen', phone: '900 11 008' },
  { id: '9', name: 'Ida Nilsen', phone: '900 11 009' },
  { id: '10', name: 'Jonas Ruud', phone: '900 11 010' },
  { id: '11', name: 'Kari Nordmann', phone: '900 11 011' },
  { id: '12', name: 'Lars Holm', phone: '900 11 012' },
  { id: '13', name: 'Marius Vik', phone: '900 11 013' },
  { id: '14', name: 'Nora Vang', phone: '900 11 014' },
  { id: '15', name: 'Ola Hansen', phone: '900 11 015' },
  { id: '16', name: 'Per Berg', phone: '900 11 016' },
  { id: '17', name: 'Rita Dahl', phone: '900 11 017' },
  { id: '18', name: 'Siri Berg', phone: '900 11 018' },
  { id: '19', name: 'Tone Aas', phone: '900 11 019' },
  { id: '20', name: 'Unni Moen', phone: '900 11 020' },
  { id: '21', name: 'Vera Nilsen', phone: '900 11 021' },
  { id: '22', name: 'Ylva Holm', phone: '900 11 022' },
  { id: '23', name: 'Åse Vik', phone: '900 11 023' },
  { id: '24', name: 'Arne Lien', phone: '900 11 024' },
  { id: '25', name: 'Bente Mo', phone: '900 11 025' },
  { id: '26', name: 'Christian Dahl', phone: '900 11 026' },
];

/**
 * Midlertidig visuell GO-flate (uten innlogging). Ikke en produkt-rute.
 * Claude BIT 2: høyre alfa-rail + 25-pager på eksisterende Kunder-rader.
 */
export default function KunderPreview() {
  const { los, sett } = useTema();
  const [sok, setSok] = useState('');
  const [bokstav, setBokstav] = useState<KunderAlfa>('#');
  const [side, setSide] = useState(0);

  const treff = useMemo(() => {
    const q = sok.trim().toLowerCase();
    const sokt = q ? MOCK.filter((k) => `${k.name} ${k.phone}`.toLowerCase().includes(q)) : MOCK;
    return filtrerKunderAlfa(sokt, bokstav);
  }, [sok, bokstav]);

  const sider = kunderSider(treff.length);
  const aktivSide = Math.min(side, sider - 1);
  const vist = kunderSide(treff, aktivSide);
  const harPager = treff.length > KUNDER_SIDE_STORRELSE;

  return (
    <div className="min-h-dvh bg-bg text-fg" data-kunder-preview="go">
      <div className="mx-auto flex min-h-dvh w-full max-w-[520px] flex-col gap-3 px-3 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="text-title text-fg">Kunder-liste preview</p>
          <button
            type="button"
            className="text-label text-fg-muted"
            onClick={() => sett(los === 'dark' ? 'light' : 'dark')}
          >
            {los === 'dark' ? 'Lys' : 'Mørk'}
          </button>
        </div>

        <PhoneSokFelt
          value={sok}
          onChange={(e) => {
            setSok(e.target.value);
            setSide(0);
          }}
          placeholder="Søk på navn, e-post eller telefon"
          aria-label="Søk i kunder"
        />

        <div data-kunder-liste className="relative min-h-[420px] pr-[30px]">
          <KunderAlfaRail
            valgt={bokstav}
            onVelg={(neste) => {
              setBokstav(neste);
              setSide(0);
            }}
          />
          {vist.length === 0 ? (
            <p className="py-8 text-center text-body text-fg-muted">Ingen kunder matcher søket.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              {vist.map((k, i) => (
                <div
                  key={k.id}
                  data-kunder-rad
                  className={`flex h-row-store items-center gap-4 bg-bg px-4 ${
                    i > 0 ? 'border-border border-t' : ''
                  }`}
                >
                  <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-[12px] text-fg">
                    {k.name.charAt(0)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="truncate text-label text-fg">{k.name}</span>
                    <span className="truncate text-[12px] text-fg-muted">{k.phone}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          {harPager ? (
            <div
              data-kunder-pager
              className="mt-3 flex items-center justify-between gap-3 text-[12px] text-fg-muted"
            >
              <button
                type="button"
                disabled={aktivSide <= 0}
                onClick={() => setSide((s) => Math.max(0, s - 1))}
                className="text-label text-fg disabled:text-fg-faint"
              >
                Forrige
              </button>
              <p className="tabular-nums">{kunderSideEtikett(treff.length, aktivSide)}</p>
              <button
                type="button"
                disabled={aktivSide >= sider - 1}
                onClick={() => setSide((s) => Math.min(sider - 1, s + 1))}
                className="text-label text-fg disabled:text-fg-faint"
              >
                Neste
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
