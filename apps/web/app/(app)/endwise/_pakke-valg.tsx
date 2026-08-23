'use client';

/**
 * F5-26 / F5-32 — Nivå + tillegg utenfor pakken.
 *
 * TIERS/TILLEGG er kilden. Ingen hardkodede nøkler. shop vises
 * aldri. SMS (twilio) er et avkrysnings-tillegg på alle nivåer —
 * ikke en planmodul, pass-through per melding, 0 kr/mnd.
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
  return tillegg.filter((t) => t.module !== 'shop' && !inkludert.has(t.module));
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
  const valgtNivaa = nivaa.find((n) => n.key === valgt);
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label text-fg">Nivå</legend>
      <p className="text-[12px] text-fg-muted leading-relaxed">Velg én pakke.</p>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {nivaa.map((n) => {
          const aktiv = valgt === n.key;
          return (
            <label
              key={n.key}
              className={`flex cursor-pointer flex-col gap-1 rounded-xl border px-3 py-3 ${
                aktiv ? 'border-fg bg-accent-soft' : 'border-border'
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
      {valgtNivaa ? (
        <p className="text-[12px] text-fg-muted leading-relaxed">
          Tillegg under er utenom pakken. Det som følger med {valgtNivaa.name} er allerede
          inkludert.
        </p>
      ) : null}
    </fieldset>
  );
}

export function TilleggListe({
  tillegg,
  valgte,
  nivaaNavn,
  onToggle,
}: {
  tillegg: Tillegg[];
  valgte: Set<string>;
  nivaaNavn: string;
  onToggle: (key: string) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="text-label text-fg">Tillegg som ikke ligger i {nivaaNavn}</legend>
      <p className="text-[12px] text-fg-muted leading-relaxed">Eieren ser bare disse i oppstart.</p>
      {tillegg.length === 0 ? (
        <p className="text-[12px] text-fg-muted">Ingen tillegg utenom {nivaaNavn}.</p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {tillegg.map((t, i) => (
            <label
              key={t.key}
              className={`flex h-row items-center gap-3 bg-bg px-4 text-body text-fg ${
                i > 0 ? 'border-border border-t' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={valgte.has(t.key)}
                onChange={() => onToggle(t.key)}
                className="size-4 accent-[#111]"
              />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-label">{t.name}</span>
                <span className="truncate text-[12px] text-fg-muted">{t.desc}</span>
              </span>
            </label>
          ))}
        </div>
      )}
    </fieldset>
  );
}
