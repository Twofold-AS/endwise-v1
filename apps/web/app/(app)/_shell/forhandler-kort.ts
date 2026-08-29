/** Felt som allerede ligger på Forhandler-kortet — ikke finn på nye. */
export type ForhandlerKortFelt = {
  name?: string | null;
  orgnr?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  leftover?: Record<string, unknown> | null;
};

const KJENTE_KORT_NOKLER = new Set([
  'name',
  'slug',
  'orgnr',
  'address',
  'postalCode',
  'city',
  'phone',
  'email',
  'website',
]);

/** Samme tre grå i lys og mørk — Mikael 29.08.2026, ikke lys-vask. */
export const GRAINIENT_FARGER = {
  color1: '#777777',
  color2: '#333333',
  color3: '#111111',
} as const;

export const GRAINIENT_MORK = GRAINIENT_FARGER;
export const GRAINIENT_LYS = GRAINIENT_FARGER;

export function formatLeftoverVerdi(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') {
    const t = value.trim();
    return t || null;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  try {
    const s = JSON.stringify(value);
    if (!s || s === '{}' || s === '[]' || s === 'null') return null;
    return s;
  } catch {
    return null;
  }
}

export function visKortFelt(kort: ForhandlerKortFelt): { label: string; verdi: string }[] {
  const ut: { label: string; verdi: string }[] = [];
  const orgnr = kort.orgnr?.trim();
  const adresse = adresseLinje(kort);
  const phone = kort.phone?.trim();
  const email = kort.email?.trim();
  const website = kort.website?.trim();
  if (orgnr) ut.push({ label: 'Orgnr', verdi: orgnr });
  if (adresse) ut.push({ label: 'Adresse', verdi: adresse });
  if (phone) ut.push({ label: 'Telefon', verdi: phone });
  if (email) ut.push({ label: 'E-post', verdi: email });
  if (website) ut.push({ label: 'Nettside', verdi: website });
  const leftover = kort.leftover;
  if (leftover && typeof leftover === 'object' && !Array.isArray(leftover)) {
    for (const [key, value] of Object.entries(leftover)) {
      if (KJENTE_KORT_NOKLER.has(key)) continue;
      const verdi = formatLeftoverVerdi(value);
      if (verdi) ut.push({ label: key, verdi });
    }
  }
  return ut;
}

export function adresseLinje(kort: ForhandlerKortFelt): string {
  const gate = kort.address?.trim() ?? '';
  const post = [kort.postalCode?.trim(), kort.city?.trim()].filter(Boolean).join(' ');
  return [gate, post].filter(Boolean).join(', ');
}

export type KjoretoyIkon = 'mc' | 'atv' | 'boat';

export function kjoretoyIkon(type: string | null | undefined): KjoretoyIkon {
  const t = (type ?? '').toLowerCase();
  if (t === 'atv') return 'atv';
  if (t === 'boat' || t === 'båt' || t === 'baat') return 'boat';
  return 'mc';
}

export const FERIE_MOCK: { navn: string; dager: number }[] = [
  { navn: 'Ola Mekaniker', dager: 25 },
  { navn: 'Kari Selger', dager: 25 },
  { navn: 'Per Support', dager: 20 },
];
