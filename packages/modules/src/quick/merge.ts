/**
 * F8-01 — Tre-veis fletting per felt (git-lignende), gjenbrukbar kjerne.
 *
 * AVHENGIGHETSFRI med vilje: ingen DB, ingen Quick — bare ren logikk, så den er
 * triviell å enhetsteste og kan gjenbrukes for kunder NÅ og booking/delelager/
 * salg SENERE (samme mekanikk).
 *
 * «Baseline» er felles stamfar (merge base) = verdiene vi SIST hentet fra Quick.
 * «ours» = vår gjeldende lokale verdi. «theirs» = det Quick sender nå.
 *
 * De fire feltnivå-tilfellene:
 *   1. Quick endret, vi ikke  (theirs≠base, ours=base) → Quick vinner (auto).
 *   2. Vi endret, Quick ikke   (theirs=base, ours≠base) → behold vår (auto).
 *   3. Ingen endret / begge til samme (theirs=ours)     → ingen konflikt.
 *   4. Begge endret ULIKT       (alle tre forskjellige) → KONFLIKT (ikke overskriv).
 *
 * FELTNIVÅ, ikke radnivå: Quick kan endre telefon mens vi endrer et annet felt —
 * begge flettes, ingen konflikt. Konflikt oppstår kun på SAMME felt endret ulikt.
 */

export type FieldValue = string | null;

export interface FieldConflict {
  field: string;
  base: FieldValue;
  ours: FieldValue;
  theirs: FieldValue;
}

export interface MergeOutcome {
  /** Verdien som skal PERSISTERES per felt (auto-flettet der mulig). */
  merged: Record<string, FieldValue>;
  /**
   * Ny baseline per felt. Avanseres til `theirs` for felt vi forsonet; for
   * KONFLIKT-felt beholdes gammel base, slik at samme konflikt gjendetekteres
   * idempotent ved neste pull (vi mister den ikke) til den løses.
   */
  newBaseline: Record<string, FieldValue>;
  conflicts: FieldConflict[];
}

/** Normaliser tomme verdier: null/undefined/'' behandles likt (unngår støy-konflikter). */
function norm(v: FieldValue | undefined): FieldValue {
  return v == null || v === '' ? null : v;
}

/**
 * Tre-veis flett `fields` fra `ours` (lokalt) og `theirs` (Quick) mot `base`.
 *
 * `base === null` = ingen baseline finnes ennå (ny rad, eller første pull etter
 * at baseline ble innført). Da vinner Quick for alle felt (overskriv) og baseline
 * etableres — dette bevarer den tidligere «Quick er fakta»-oppførselen og unngår
 * falske konflikter før vi har et sammenlikningsgrunnlag.
 */
export function threeWayMerge(
  base: Record<string, FieldValue> | null,
  ours: Record<string, FieldValue>,
  theirs: Record<string, FieldValue>,
  fields: string[],
): MergeOutcome {
  const merged: Record<string, FieldValue> = {};
  const newBaseline: Record<string, FieldValue> = {};
  const conflicts: FieldConflict[] = [];

  for (const f of fields) {
    const o = norm(ours[f]);
    const t = norm(theirs[f]);

    // Ingen baseline: Quick vinner, etabler baseline.
    if (base === null) {
      merged[f] = t;
      newBaseline[f] = t;
      continue;
    }

    const b = norm(base[f]);

    if (t === b) {
      // Quick uendret → behold vår (tilfelle 2, ev. ingen endring).
      merged[f] = o;
      newBaseline[f] = b;
    } else if (o === b) {
      // Vi uendret, Quick endret → Quick vinner (tilfelle 1).
      merged[f] = t;
      newBaseline[f] = t;
    } else if (o === t) {
      // Begge endret til samme verdi → ingen konflikt (tilfelle 3).
      merged[f] = t;
      newBaseline[f] = t;
    } else {
      // Begge endret ulikt → KONFLIKT: ikke overskriv, ikke avanser baseline.
      merged[f] = o;
      newBaseline[f] = b;
      conflicts.push({ field: f, base: b, ours: o, theirs: t });
    }
  }

  return { merged, newBaseline, conflicts };
}
