/**
 * Kalenderdag i Europe/Oslo for Timeplan / Jobber / Verkstedet.
 * Kilden er `@endwise/modules/tid` — web importerer ikke resten av
 * server-laget. #89 (`packages/auth/src/tid.ts`) eier reset-klokke, ikke
 * jobb-døgn, og er ikke en avhengighet her.
 */
import { osloUkedagMandag0, osloVegg } from '@endwise/modules/tid';

export {
  osloDagsvindu,
  osloKalenderdag,
  osloPlusDager,
  osloStartAvDag,
  osloStartAvUke,
  osloUkedagMandag0,
  osloVegg,
  osloVeggklokke,
  osloVeggtid,
  PRODUKT_TIDSSONE,
  sammeOsloDag,
} from '@endwise/modules/tid';

const UKEDAG_NB = ['Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag', 'Søndag'] as const;

const MAANED_NB = [
  'januar',
  'februar',
  'mars',
  'april',
  'mai',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'desember',
] as const;

const MAANED_KORT = [
  'jan',
  'feb',
  'mar',
  'apr',
  'mai',
  'jun',
  'jul',
  'aug',
  'sep',
  'okt',
  'nov',
  'des',
] as const;

/** Ukedagsnavn i Europe/Oslo («Tirsdag»). */
export function osloUkedagNavn(from: Date | string): string {
  return UKEDAG_NB[osloUkedagMandag0(from)] ?? 'Mandag';
}

/** Dato uten år, Oslo («8. september»). */
export function osloDatoLang(from: Date | string): string {
  const { d, m } = osloVegg(from);
  return `${d}. ${MAANED_NB[m - 1] ?? ''}`;
}

/** Kort dato uten år, Oslo («9. sep») — samme rad som ukedag. */
export function osloDatoKort(from: Date | string): string {
  const { d, m } = osloVegg(from);
  return `${d}. ${MAANED_KORT[m - 1] ?? ''}`;
}
