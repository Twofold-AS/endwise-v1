'use client';

import { arFor, type KjoretoyKat, merkerFor, modellerFor } from './kjoretoy-katalog';
import { SkjemaChips } from './skjema-felt';

export type KjoretoyKaskadeVerdi = {
  type: KjoretoyKat | '';
  merke: string;
  modell: string;
  aar: string;
  reg: string;
};

export function tomKaskade(): KjoretoyKaskadeVerdi {
  return { type: '', merke: '', modell: '', aar: '', reg: '' };
}

export function KjoretoyKaskade({
  verdi,
  onChange,
}: {
  verdi: KjoretoyKaskadeVerdi;
  onChange: (v: KjoretoyKaskadeVerdi) => void;
}) {
  const merker = verdi.type ? merkerFor(verdi.type) : [];
  const modeller = verdi.type && verdi.merke ? modellerFor(verdi.type, verdi.merke) : [];
  const ar =
    verdi.type && verdi.merke && verdi.modell ? arFor(verdi.type, verdi.merke, verdi.modell) : [];

  return (
    <div data-kjoretoy-kaskade className="flex flex-col gap-3">
      <SkjemaChips
        label="Type"
        options={['MC', 'Båt', 'ATV']}
        value={verdi.type}
        onChange={(type) =>
          onChange({ type: type as KjoretoyKat, merke: '', modell: '', aar: '', reg: verdi.reg })
        }
        hint={!verdi.type ? 'Velg type først — så foreslås merke, modell og årsmodell.' : undefined}
      />
      <label className="flex flex-col gap-1 text-[12px] text-fg-muted">
        Reg.nr
        <input
          value={verdi.reg}
          onChange={(e) => onChange({ ...verdi, reg: e.target.value.toUpperCase() })}
          placeholder="EL 90001"
          className="ew-felt ew-felt-md"
        />
      </label>
      {merker.length > 0 ? (
        <label className="flex flex-col gap-1 text-[12px] text-fg-muted">
          Merke
          <select
            value={verdi.merke}
            onChange={(e) => onChange({ ...verdi, merke: e.target.value, modell: '', aar: '' })}
            className="ew-felt ew-felt-md"
          >
            <option value="">Velg merke</option>
            {merker.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {modeller.length > 0 ? (
        <label className="flex flex-col gap-1 text-[12px] text-fg-muted">
          Modell
          <select
            value={verdi.modell}
            onChange={(e) => onChange({ ...verdi, modell: e.target.value, aar: '' })}
            className="ew-felt ew-felt-md"
          >
            <option value="">Velg modell</option>
            {modeller.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {ar.length > 0 ? (
        <label className="flex flex-col gap-1 text-[12px] text-fg-muted">
          Årsmodell
          <select
            value={verdi.aar}
            onChange={(e) => onChange({ ...verdi, aar: e.target.value })}
            className="ew-felt ew-felt-md"
          >
            <option value="">Velg årsmodell</option>
            {ar.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
