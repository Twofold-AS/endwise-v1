'use client';

/**
 * F5-26 — Nivå + faste/valgfrie tillegg.
 *
 * TIERS/TILLEGG er kilden. Ingen hardkodede nøkler. shop og twilio vises
 * aldri som avkrysning — SMS ligger i Pro-bundelen.
 */
export type Nivaa = {
  key: string;
  name: string;
  priceMonthlyMinor: number;
  pitch: string;
  hoydepunkter: string[];
  modules: string[];
};

export type Tillegg = {
  key: string;
  name: string;
  desc: string;
  module: string;
};

export function tilleggForNivaa(nivaa: Nivaa | undefined, tillegg: Tillegg[]): Tillegg[] {
  const inkludert = new Set(nivaa?.modules ?? []);
  return tillegg.filter(
    (t) => t.module !== 'shop' && t.module !== 'twilio' && !inkludert.has(t.module),
  );
}

export function tilleggNokler(
  moduleKeys: string[],
  tillegg: Tillegg[],
  nivaa: Nivaa | undefined,
): string[] {
  const lovlige = new Set(tilleggForNivaa(nivaa, tillegg).map((t) => t.key));
  return tillegg
    .filter((t) => moduleKeys.includes(t.module) && lovlige.has(t.key))
    .map((t) => t.key);
}

function pris(minor: number): string {
  return new Intl.NumberFormat('nb-NO').format(Math.round(minor / 100));
}

export function NivaaValg({
  nivaa,
  valgt,
  onChange,
}: {
  nivaa: Nivaa[];
  valgt: string;
  onChange: (key: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label text-fg">Nivå</legend>
      <p className="text-[12px] text-fg-muted leading-relaxed">
        Velg én pakke. Tillegg som allerede ligger i pakken vises ikke.
      </p>
      <div className="grid gap-2">
        {nivaa.map((n) => {
          const aktiv = valgt === n.key;
          return (
            <label
              key={n.key}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-3 ${
                aktiv ? 'border-fg bg-surface-2' : 'border-border'
              }`}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="nivaa"
                  value={n.key}
                  checked={aktiv}
                  onChange={() => onChange(n.key)}
                  className="size-4 accent-[#111]"
                  required
                />
                <span className="text-label text-fg">{n.name}</span>
                <span className="ml-auto text-[12px] text-fg-muted">
                  {pris(n.priceMonthlyMinor)} kr/mnd
                </span>
              </span>
              <span className="pl-6 text-[12px] text-fg-muted leading-relaxed">{n.pitch}</span>
              {aktiv ? (
                <ul className="flex flex-col gap-0.5 pl-6">
                  {n.hoydepunkter.map((h) => (
                    <li key={h} className="text-[12px] text-fg">
                      {h}
                    </li>
                  ))}
                </ul>
              ) : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function TilleggListe({
  tillegg,
  included,
  optional,
  onToggleIncluded,
  onToggleOptional,
}: {
  tillegg: Tillegg[];
  included: Set<string>;
  optional: Set<string>;
  onToggleIncluded: (key: string) => void;
  onToggleOptional: (key: string) => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-label text-fg">Faste tillegg</legend>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Kryss av det som skal ligge i pakken utover nivået. Tillegg som allerede ligger i pakken
          vises ikke.
        </p>
        {tillegg.length === 0 ? (
          <p className="text-[12px] text-fg-muted">
            Ingen faste tillegg å legge til på dette nivået.
          </p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {tillegg.map((t) => (
              <label key={`fast-${t.key}`} className="flex items-start gap-2 text-body text-fg">
                <input
                  type="checkbox"
                  checked={included.has(t.key)}
                  onChange={() => onToggleIncluded(t.key)}
                  className="mt-0.5 size-4 accent-[#111]"
                />
                <span>
                  {t.name}
                  <span className="block text-[12px] text-fg-muted">{t.desc}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="text-label text-fg">Valgfritt i veiviseren</legend>
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Eieren kan slå disse på under oppstart. Ikke hele katalogen — bare det du åpner.
        </p>
        {tillegg.length === 0 ? (
          <p className="text-[12px] text-fg-muted">Ingen valgfrie tillegg på dette nivået.</p>
        ) : (
          <div className="grid gap-1.5 sm:grid-cols-2">
            {tillegg.map((t) => (
              <label key={`valg-${t.key}`} className="flex items-start gap-2 text-body text-fg">
                <input
                  type="checkbox"
                  checked={optional.has(t.key)}
                  disabled={included.has(t.key)}
                  onChange={() => onToggleOptional(t.key)}
                  className="mt-0.5 size-4 accent-[#111]"
                />
                <span>
                  {t.name}
                  <span className="block text-[12px] text-fg-muted">{t.desc}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </fieldset>
    </div>
  );
}
