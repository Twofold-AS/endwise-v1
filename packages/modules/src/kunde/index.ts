/** F33 / white label F11b — kundeportal handling. */

export const JOBB_FASER = ['Mottatt', 'Under arbeid', 'Klar'] as const;
export type JobbFase = (typeof JOBB_FASER)[number];

export function jobbFase(status: string): { merkelapp: string; steg: number } {
  if (status === 'cancelled') return { merkelapp: 'Avlyst', steg: -1 };
  if (status === 'no_show') return { merkelapp: 'Ikke møtt', steg: -1 };
  if (status === 'completed') return { merkelapp: 'Klar', steg: 2 };
  if (status === 'in_progress') return { merkelapp: 'Under arbeid', steg: 1 };
  return { merkelapp: 'Mottatt', steg: 0 };
}

/** F42-04 — progresslinje Mottatt → Ferdig. Klar i domenet = ferdig for kunden. */
export function jobbFremdriftProsent(steg: number): number {
  if (steg < 0) return 0;
  if (steg === 0) return 33;
  if (steg === 1) return 66;
  return 100;
}

export function jobbFaseKort(fase: { merkelapp: string; steg: number }): string {
  return fase.merkelapp === 'Klar' ? 'Ferdig' : fase.merkelapp;
}

export function velgAktivJobb<T extends { status: string }>(rader: readonly T[]): T | undefined {
  return (
    rader.find((b) => b.status === 'in_progress') ??
    rader.find((b) => b.status === 'confirmed' || b.status === 'draft')
  );
}

export function formaterKjoretoy(
  v: {
    type?: string | null;
    make?: string | null;
    model?: string | null;
    regNumber?: string | null;
  } | null,
): string | null {
  if (!v) return null;
  const navn = [v.make, v.model].filter(Boolean).join(' ');
  const type = v.type === 'boat' ? 'Båt' : v.type === 'atv' ? 'ATV' : v.type === 'mc' ? 'MC' : null;
  const deler = [navn || type, v.regNumber].filter(Boolean);
  return deler.length > 0 ? deler.join(' · ') : null;
}

export type KundeVarselSlags = 'status' | 'paminnelse' | 'beskjed';

export type KundeVarsel = {
  id: string;
  tittel: string;
  tekst: string;
  href: '/bookinger';
  slags: KundeVarselSlags;
};

/** Verkstedvarsler — ikke chat. Status, påminnelse, beskjed om jobben. */
export function byggVarsler(
  bookinger: ReadonlyArray<{
    id: string;
    status: string;
    tjeneste: string | null;
    kjoretoy: string | null;
    startsAt: Date | string;
    updatedAt?: Date | string | null;
  }>,
  naa = new Date(),
): KundeVarsel[] {
  const ut: KundeVarsel[] = [];
  const toDager = 48 * 60 * 60 * 1000;
  const treDager = 72 * 60 * 60 * 1000;
  for (const b of bookinger) {
    const start = new Date(b.startsAt).getTime();
    const oppdatert = new Date(b.updatedAt ?? b.startsAt).getTime();
    const sak = b.kjoretoy ?? 'kjøretøyet ditt';
    const tjeneste = b.tjeneste ?? 'Jobben';
    if (b.status === 'in_progress') {
      ut.push({
        id: `jobb-${b.id}`,
        tittel: 'Verkstedet',
        tekst: `Vi jobber nå på din ${sak}`,
        href: '/bookinger',
        slags: 'status',
      });
      continue;
    }
    if (
      (b.status === 'confirmed' || b.status === 'draft') &&
      start > naa.getTime() &&
      start - naa.getTime() <= toDager
    ) {
      ut.push({
        id: `paminnelse-${b.id}`,
        tittel: 'Påminnelse',
        tekst: `${tjeneste} · ${sak}`,
        href: '/bookinger',
        slags: 'paminnelse',
      });
      continue;
    }
    if (b.status === 'completed' && naa.getTime() - oppdatert <= treDager) {
      ut.push({
        id: `ferdig-${b.id}`,
        tittel: 'Beskjed',
        tekst: `${tjeneste} er ferdig`,
        href: '/bookinger',
        slags: 'beskjed',
      });
    }
  }
  return ut;
}

export {
  finnEllerOpprettKundetrad,
  IngenInnboksMottakerError,
  sendKundeMelding,
} from './melding.ts';
export { KUNDE_MELDING_MAKS, KUNDE_MELDING_PER_MINUTT, rensKundeMelding } from './tekst.ts';

/** F10-03 — shop er blokkert. Kundeflaten selger ikke før det er løst. */
export const KUNDE_BUTIKK_BLOKKERT = true;
export const KUNDE_VIPPS_AKTIV = false;

export function kundeButikkStatus() {
  return {
    apen: false as const,
    grunn: 'shop_blokkert' as const,
    vipps: false as const,
    varer: [] as const,
  };
}
