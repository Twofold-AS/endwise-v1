'use client';

import { FeltInput, FeltSelect, SelectItem } from '@endwise/ui';
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
        <FeltSelect
          aria-label="Merke"
          selectedKey={merke || null}
          onSelectionChange={(key) => {
            onMerke(String(key ?? ''));
            onModell('');
            onAr('');
          }}
          placeholder="— merke —"
        >
          {merker.map((m) => (
            <SelectItem key={m} id={m}>
              {m}
            </SelectItem>
          ))}
        </FeltSelect>
      ) : (
        <FeltInput
          aria-label="Merke"
          value={merke}
          onChange={onMerke}
          placeholder="Merke (ingen katalog)"
        />
      )}
      {modeller.length > 0 ? (
        <FeltSelect
          aria-label="Modell"
          selectedKey={modell || null}
          onSelectionChange={(key) => {
            onModell(String(key ?? ''));
            onAr('');
          }}
          placeholder="— modell —"
          isDisabled={!merke}
        >
          {modeller.map((m) => (
            <SelectItem key={m} id={m}>
              {m}
            </SelectItem>
          ))}
        </FeltSelect>
      ) : (
        <FeltInput
          aria-label="Modell"
          value={modell}
          onChange={onModell}
          placeholder="Modell"
          isDisabled={!merke}
        />
      )}
      {arene.length > 0 ? (
        <FeltSelect
          aria-label="Årsmodell"
          selectedKey={ar || null}
          onSelectionChange={(key) => onAr(String(key ?? ''))}
          placeholder="— år —"
          isDisabled={!modell}
        >
          {arene.map((a) => (
            <SelectItem key={a} id={a}>
              {a}
            </SelectItem>
          ))}
        </FeltSelect>
      ) : (
        <FeltInput
          aria-label="Årsmodell"
          value={ar}
          onChange={onAr}
          placeholder="Årsmodell"
          isDisabled={!modell}
        />
      )}
    </div>
  );
}
