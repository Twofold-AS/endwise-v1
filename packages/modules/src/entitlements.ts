/**
 * F0-04 — Entitlements-oppslag (DB-styrt).
 *
 * Entitlement != feature flag:
 *   - entitlement    -> «har denne forhandleren kjøpt modulen?»  (tenant_modules i DB)
 *   - release-toggle -> «har VI rullet ut funksjonen?»           (Vercel Flags SDK)
 * Begge må si ja. Blandes de, får du enten lekkasje eller feilfakturering.
 */
export type ModuleKey = string;

/**
 * F0-16 — BASIS vs. TILLEGG. **Dette skillet er en sikkerhetsgrense, ikke en
 * prisliste.**
 *
 * ── BASIS: ingen gate, ingen rad i `tenant_modules` ────────────────────────
 * Et verksted uten booking, innboks, kunder eller LAGER er ikke et verksted.
 * Disse rutene er `protectedProcedure`/`adminProcedure` og skal **aldri** få en
 * `moduleProcedure`. At noe er gratis er ikke en forglemmelse — det er
 * beslutningen.
 *
 * ⚠️ Listen er dokumentasjon, ikke håndheving: basis er definert ved at ingen
 * gate finnes. Den står her så neste person ser hva som med vilje er utenfor.
 */
export const BASIS_MODULES = [
  'booking', // Verkstedet, Saker, Kalender
  'messages', // Innboks
  'customers', // Kunder og kjøretøy
  'inventory', // Lager (F2-09) — kjerne, ikke tillegg
  'support', // Helpdesk
  'settings', // Settings
] as const;

/**
 * ── TILLEGG: krever en rad i `tenant_modules` med `enabled = true` ─────────
 * Hver nøkkel her MÅ ha en `moduleProcedure(...)` på rutene sine. En nøkkel som
 * står her uten gate er nøyaktig funnet CWE-862 beskrev: en modul vi selger uten
 * at noen dør er låst.
 */
export const ADDON_MODULES = [
  // ── Låses opp av NIVÅENE (start/pro/enterprise) ──
  'widget', // Bookingwidget (START)
  'resend', // Transaksjons-e-post (START)
  'ai-support', // AI-assistent og -diagnose (PRO)
  'ai-diagnose',
  'ai-providers',
  'quick', // Quick ERP-synk (PRO)
  'vegvesen', // Regnr-oppslag (PRO)
  'smart-hverdag', // Push, handlingsknapper, kalender, nettbrett, passkey (PRO)
  'ai-nettside', // AI-verktøy › Nettside (ENTERPRISE)
  'ai-innsikt', // AI-verktøy › Innsikt (ENTERPRISE)
  'quick-agent', // Agent mot Quick (ENTERPRISE)
  'crm-lime', // Lime CRM (ENTERPRISE)
  'webhooks', // Utgående webhooks (ENTERPRISE)

  // ── Valgfrie TILLEGG, én pris = én nøkkel ──
  'twilio', // SMS — pass-through-tillegg, alle nivåer, aldri planmodul
  'erp',
  'white-label',
  'sso',
  'nyhetsbrev',
  'finn',
  'shop', // ⛔ blokkert — intern flagg-preview, ikke til salgs (F10-03)
  'rapporter', // 🕓 ikke bygget
  'analyse-pro', // 🕓 ikke bygget
  'betaling-widget', // 🕓 ikke bygget (F8-05)
  'samarbeid', // 🕓 backend finnes ikke (F5-17)
] as const;

export type AddonModule = (typeof ADDON_MODULES)[number];

/**
 * Nøkkler admin IKKE kan krysse av eller sende inn på create/setModules.
 *
 *  · `shop` — Nettbutikk er blokkert / ikke til salgs (F10-03, 690).
 *
 * SMS (`twilio`) er tildelbart tillegg på alle nivåer — pass-through per
 * bookingmelding, ingen månedsavgift.
 */
