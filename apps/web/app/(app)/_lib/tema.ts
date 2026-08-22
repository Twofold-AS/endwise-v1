'use client';

/**
 * TEMA — ett sted, fordi det var to.
 *
 * ── ⛔ ROTÅRSAKEN TIL AT MØRKT TEMA IKKE OVERLEVDE EN REFRESH ─────────────
 * Både `ThemeToggle` og profilsiden skrev `document.documentElement.dataset.theme`
 * ved klikk — og **lagret ingenting**. `app/layout.tsx` har `data-theme="light"`
 * hardkodet på `<html>`, så hver eneste sidelast satte det tilbake til lyst.
 * Bryteren virket; den bare glemte.
 *
 * At logikken lå to steder er den andre halvdelen av feilen: to kopier av samme
 * regel kan bare bli enige ved et sammentreff. Nå finnes den her.
 *
 * ⚠️ Selve PÅFØRINGEN ved sidelast skjer IKKE herfra. En React-effekt kjører
 * etter første maling, så temaet ville rukket å blinke hvitt før det ble mørkt.
 * Derfor settes det av et lite inline-skript i `layout.tsx`, før noe tegnes.
 * Denne fila eier lagring og bytte; skriptet eier oppstart. Nøkkelen er delt,
 * og står i `TEMA_NOKKEL` slik at de to ikke kan drifte fra hverandre.
 */

export type Tema = 'light' | 'dark';

/** ⚠️ Må være IDENTISK med nøkkelen i inline-skriptet i `layout.tsx`. */
export const TEMA_NOKKEL = 'endwise:tema';

/** Hva står på `<html>` akkurat nå. Kilden ved lesing, ikke localStorage. */
export function lesTema(): Tema {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

/**
 * Bytt tema og husk valget.
 *
 * Skriver BEGGE steder: `<html>` for at det skal virke nå, og localStorage for
 * at det skal virke etterpå. Det var den andre halvdelen som manglet.
 */
export function settTema(t: Tema): void {
  document.documentElement.dataset.theme = t;
  try {
    localStorage.setItem(TEMA_NOKKEL, t);
  } catch {
    /* Privat modus / blokkert lagring: temaet gjelder økta ut. Bedre enn å
       kaste og etterlate brukeren i et halvbyttet tema. */
  }
}
