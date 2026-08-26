const NOKKEL = 'endwise.butikk.kurv';

export type KurvLinje = { partId: string; quantity: number };

function lesRaa(): KurvLinje[] {
  if (typeof window === 'undefined') return [];
  try {
    const raa = window.sessionStorage.getItem(NOKKEL);
    if (!raa) return [];
    const parsed: unknown = JSON.parse(raa);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (l): l is KurvLinje =>
        typeof l === 'object' &&
        l !== null &&
        typeof (l as KurvLinje).partId === 'string' &&
        Number.isInteger((l as KurvLinje).quantity) &&
        (l as KurvLinje).quantity > 0,
    );
  } catch {
    return [];
  }
}

function skriv(linjer: KurvLinje[]) {
  window.sessionStorage.setItem(NOKKEL, JSON.stringify(linjer));
}

export function lesKurv(): KurvLinje[] {
  return lesRaa();
}

export function settKurvAntall(partId: string, quantity: number): KurvLinje[] {
  const neste = lesRaa().filter((l) => l.partId !== partId);
  if (quantity > 0) neste.push({ partId, quantity });
  skriv(neste);
  return neste;
}

export function leggIKurv(partId: string, max: number): KurvLinje[] {
  const naa = lesRaa().find((l) => l.partId === partId)?.quantity ?? 0;
  return settKurvAntall(partId, Math.min(max, naa + 1));
}

export function tomKurv() {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(NOKKEL);
}

export function antallIKurv(): number {
  return lesRaa().reduce((s, l) => s + l.quantity, 0);
}