export const IKKE_TILDELBARE_ADDON = ['shop'] as const;
export type IkkeTildelbarAddon = (typeof IKKE_TILDELBARE_ADDON)[number];
export type TildelbarAddon = Exclude<AddonModule, IkkeTildelbarAddon>;

const ADDON_SET = new Set<string>(ADDON_MODULES);
const IKKE_TILDELBAR_SET = new Set<string>(IKKE_TILDELBARE_ADDON);

/** Er nøkkelen et betalt tillegg? Ukjente nøkler behandles som tillegg — fail-safe. */
export function isAddon(key: ModuleKey): boolean {
  return !(BASIS_MODULES as readonly string[]).includes(key);
}

export function erBlokertTildeling(key: string): key is IkkeTildelbarAddon {
  return IKKE_TILDELBAR_SET.has(key);
}

/**
 * Nøkkler Endwise-admin kan tildele ved onboarding. Ukjente, basis og
 * `shop` avvises — en skriveflate skal ikke være fail-open.
 */
export function erTildelbarAddon(key: string): key is TildelbarAddon {
  return ADDON_SET.has(key) && !erBlokertTildeling(key);
}

export function filtrerAddonNokler(keys: readonly string[]): TildelbarAddon[] {
  const sett = new Set<TildelbarAddon>();
  for (const k of keys) {
    if (erTildelbarAddon(k)) sett.add(k);
  }
  return [...sett];
}

/** Norske etiketter til admin-avkrysning. Basis vises aldri her. */
export const ADDON_LABELS: Record<AddonModule, string> = {
  widget: 'Bookingwidget',
  resend: 'Transaksjons-e-post',
  'ai-support': 'AI-støtte',
  'ai-diagnose': 'AI-diagnose',
  'ai-providers': 'AI-leverandører',
  quick: 'Quick ERP',
  vegvesen: 'Vegvesen-oppslag',
  'smart-hverdag': 'Smart hverdag',
  twilio: 'SMS',
  'ai-nettside': 'AI-nettside',
  'ai-innsikt': 'AI-innsikt',
  'quick-agent': 'Quick-agent',
  'crm-lime': 'Lime CRM',
  webhooks: 'Webhooks',
  erp: 'ERP-modul',
  'white-label': 'White-label',
  sso: 'SSO',
  nyhetsbrev: 'Nyhetsbrev',
  finn: 'Finn.no',
  shop: 'Nettbutikk',
  rapporter: 'Rapporter',
  'analyse-pro': 'Analyse',
  'betaling-widget': 'Betaling i widget',
  samarbeid: 'Samarbeid',
};

/** Admin-katalog: ADDON minus shop. Basis er aldri med. SMS er med. */
export function addonKatalog(): Array<{ key: TildelbarAddon; label: string }> {
  return ADDON_MODULES.filter(erTildelbarAddon).map((key) => ({
    key,
    label: ADDON_LABELS[key],
  }));
}

export interface EntitlementsSource {
  listModules(tenantId: string): Promise<ModuleKey[]>;
}

export interface Entitlements {
  has(tenantId: string, moduleKey: ModuleKey): Promise<boolean>;
  assert(tenantId: string, moduleKey: ModuleKey): Promise<void>;
}

export class EntitlementError extends Error {
  readonly code = 'ENTITLEMENT_REQUIRED';
  // Eksplisitt felt (ikke TS parameter property) — strip-only-trygt, se scope-gate.ts.
  readonly moduleKey: ModuleKey;
  constructor(moduleKey: ModuleKey) {
    super(`Tenant mangler entitlement for modul "${moduleKey}"`);
    this.moduleKey = moduleKey;
  }
}

export function createEntitlements(source: EntitlementsSource): Entitlements {
  return {
    async has(tenantId, moduleKey) {
      const modules = await source.listModules(tenantId);
      return modules.includes(moduleKey);
    },
    async assert(tenantId, moduleKey) {
      const modules = await source.listModules(tenantId);
      if (!modules.includes(moduleKey)) throw new EntitlementError(moduleKey);
    },
  };
}
