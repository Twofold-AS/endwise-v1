/**
 * F5-09 / F5-32 / F0-16 — PRISKATALOGEN. Én kilde til sannhet for hva Endwise
 * selger og hvilke moduler hvert kjøp låser opp.
 *
 * ── Modellen (eiers v3, besluttet 07.08.2026) ──────────────────────────────
 * Flat pris per FORHANDLER per måned, **ubegrenset antall brukere**, eks. mva.
 * Ingen pris per sete: et verksted som ansetter en lærling skal ikke få en
 * regning for det.
 *
 * **Tre nivåer** (START/PRO/ENTERPRISE) som hver er et BUNDLE av moduler, pluss
 * **valgfrie tillegg** som kan legges på et hvilket som helst nivå. I Stripe er
 * nivået én subscription item og hvert tillegg sin egen — derfor kan de
 * kombineres fritt uten at vi trenger ni forskjellige produkter.
 *
 * ── ⚠️ Forholdet til F0-16 ────────────────────────────────────────────────
 * Nøklene her ER `tenant_modules`-nøklene som `moduleProcedure()` sjekker.
 * **En nøkkel i katalogen uten en gate på rutene sine er en modul vi selger
 * uten at noen dør er låst** — nøyaktig CWE-862-funnet. Legger du til en nøkkel
 * her, legg til gaten i samme commit.
 *
 * Basis-funksjonene (Verkstedet, Saker, Kunder, **Lager**, Innboks, Helpdesk,
 * Settings, mekanikervisningen) har INGEN gate og står derfor ikke som nøkler.
 * START selger tilgangen til dem — men det som teknisk låses opp av START er
 * kun `widget` og `resend`, fordi resten aldri var låst.
 *
 * ── Fase 1 vs. fase 2 ─────────────────────────────────────────────────────
 * Dette er FASE 1: faste nivåer + tillegg. **Metered overforbruk (SMS,
 * AI-diagnoser, nettside-endringer) er IKKE bygget.** Kvotene under er skrevet
 * ned nå så tallene finnes ett sted når målingen kommer — men ingenting teller
 * dem, og ingenting stopper ved grensen. Se `KVOTER_ER_IKKE_HANDHEVET`.
 */
import type { ModuleKey } from '../entitlements.ts';

/* ══ Nivåene ═════════════════════════════════════════════════════════════ */

export type TierKey = 'start' | 'pro' | 'enterprise';

/**
 * Kvoter per måned. **FASE 2 — ikke håndhevet av noe i dag.**
 * `null` = ubegrenset/ikke relevant for nivået.
 */
export type Kvoter = {
  /** SMS-varsler til kunder (Twilio). */
  sms: number | null;
  /** AI-diagnoser (F6-04). */
  aiDiagnoser: number | null;
  /** AI-genererte nettside-endringer (F5-24 Nettside). */
  nettsideEndringer: number | null;
};

/** ⚠️ Leses av ingen kode som håndhever. Ren forberedelse — se fila over. */
export const KVOTER_ER_IKKE_HANDHEVET = true;

export type Tier = {
  key: TierKey;
  name: string;
  /** Månedspris i ØRE, eks. mva. Stripe er fasit; dette er til visning. */
  priceMonthlyMinor: number;
  /** Env-variabelen med Stripe price-ID. Vi hardkoder ALDRI price-IDer. */
  stripePriceEnv: string;
  /** Kort setning til plankortet. */
  pitch: string;
  /** Hva forhandleren FÅR, i deres språk. Ikke modulnøkler. */
  hoydepunkter: string[];
  /** `tenant_modules`-nøklene nivået låser opp. Kumulativt. */
  modules: ModuleKey[];
  kvoter: Kvoter;
};

/** Modulene START låser opp. Alt annet i START er basis og har ingen gate. */
const START_MODULER: ModuleKey[] = [
  'widget', // Bookingwidget på egen nettside (F4)
  'resend', // Transaksjons-e-post
];

const PRO_MODULER: ModuleKey[] = [
  ...START_MODULER,
  'ai-support', // AI-diagnose og assistent (F6-04)
  'ai-diagnose',
  'ai-providers',
  'quick', // Quick ERP-synk (F8-01)
  'vegvesen', // Regnr-oppslag (F2-08)
  'smart-hverdag', // Push, handlingsknapper, kalender, nettbrett, passkey
  'twilio', // SMS
];

const ENTERPRISE_MODULER: ModuleKey[] = [
  ...PRO_MODULER,
  'ai-nettside', // AI-verktøy › Nettside (F5-24)
  'ai-innsikt', // AI-verktøy › Innsikt
  'quick-agent', // Agent mot Quick
  'crm-lime', // Lime CRM
  'webhooks', // Utgående webhooks
];

