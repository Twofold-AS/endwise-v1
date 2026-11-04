/** F31 / white label F10 — onboarding i fire Oppretter-steg. */

export const ONBOARDING_KATEGORIER = ['mc', 'bat', 'atv'] as const;
export type OnboardingKategori = (typeof ONBOARDING_KATEGORIER)[number];

export const ONBOARDING_KATEGORI_NAVN: Record<OnboardingKategori, string> = {
  mc: 'MC',
  bat: 'Båt',
  atv: 'ATV',
};

export const ONBOARDING_STORRELSER = ['liten', 'middels', 'stor'] as const;
export type OnboardingStorrelse = (typeof ONBOARDING_STORRELSER)[number];

export const AI_TAK_DEFAULT = 200;
export const AI_TAK_MIN = 20;
export const AI_TAK_MAX = 2000;

export type Apningstid = {
  dag: number;
  fra: string;
  til: string;
  stengt: boolean;
};

const TID_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function standardApningstider(): Apningstid[] {
  const ukedag: Apningstid[] = [1, 2, 3, 4, 5].map((dag) => ({
    dag,
    fra: '08:00',
    til: '16:00',
    stengt: false,
  }));
  return [
    ...ukedag,
    { dag: 6, fra: '10:00', til: '14:00', stengt: false },
    { dag: 0, fra: '00:00', til: '00:00', stengt: true },
  ];
}

export function erKategori(v: string): v is OnboardingKategori {
  return (ONBOARDING_KATEGORIER as readonly string[]).includes(v);
}

export function erStorrelse(v: string): v is OnboardingStorrelse {
  return (ONBOARDING_STORRELSER as readonly string[]).includes(v);
}

export function rensKategorier(raw: unknown): OnboardingKategori[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((v): v is OnboardingKategori => typeof v === 'string' && erKategori(v));
}

export function rensApningstider(raw: unknown): Apningstid[] {
  if (!Array.isArray(raw) || raw.length === 0) return standardApningstider();
  const ut: Apningstid[] = [];
  for (const rad of raw) {
    if (!rad || typeof rad !== 'object') continue;
    const dag = Number((rad as Apningstid).dag);
    if (!Number.isInteger(dag) || dag < 0 || dag > 6) continue;
    const fra = String((rad as Apningstid).fra ?? '');
    const til = String((rad as Apningstid).til ?? '');
    const stengt = Boolean((rad as Apningstid).stengt);
    if (!stengt && (!TID_RE.test(fra) || !TID_RE.test(til))) continue;
    ut.push({ dag, fra: stengt ? '00:00' : fra, til: stengt ? '00:00' : til, stengt });
  }
  return ut.length > 0 ? ut : standardApningstider();
}

export function rensAiTak(raw: unknown): number {
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(n)) return AI_TAK_DEFAULT;
  return Math.min(AI_TAK_MAX, Math.max(AI_TAK_MIN, Math.round(n)));
}
