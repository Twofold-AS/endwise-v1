'use client';

/**
 * Bencho context-meter — MIT.
 * Kilde: https://bencho.dev/?c=context-meter&theme=light
 * Live-blokk: `ContextMeter` (assets/ContextMeter-*.js på bencho.dev).
 *
 * Tilpasset kundesiden (Mikael 5. nov 2026):
 * - «Context» → kjøretøyets navn; uten registrert kjøretøy: «Finner ingen eierskap».
 * - «Compact»-knappen → info-lenke til kjøretøyets informasjonsside.
 * - Tallet (.ctx-figure) → grå to-delt boks: kjøretøybilde/plassholder
 *   (MC/ATV/Båt) til venstre, modell/årsmodell/regnr til høyre.
 * - Statusbaren (.ctx-bar) viser jobbfremdrift med LIKE STORE
 *   fordelingsbokser (ikke proporsjonale segmenter som i Bencho).
 * - Chips og compact/undo-bølgen er ikke med — ingen interaktiv demo-modus.
 */
import { type KjoretoyKortData, kjoretoyKortNavn } from '../kjoretoy-kort-data.ts';
import './ContextMeter.css';
import './tokens.css';

export type { KjoretoyKortData } from '../kjoretoy-kort-data.ts';

function typePlassholder(type: string | null): string {
  if (type === 'boat') return 'BÅT';
  if (type === 'atv') return 'ATV';
  return 'MC';
}

const FASE_TEKST = ['Mottatt', 'Under arbeid', 'Ferdig'] as const;

function StatusBar({ steg }: { steg: number | null }) {
  const fylt = steg === null ? 0 : Math.min(3, Math.max(0, steg + 1));
  return (
    <div
      className="ctx-bar"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={steg === null ? 0 : Math.round(((steg + 1) / 3) * 100)}
      aria-label="Jobbfremdrift"
    >
      {[0, 1, 2].map((i) => (
        <i key={i} className="ctx-seg" data-fylt={i < fylt || undefined} />
      ))}
    </div>
  );
}

export function ContextMeter({ kort }: { kort: KjoretoyKortData | null }) {
  return (
    <div className="ctx" data-kunde-kjoretoy-kort>
      <div className="ctx-head">
        <span className="ctx-title">{kjoretoyKortNavn(kort)}</span>
        <a className="ctx-act" href="/kjoretoy" aria-label="Kjøretøyinfo">
          Info
        </a>
      </div>

      <div className="ctx-boks">
        <div className="ctx-bilde" aria-hidden>
          {typePlassholder(kort?.type ?? null)}
        </div>
        <div className="ctx-info">
          <span className="ctx-modell">{kort?.modell ?? '—'}</span>
          <span className="ctx-rad">
            <span className="ctx-etikett">Årsmodell</span>
            {kort?.aarsmodell ?? '—'}
          </span>
          <span className="ctx-rad">
            <span className="ctx-etikett">Regnr</span>
            {kort?.regnr ?? '—'}
          </span>
        </div>
      </div>

      <StatusBar steg={kort?.faseSteg ?? null} />
      <p className="ctx-fase">
        {kort?.faseSteg === null || kort?.faseSteg === undefined
          ? 'Ingen aktiv jobb'
          : FASE_TEKST[kort.faseSteg]}
      </p>
    </div>
  );
}
