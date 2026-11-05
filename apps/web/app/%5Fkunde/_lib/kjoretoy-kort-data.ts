/** Ren data-logikk for kundesidens kjøretøy-kort (context-meter) — ingen JSX. */

export type KjoretoyKortData = {
  id: string;
  /** 'mc' | 'boat' | 'atv' — styrer plassholderen. */
  type: string | null;
  merke: string | null;
  modell: string | null;
  aarsmodell: string | null;
  regnr: string | null;
  /** Jobbfase 0..2 (Mottatt/Under arbeid/Ferdig). null = ingen aktiv jobb. */
  faseSteg: number | null;
};

/** context-meter-tittelen: kjøretøyets navn, ellers null-state. */
export function kjoretoyKortNavn(kort: KjoretoyKortData | null): string {
  if (!kort) return 'Finner ingen eierskap';
  const navn = [kort.merke, kort.modell].filter(Boolean).join(' ').trim();
  if (navn) return navn;
  if (kort.type === 'boat') return 'Båt';
  if (kort.type === 'atv') return 'ATV';
  if (kort.type === 'mc') return 'MC';
  return 'Finner ingen eierskap';
}

/**
 * DEMO (midlertidig, avtalt med Mikael 5. nov 2026): tre demo-kjøretøy
 * gjør at blaingen i step-playeren kan sees før kundene har flere
 * registrerte kjøretøy. Ekte kjøretøy fra kunde.kjoretoy vises alltid
 * først; demo-kortene fyller opp til tre. Fjern denne listen og
 * `medDemoFyll` når ekte data dekker blaingen.
 */
export const DEMO_KJORETOY: readonly KjoretoyKortData[] = [
  {
    id: 'demo-mt07',
    type: 'mc',
    merke: 'Yamaha',
    modell: 'MT-07',
    aarsmodell: '2021',
    regnr: 'EK12345',
    faseSteg: 1,
  },
  {
    id: 'demo-sportsman',
    type: 'atv',
    merke: 'Polaris',
    modell: 'Sportsman 570',
    aarsmodell: '2019',
    regnr: 'EK54321',
    faseSteg: 0,
  },
  {
    id: 'demo-yamarin',
    type: 'boat',
    merke: 'Yamarin',
    modell: '63 DC',
    aarsmodell: '2022',
    regnr: null,
    faseSteg: 2,
  },
];

/** Ekte kjøretøy først, deretter DEMO-fyll til minst tre kort (se over). */
export function medDemoFyll(ekte: readonly KjoretoyKortData[]): KjoretoyKortData[] {
  if (ekte.length >= 3) return [...ekte];
  const regnrs = new Set(ekte.map((k) => k.regnr).filter(Boolean));
  const fyll = DEMO_KJORETOY.filter((d) => !d.regnr || !regnrs.has(d.regnr));
  return [...ekte, ...fyll].slice(0, 3);
}

/** Søketreff: navn, modell, regnr eller årsmodell. */
export function kjoretoyTrefferSok(kort: KjoretoyKortData, sok: string): boolean {
  const q = sok.trim().toLowerCase();
  if (!q) return true;
  return [kort.merke, kort.modell, kort.regnr, kort.aarsmodell]
    .filter(Boolean)
    .some((v) => (v as string).toLowerCase().includes(q));
}
