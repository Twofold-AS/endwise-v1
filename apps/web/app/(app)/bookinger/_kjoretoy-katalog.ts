export type KjoretoyType = 'mc' | 'boat' | 'atv';

export const KJORETOY_TYPER: { key: KjoretoyType; label: string }[] = [
  { key: 'mc', label: 'MC' },
  { key: 'boat', label: 'Båt' },
  { key: 'atv', label: 'ATV' },
];

export type KatalogKjoretoy = {
  type?: string | null;
  make?: string | null;
  model?: string | null;
  modelYear?: string | number | null;
};

/** Kaskade fra eksisterende kjøretøy i tenanten — ingen oppdiktet merke-katalog. */
export function katalogMerker(rader: readonly KatalogKjoretoy[], type: KjoretoyType): string[] {
  return unike(rader.filter((v) => v.type === type).map((v) => (v.make ?? '').trim()));
}

export function katalogModeller(
  rader: readonly KatalogKjoretoy[],
  type: KjoretoyType,
  merke: string,
): string[] {
  return unike(
    rader
      .filter((v) => v.type === type && (v.make ?? '').trim() === merke)
      .map((v) => (v.model ?? '').trim()),
  );
}

export function katalogAr(
  rader: readonly KatalogKjoretoy[],
  type: KjoretoyType,
  merke: string,
  modell: string,
): string[] {
  return unike(
    rader
      .filter(
        (v) =>
          v.type === type && (v.make ?? '').trim() === merke && (v.model ?? '').trim() === modell,
      )
      .map((v) => String(v.modelYear ?? '').trim()),
  );
}

function unike(verdier: string[]): string[] {
  return [...new Set(verdier.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'nb'));
}
