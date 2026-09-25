'use client';

import { KUNDER_ALFA, type KunderAlfa } from './_alfa';

/**
 * Apple Contacts-skinne: like spor i list-viewport (`flex-1`),
 * sticky i lista — ikke `absolute`/`justify-center` (da forsvinner A–F
 * ved siden av første rader). z-[4] over rader, under chrome/modaler.
 */
export function KunderAlfaRail({
  aktiv,
  tomme,
  onVelg,
}: {
  aktiv: KunderAlfa;
  tomme: ReadonlySet<string>;
  onVelg: (bokstav: KunderAlfa) => void;
}) {
  return (
    <nav
      data-kunder-alfa-rail
      aria-label="Alfabet"
      className="sticky top-0 z-[4] flex h-full w-4 shrink-0 flex-col items-center self-stretch"
    >
      {KUNDER_ALFA.map((bokstav) => {
        const tom = tomme.has(bokstav);
        const valgt = bokstav === aktiv;
        return (
          <button
            key={bokstav}
            type="button"
            data-kunder-alfa={bokstav}
            data-kunder-alfa-tom={tom ? '' : undefined}
            aria-pressed={valgt}
            aria-label={bokstav === '#' ? 'Til toppen' : `Gå til ${bokstav}`}
            onClick={() => {
              if (tom) return;
              onVelg(bokstav);
            }}
            className={`flex min-h-0 w-full flex-1 items-center justify-center p-0 text-[10px] leading-none ${
              tom
                ? 'font-[500] text-fg-faint'
                : valgt
                  ? 'font-[700] text-fg'
                  : 'font-[500] text-fg-muted'
            }`}
          >
            {bokstav}
          </button>
        );
      })}
    </nav>
  );
}
