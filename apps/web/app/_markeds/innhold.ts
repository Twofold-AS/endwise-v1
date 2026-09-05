import { TIERS, type TierKey } from '@endwise/modules/billing/plans';
import type { StaticImageData } from 'next/image';

/**
 * Markedssiden «/» — Jonas-fasit 05.09.2026.
 * Alt som skal kunne byttes uten JSX-redigering bor her.
 * Prisene kommer fra `TIERS` (4490 / 8490 / 12490 eks. mva). Ikke skriv
 * tallene inn på nytt.
 */

export const H1 = 'Verkstedet, samlet.';
/** Mikael via Jonas 05.09.2026 — primær CTA på nav, hero og bunn. */
export const CTA_PRIMAR_TEKST = 'Prøv Endwise';
export const HERO_LINJE =
  'Booking, innboks og jobber i ett system — for MC-, båt- og ATV-verkstedet.';

export const LOFTER: { tittel: string; tekst: string }[] = [
  {
    tittel: 'Booking',
    tekst: 'Kunden booker selv, døgnet rundt, rett inn i verkstedkalenderen.',
  },
  {
    tittel: 'Innboks',
    tekst: 'SMS, e-post og chat i én kø. Svar fra verkstedet, ikke fra fem systemer.',
  },
  {
    tittel: 'Verkstedet',
    tekst: 'Jobber, mekanikere og status på ett sted — også Min dag i lomma.',
  },
];

export const PRODUKT: {
  id: 'desktop' | 'phone';
  tittel: string;
  tekst: string;
  bilde: BildeSlotId;
  /** `bilde-hoyre` = tekst først. `bilde-venstre` = bildet først (én gang). */
  layout: 'bilde-hoyre' | 'bilde-venstre';
}[] = [
  {
    id: 'desktop',
    tittel: 'Hele dagen, i ett vindu.',
    tekst:
      'Kalender, saker og innboks side om side. Ingen hopping mellom systemer midt i en samtale.',
    bilde: 'desktop',
    layout: 'bilde-hoyre',
  },
  {
    id: 'phone',
    tittel: 'Min dag i lomma.',
    tekst: 'Mekanikeren ser dagens jobber, starter og fullfører — også når dekningen svikter.',
    bilde: 'phone',
    layout: 'bilde-venstre',
  },
];

export const VALGT_NIVAA: TierKey = 'pro';

export const PRIS_FOT =
  'Fast pris per forhandler, eks. mva. Ubegrenset antall brukere — ingen pris per sete.';

export const TILLIT =
  'Kobles til Quick og Statens vegvesen (Autosys) når forhandleren slår integrasjonen på. Kundedata ligger i EU.';

export const BUNN_CTA_TITTEL = 'Skal vi ta en runde?';
export const BUNN_CTA_TEKST = 'Vi viser booking, innboks og verkstedet — hos dere, på deres tall.';

export type BildeSlotId = 'hero' | 'desktop' | 'phone' | 'booking' | 'innboks';

export type BildeFormat = 'desktop' | 'phone';

/**
 * Faste spor til midlertidige UI-skjermbilder.
 * Bytt `kilde` til en statisk import (`import skjerm from '@/public/images/…'`)
 * når opplastingen er klar. Format og `aspect` står — siden hopper ikke.
 * ⛔ Ikke stock-bilder av mekanikere. Arkitektur-JPEGene i `public/images/`
 * er stemning, ikke produkt, og brukes ikke her.
 */
export type BildeSlot = {
  id: BildeSlotId;
  format: BildeFormat;
  alt: string;
  kilde?: StaticImageData;
};

export const BILDE_SLOTS: Record<BildeSlotId, BildeSlot> = {
  hero: {
    id: 'hero',
    format: 'desktop',
    alt: 'Plassholder for skrivebordsbildet av Endwise: kalender og saker i ett vindu.',
  },
  desktop: {
    id: 'desktop',
    format: 'desktop',
    alt: 'Plassholder for skrivebordsbildet av verkstedet i Endwise.',
  },
  phone: {
    id: 'phone',
    format: 'phone',
    alt: 'Plassholder for telefonbildet av Min dag i Endwise.',
  },
  booking: {
    id: 'booking',
    format: 'desktop',
    alt: 'Plassholder for bookingflaten. Ikke vist på forsiden ennå — sporet er klart.',
  },
  innboks: {
    id: 'innboks',
    format: 'desktop',
    alt: 'Plassholder for innboksen. Ikke vist på forsiden ennå — sporet er klart.',
  },
};

export const FOOTER_LENKER: { href: '/personvern' | '/vilkar' | '/kontakt'; tekst: string }[] = [
  { href: '/personvern', tekst: 'Personvern' },
  { href: '/vilkar', tekst: 'Vilkår' },
  { href: '/kontakt', tekst: 'Kontakt' },
];

/** Øre → «4 490». Samme kilde som SMS-låsen. */
export function visManedspris(priceMonthlyMinor: number): string {
  return new Intl.NumberFormat('nb-NO', { maximumFractionDigits: 0 }).format(
    priceMonthlyMinor / 100,
  );
}

export const PRIS_KORT = TIERS.map((t) => ({
  key: t.key,
  navn: t.name,
  pris: visManedspris(t.priceMonthlyMinor),
  ore: t.priceMonthlyMinor,
  pitch: t.pitch,
  punkter: t.hoydepunkter,
  valgt: t.key === VALGT_NIVAA,
}));
