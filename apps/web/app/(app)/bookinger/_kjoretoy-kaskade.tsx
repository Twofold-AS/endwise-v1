'use client';

import { FELT_MD } from '@endwise/ui';
import { useMemo } from 'react';
import {
  type KatalogKjoretoy,
  KJORETOY_TYPER,
  type KjoretoyType,
  katalogAr,
  katalogMerker,
  katalogModeller,
} from './_kjoretoy-katalog';

/**
 * Claude §6.3 type → merke → modell → år.
 * Katalog = eksisterende `vehicles.list`. Tom katalog = fritekst (ærlig).
 */
export function KjoretoyKaskade({
  type,
  merke,
  modell,
  ar,
  rader,
  onType,
  onMerke,
  onModell,
  onAr,
}: {
  type: KjoretoyType;
  merke: string;
  modell: string;
  ar: string;
  rader: readonly KatalogKjoretoy[];
  onType: (t: KjoretoyType) => void;
  onMerke: (v: string) => void;
  onModell: (v: string) => void;
  onAr: (v: string) => void;
}) {
  const merker = useMemo(() => katalogMerker(rader, type), [rader, type]);
  const modeller = useMemo(() => katalogModeller(rader, type, merke), [rader, type, merke]);
  const arene = useMemo(() => katalogAr(rader, type, merke, modell), [rader, type, merke, modell]);

  return (
    <div data-kjoretoy-kaskade className="flex flex-col gap-2">
      <fieldset className="flex flex-wrap gap-1.5 border-0 p-0">
        <legend className="sr-only">Type</legend>
        {KJORETOY_TYPER.map((t) => {
          const valgt = type === t.key;
          return (
            <button
              key={t.key}
              type="button"
              data-kjoretoy-type={t.key}
              aria-pressed={valgt}
              onClick={() => {
                onType(t.key);
                onMerke('');
                onModell('');
                onAr('');
              }}
              className={`inline-flex h-7 items-center rounded-full px-2.5 text-[12px] ${
                valgt ? 'bg-sidebar-active font-[650] text-fg' : 'text-fg-muted hover:bg-surface-2'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </fieldset>
      {merker.length > 0 ? (
        <select
          aria-label="Merke"
          value={merke}
          onChange={(e) => {
            onMerke(e.target.value);
            onModell('');
            onAr('');
          }}
          className={FELT_MD}
        >
          <option value="">— merke —</option>
          {merker.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label="Merke"
          value={merke}
          onChange={(e) => onMerke(e.target.value)}
          placeholder="Merke (ingen katalog)"
          className={FELT_MD}
        />
      )}
      {modeller.length > 0 ? (
        <select
          aria-label="Modell"
          value={modell}
          onChange={(e) => {
            onModell(e.target.value);
            onAr('');
          }}
          className={FELT_MD}
          disabled={!merke}
        >
          <option value="">— modell —</option>
          {modeller.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label="Modell"
          value={modell}
          onChange={(e) => onModell(e.target.value)}
          placeholder="Modell"
          className={FELT_MD}
          disabled={!merke}
        />
      )}
      {arene.length > 0 ? (
        <select
          aria-label="Årsmodell"
          value={ar}
          onChange={(e) => onAr(e.target.value)}
          className={FELT_MD}
          disabled={!modell}
        >
          <option value="">— år —</option>
          {arene.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      ) : (
        <input
          aria-label="Årsmodell"
          value={ar}
          onChange={(e) => onAr(e.target.value)}
          placeholder="Årsmodell"
          className={FELT_MD}
          disabled={!modell}
        />
      )}
    </div>
  );
}