export const TIERS: Tier[] = [
  {
    key: 'start',
    name: 'Start',
    priceMonthlyMinor: 449_000,
    stripePriceEnv: 'STRIPE_PRICE_START',
    pitch: 'Alt verkstedet trenger for å drive.',
    hoydepunkter: [
      'Verkstedet, Saker og kalender',
      'Kunder og kjøretøy',
      'Innboks og chat',
      'Mekanikervisning',
      'Lager — deler og beholdning',
      'Bookingwidget til egen nettside',
      'Konto og sikkerhet (2FA)',
    ],
    modules: START_MODULER,
    kvoter: { sms: 200, aiDiagnoser: 0, nettsideEndringer: 0 },
  },
  {
    key: 'pro',
    name: 'Pro',
    priceMonthlyMinor: 849_000,
    stripePriceEnv: 'STRIPE_PRICE_PRO',
    pitch: 'Start + AI-diagnose, Quick og en smartere hverdag.',
    hoydepunkter: [
      'Alt i Start',
      'AI-diagnose på innkommende saker',
      'Quick ERP-synk',
      'Vegvesen-oppslag på regnr',
      'Smart hverdag: push, handlingsknapper, kalender, nettbrett, passkey',
      'SMS til kunder',
    ],
    modules: PRO_MODULER,
    kvoter: { sms: 1000, aiDiagnoser: 500, nettsideEndringer: 0 },
  },
  {
    key: 'enterprise',
    name: 'Enterprise',
    priceMonthlyMinor: 1_249_000,
    stripePriceEnv: 'STRIPE_PRICE_ENTERPRISE',
    pitch: 'Pro + AI på nettsiden, innsikt og integrasjoner.',
    hoydepunkter: [
      'Alt i Pro',
      'AI-verktøy: Nettside',
      'AI-verktøy: Innsikt',
      'Quick-agent',
      'Lime CRM',
      'Webhooks',
    ],
    modules: ENTERPRISE_MODULER,
    kvoter: { sms: 3000, aiDiagnoser: 2000, nettsideEndringer: 100 },
  },
];

/* ══ Valgfrie tillegg ════════════════════════════════════════════════════ */

/**
 * `available` — kan kjøpes nå.
 * `coming`    — 🕓 funksjonen finnes ikke ennå. Vises, men kan IKKE kjøpes.
 * `blocked`   — ⛔ avhenger av en beslutning som ikke er tatt (Butikk/Medusa).
 *
 * ⚠️ Å selge noe som ikke virker er verre enn å ikke selge det. `coming` og
 * `blocked` filtreres bort før checkout — server-side, ikke bare i UI-et.
 */
export type TilleggStatus = 'available' | 'coming' | 'blocked';

export type Tillegg = {
  key: string;
  name: string;
  desc: string;
  priceMonthlyMinor: number;
  stripePriceEnv: string;
  /** Modulnøkkelen tillegget flipper. Én pris = én modul. */
  module: ModuleKey;
  status: TilleggStatus;
  /** Hvorfor den ikke kan kjøpes ennå. Vises i UI-et. */
  merknad?: string;
};

export const TILLEGG: Tillegg[] = [
  {
    key: 'erp',
    name: 'ERP-modul',
    desc: 'Full ERP-kobling utover Quick-synken.',
    priceMonthlyMinor: 350_000,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_ERP',
    module: 'erp',
    status: 'available',
  },
  {
    key: 'white-label',
    name: 'White-label',
    desc: 'Egen merkevare på kundeflatene.',
    priceMonthlyMinor: 99_000,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_WHITE_LABEL',
    module: 'white-label',
    status: 'available',
  },
  {
    key: 'sso',
    name: 'SSO',
    desc: 'Innlogging med bedriftens egen identitetsleverandør.',
    priceMonthlyMinor: 69_000,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_SSO',
    module: 'sso',
    status: 'available',
  },
  {
    key: 'nyhetsbrev',
    name: 'Nyhetsbrev',
    desc: 'Utsendelser til egne kunder.',
    priceMonthlyMinor: 44_900,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_NYHETSBREV',
    module: 'nyhetsbrev',
    status: 'available',
  },
  {
    key: 'finn',
    name: 'Finn.no',
    desc: 'Publiser kjøretøy til Finn.no.',
    priceMonthlyMinor: 34_900,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_FINN',
    module: 'finn',
    status: 'available',
  },
  {
    key: 'shop',
    name: 'Nettbutikk',
    desc: 'Salg av deler og tilbehør på nett.',
    priceMonthlyMinor: 69_000,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_SHOP',
    module: 'shop',
    status: 'blocked',
    merknad:
      'Venter på beslutning om Medusa (isolasjonsmodell + avhengighet). Se F10-03 og sikkerhetsgjennomgangen.',
  },
  {
    key: 'rapporter',
    name: 'Rapporter, A/B og SLA',
    desc: 'Avanserte rapporter, A/B-tester og SLA-oppfølging.',
    priceMonthlyMinor: 59_000,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_RAPPORTER',
    module: 'rapporter',
    status: 'coming',
    merknad: 'Funksjonen er ikke bygget ennå.',
  },
  {
    key: 'analyse-pro',
    name: 'Analyse-flate',
    desc: 'Dypere analyse av drift og nettside.',
    priceMonthlyMinor: 49_000,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_ANALYSE',
    module: 'analyse-pro',
    status: 'coming',
    merknad: 'Analyse kjører fortsatt på mock-data (F5-18).',
  },
  {
    key: 'betaling-widget',
    name: 'Betaling i widget',
    desc: 'Forskuddsbetaling ved booking.',
    priceMonthlyMinor: 24_900,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_BETALING',
    module: 'betaling-widget',
    status: 'coming',
    merknad: 'F8-05 — ikke bygget.',
  },
  {
    key: 'samarbeid',
    name: 'Samarbeid',
    desc: 'Del rutiner og prisnivå med andre Endwise-verksteder.',
    priceMonthlyMinor: 24_900,
    stripePriceEnv: 'STRIPE_PRICE_ADDON_SAMARBEID',
    module: 'samarbeid',
    status: 'coming',
    merknad: 'Backend finnes ikke — venter på juridisk avklaring (F5-17).',
  },
];

