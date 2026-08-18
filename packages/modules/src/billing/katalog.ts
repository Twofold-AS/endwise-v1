import type { ModuleKey } from '../entitlements.ts';
import { TIERS, TILLEGG, type TilleggStatus } from './plans.ts';

/**
 * F5-19 — PRODUKTKATALOGEN, delt i to akser.
 *
 * ── Hvorfor skillet finnes ────────────────────────────────────────────────
 * Forhandleren stiller to helt forskjellige spørsmål, og de fortjener hver sin
 * skjerm:
 *
 *   «Hva har vi koblet til av ANDRES verktøy?»  → Integrasjoner
 *   «Hva betaler vi Endwise for?»               → Tjenester & priser
 *
 * Blandet man dem, ble Quick-synken stående ved siden av AI-diagnose som om de
 * var samme slags ting. Det er de ikke: den ene avhenger av et system
 * forhandleren allerede eier og betaler for et annet sted, den andre er noe vi
 * har bygget og tar betalt for.
 *
 * ── ⛔ INGEN AV/PÅ HER ───────────────────────────────────────────────────
 * Katalogen beskriver hva som FINNES og hva forhandleren HAR. Den aktiverer
 * ingenting. Aktivering skjer gjennom abonnementet (Stripe-webhooken er den
 * eneste som skriver entitlements) eller ved kontakt. En bryter i en
 * oversiktsflate ville antydet at man kan skru på noe man ikke har betalt for.
 */
export type Kilde = 'tredjepart' | 'endwise';

export type Katalogpost = {
  /** `tenant_modules.module_key` — det entitlements faktisk sjekker. */
  key: ModuleKey;
  navn: string;
  beskrivelse: string;
  kilde: Kilde;
  /** Hvem eier tjenesten i andre enden. Kun for tredjepart. */
  leverandor?: string;
  /**
   * Hva den koster som TILLEGG (øre/mnd). Mangler den, er modulen inkludert i
   * et abonnementsnivå — se `inkludertI`.
   */
  prisMinor?: number;
  /** Nivået som inkluderer modulen, hvis den ikke er et eget tillegg. */
  inkludertI?: string;
  status: TilleggStatus;
  merknad?: string;
};

/**
 * ⚠️ **Composio er IKKE besluttet.** Den står her fordi eier ba om å se den i
 * katalogen, og fordi en tom «tilgjengelig»-liste ikke forteller forhandleren
 * hva som er på vei. Men den er ikke i techstacken (CLAUDE.md §2), ingenting er
 * bygget, og status er `coming` med merknad. Skal den faktisk tas i bruk, er
 * det en egen stack-beslutning — ikke noe denne fila avgjør.
 */
const TREDJEPART: Omit<Katalogpost, 'kilde' | 'prisMinor' | 'inkludertI' | 'status'>[] &
  { key: ModuleKey; status?: TilleggStatus }[] = [
  {
    key: 'quick',
    navn: 'Quick ERP',
    beskrivelse:
      'Toveis synk av kunder og bookinger mot Quick. Kunder og saker som finnes der, dukker opp her.',
    leverandor: 'Quick',
  },
  {
    key: 'vegvesen',
    navn: 'Statens vegvesen',
    beskrivelse:
      'Slår opp registreringsnummer i Autosys: merke, modell, årsmodell og EU-frist. Betales per oppslag.',
    leverandor: 'Statens vegvesen (Autosys)',
  },
  {
    key: 'twilio',
    navn: 'Twilio',
    beskrivelse: 'SMS til kunder — bekreftelser, påminnelser og avviksvarsler.',
    leverandor: 'Twilio',
  },
  {
    key: 'resend',
    navn: 'Resend',
    beskrivelse: 'E-post fra Endwise: bekreftelser, engangskoder og nyhetsbrev.',
    leverandor: 'Resend',
  },
  {
    key: 'ai-providers',
    navn: 'AI-leverandører',
    beskrivelse:
      'Modellene AI-funksjonene kjører på. Kundevendt tekst går alltid til EU-leverandør (Mistral); driftsdata kan gå til Fireworks.',
    leverandor: 'Mistral (EU) · Fireworks',
  },
  {
    key: 'crm-lime',
    navn: 'Lime CRM',
    beskrivelse: 'Del kunder og aktivitet med Lime.',
    leverandor: 'Lime',
  },
  {
    key: 'finn',
    navn: 'Finn.no',
    beskrivelse: 'Publiser kjøretøy til Finn.no fra kjøretøyregisteret.',
    leverandor: 'Finn.no',
  },
  {
    key: 'erp',
    navn: 'ERP-kobling',
    beskrivelse: 'Full ERP-integrasjon utover Quick-synken.',
    leverandor: 'Etter avtale',
  },
  {
    key: 'composio',
    navn: 'Composio',
    beskrivelse:
      'Samlekobling mot mange tredjepartsverktøy gjennom én integrasjon, i stedet for én kobling per verktøy.',
    leverandor: 'Composio',
    status: 'coming',
  },
];

