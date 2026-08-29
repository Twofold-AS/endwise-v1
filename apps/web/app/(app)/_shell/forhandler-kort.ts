/** Felt som allerede ligger på Forhandler-kortet — ikke finn på nye. */
export type ForhandlerKortFelt = {
  name?: string | null;
  orgnr?: string | null;
  address?: string | null;
  postalCode?: string | null;
  city?: string | null;
  phone?: string | null;
  website?: string | null;
};

/** Samme tre grå i lys og mørk — Mikael 29.08.2026, ikke lys-vask. */
export const GRAINIENT_FARGER = {
  color1: '#777777',
  color2: '#333333',
  color3: '#111111',
} as const;

export const GRAINIENT_MORK = GRAINIENT_FARGER;
export const GRAINIENT_LYS = GRAINIENT_FARGER;

export function visKortFelt(kort: ForhandlerKortFelt): { label: string; verdi: string }[] {
  const ut: { label: string; verdi: string }[] = [];
  const orgnr = kort.orgnr?.trim();
  const adresse = adresseLinje(kort);
  const phone = kort.phone?.trim();
  const website = kort.website?.trim();
  if (orgnr) ut.push({ label: 'Orgnr', verdi: orgnr });
  if (adresse) ut.push({ label: 'Adresse', verdi: adresse });
  if (phone) ut.push({ label: 'Telefon', verdi: phone });
  if (website) ut.push({ label: 'Nettside', verdi: website });
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