/**
 * ⛔ IKKE I SALG, og skal ikke bli det uten en egen beslutning:
 * **kryssforhandler-servicehistorikk** (F11-09). Det er kundedata på tvers av
 * forhandlere, og prislappen er ikke problemet — personvernet er.
 */
export const IKKE_I_SALG = ['kryssforhandler-historikk'] as const;

/* ══ Oppslag ═════════════════════════════════════════════════════════════ */

export function tierByKey(key: string | null | undefined): Tier | undefined {
  return TIERS.find((t) => t.key === key);
}

export function tilleggByKey(key: string | null | undefined): Tillegg | undefined {
  return TILLEGG.find((t) => t.key === key);
}

/** Tillegg som faktisk kan kjøpes. Brukes både i UI og server-side i checkout. */
export function kjopbareTillegg(): Tillegg[] {
  return TILLEGG.filter((t) => t.status === 'available');
}

/** Modulene et abonnement gir: nivåets bundle + hvert valgt tillegg. */
export function modulesForSubscription(
  tierKey: string | null | undefined,
  tilleggKeys: readonly string[] = [],
): ModuleKey[] {
  const moduler = new Set<ModuleKey>(tierByKey(tierKey)?.modules ?? []);
  for (const k of tilleggKeys) {
    const t = tilleggByKey(k);
    if (t) moduler.add(t.module);
  }
  return [...moduler];
}

/**
 * Finn nivå + tillegg ut fra Stripe price-IDene på abonnementet.
 * Brukes av webhooken — den ser prisene, ikke våre nøkler.
 */
export function subscriptionFromPriceIds(
  priceIds: readonly (string | undefined)[],
  env: Record<string, string | undefined> = process.env,
): { tier: Tier | undefined; tillegg: Tillegg[] } {
  const ids = priceIds.filter((p): p is string => Boolean(p));
  const tier = TIERS.find(
    (t) => env[t.stripePriceEnv] && ids.includes(env[t.stripePriceEnv] ?? ''),
  );
  const tillegg = TILLEGG.filter(
    (t) => env[t.stripePriceEnv] && ids.includes(env[t.stripePriceEnv] ?? ''),
  );
  return { tier, tillegg };
}

/* ══ Bakoverkompatibilitet ═══════════════════════════════════════════════
 * Eldre kallsteder (billing-tjenesten, /integrasjoner-flaten) bruker `PLANS`,
 * `modulesForPlan` og `INTEGRATIONS`. De peker nå på nivåene.
 */

/** @deprecated Bruk `TIERS`. Beholdt så eksisterende kallsteder ikke knekker. */
export const PLANS = TIERS;
export type Plan = Tier;

export function planByKey(key: string | null | undefined): Tier | undefined {
  return tierByKey(key);
}

/** @deprecated Bruk `modulesForSubscription` — den tar også tillegg. */
export function modulesForPlan(key: string | null | undefined): ModuleKey[] {
  return tierByKey(key)?.modules ?? [];
}

/** @deprecated Bruk `subscriptionFromPriceIds`. */
export function planForPriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): Tier | undefined {
  if (!priceId) return undefined;
  return TIERS.find((t) => env[t.stripePriceEnv] === priceId);
}

/** Integrasjoner forhandleren kan selvbetjene (vises som låst hvis ikke i plan). */
export const INTEGRATIONS: { key: ModuleKey; name: string; desc: string }[] = [
  { key: 'vegvesen', name: 'Vegvesen', desc: 'Regnr → merke/modell/EU-frist (Autosys)' },
  { key: 'quick', name: 'Quick', desc: 'Import av bookinger fra Quick' },
  { key: 'twilio', name: 'Twilio (SMS)', desc: 'SMS-varsler til kunder' },
  { key: 'resend', name: 'Resend (e-post)', desc: 'Transaksjons-e-post + nyhetsbrev' },
  { key: 'ai-providers', name: 'AI-leverandører', desc: 'Fireworks + Mistral (AI-agenter)' },
];