/** Endwise-egne funksjoner. Bygget her, priset her. */
const ENDWISE: { key: ModuleKey; navn: string; beskrivelse: string }[] = [
  {
    key: 'widget',
    navn: 'Bookingwidget',
    beskrivelse: 'Kundens bookingflate på forhandlerens egen nettside.',
  },
  {
    key: 'ai-support',
    navn: 'AI-kundestøtte',
    beskrivelse: 'Assistent som svarer kunder i innboksen og eskalerer til menneske.',
  },
  {
    key: 'ai-diagnose',
    navn: 'AI-diagnose',
    beskrivelse: 'Foreslår årsak og tiltak ut fra symptomer og servicehistorikk.',
  },
  {
    key: 'ai-nettside',
    navn: 'AI · Nettside',
    beskrivelse: 'Genererer og vedlikeholder innhold til forhandlerens nettside.',
  },
  {
    key: 'ai-innsikt',
    navn: 'AI · Innsikt',
    beskrivelse: 'Oppsummerer drift og trender i klartekst.',
  },
  {
    key: 'smart-hverdag',
    navn: 'Smart hverdag',
    beskrivelse: 'Push-varsler, handlingsknapper, kalender og nettbrettmodus.',
  },
  {
    key: 'analyse-pro',
    navn: 'Analyse',
    beskrivelse: 'Dypere analyse av drift og nettside.',
  },
  {
    key: 'nyhetsbrev',
    navn: 'Nyhetsbrev',
    beskrivelse: 'Utsendelser til egne kunder.',
  },
  {
    key: 'rapporter',
    navn: 'Rapporter, A/B og SLA',
    beskrivelse: 'Avanserte rapporter, A/B-tester og SLA-oppfølging.',
  },
  {
    key: 'betaling-widget',
    navn: 'Betaling i widget',
    beskrivelse: 'Forskuddsbetaling ved booking.',
  },
  {
    key: 'samarbeid',
    navn: 'Samarbeid',
    beskrivelse: 'Del rutiner og prisnivå med andre Endwise-verksteder.',
  },
  {
    key: 'shop',
    navn: 'Nettbutikk',
    beskrivelse: 'Salg av deler og tilbehør på nett.',
  },
  {
    key: 'white-label',
    navn: 'White-label',
    beskrivelse: 'Egen merkevare på kundeflatene.',
  },
  {
    key: 'sso',
    navn: 'SSO',
    beskrivelse: 'Innlogging med bedriftens egen identitetsleverandør.',
  },
  {
    key: 'webhooks',
    navn: 'Webhooks',
    beskrivelse: 'Utgående hendelser til egne systemer.',
  },
];

/** Hvilket abonnementsnivå inkluderer modulen? Første treff vinner. */
function nivaaForModul(key: ModuleKey): string | undefined {
  return TIERS.find((t) => (t.modules as string[]).includes(key))?.name;
}

/** Tillegget som selger modulen, hvis det finnes ett. */
function tilleggForModul(key: ModuleKey) {
  return TILLEGG.find((t) => t.module === key);
}

/**
 * Hele katalogen, klassifisert og priset.
 *
 * Pris og status hentes fra `TILLEGG`/`TIERS` — ikke skrevet inn på nytt her.
 * To steder å endre en pris er ett sted for mye.
 */
export function byggKatalog(): Katalogpost[] {
  const poster: Katalogpost[] = [];

  for (const t of TREDJEPART) {
    const tillegg = tilleggForModul(t.key);
    poster.push({
      key: t.key,
      navn: t.navn,
      beskrivelse: t.beskrivelse,
      kilde: 'tredjepart',
      leverandor: t.leverandor,
      prisMinor: tillegg?.priceMonthlyMinor,
      inkludertI: tillegg ? undefined : nivaaForModul(t.key),
      status: t.status ?? tillegg?.status ?? 'available',
      merknad: tillegg?.merknad,
    });
  }

  for (const e of ENDWISE) {
    const tillegg = tilleggForModul(e.key);
    poster.push({
      key: e.key,
      navn: e.navn,
      beskrivelse: e.beskrivelse,
      kilde: 'endwise',
      prisMinor: tillegg?.priceMonthlyMinor,
      inkludertI: tillegg ? undefined : nivaaForModul(e.key),
      status: tillegg?.status ?? 'available',
      merknad: tillegg?.merknad,
    });
  }

  return poster;
}
