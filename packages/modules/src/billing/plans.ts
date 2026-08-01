/**
 * F5-09 — Plan-katalog. Planen bestemmer hvilke moduler/integrasjoner
 * forhandleren får (entitlements → tenant_modules, F0-04).
 *
 * `stripePriceEnv` peker på env-variabelen med Stripe price-ID-en (recurring,
 * monthly). Vi hardkoder ALDRI price-ID-er. Uten env kjører alt i «mock/test»:
 * checkout/portal er utilgjengelig, men plan→entitlements-logikken fungerer.
 */
import type { ModuleKey } from '../entitlements.ts';

export type Plan = {
  key: string;
  name: string;
  /** Månedspris i minste enhet (øre). Kun til visning; Stripe er fasit. */
  priceMonthlyMinor: number;
  stripePriceEnv: string;
  /** Moduler/integrasjoner planen låser opp. */
  modules: ModuleKey[];
};

export const PLANS: Plan[] = [
  {
    key: 'basis',
    name: 'Basis',
    priceMonthlyMinor: 49900,
    stripePriceEnv: 'STRIPE_PRICE_BASIS',
    modules: ['booking', 'messages', 'vegvesen'],
  },
  {
    key: 'pluss',
    name: 'Pluss',
    priceMonthlyMinor: 99900,
    stripePriceEnv: 'STRIPE_PRICE_PLUSS',
    modules: ['booking', 'messages', 'vegvesen', 'quick', 'resend', 'twilio'],
  },
  {
    key: 'proff',
    name: 'Proff',
    priceMonthlyMinor: 199900,
    stripePriceEnv: 'STRIPE_PRICE_PROFF',
    modules: [
      'booking',
      'messages',
      'vegvesen',
      'quick',
      'resend',
      'twilio',
      'ai-diagnose',
      'ai-providers',
      'nyhetsbrev',
      'widget',
    ],
  },
];

/** Integrasjoner forhandleren kan selvbetjene (vises som låst hvis ikke i plan). */
export const INTEGRATIONS: { key: ModuleKey; name: string; desc: string }[] = [
  { key: 'vegvesen', name: 'Vegvesen', desc: 'Regnr → merke/modell/EU-frist (Autosys)' },
  { key: 'quick', name: 'Quick', desc: 'Import av bookinger fra Quick' },
  { key: 'twilio', name: 'Twilio (SMS)', desc: 'SMS-varsler til kunder' },
  { key: 'resend', name: 'Resend (e-post)', desc: 'Transaksjons-e-post + nyhetsbrev' },
  { key: 'ai-providers', name: 'AI-leverandører', desc: 'Fireworks + Mistral (AI-agenter)' },
];

export function planByKey(key: string | null | undefined): Plan | undefined {
  return PLANS.find((p) => p.key === key);
}

export function modulesForPlan(key: string | null | undefined): ModuleKey[] {
  return planByKey(key)?.modules ?? [];
}

/** Finn planen som eier en gitt Stripe price-ID (via env). For webhooken. */
export function planForPriceId(
  priceId: string | null | undefined,
  env: Record<string, string | undefined> = process.env,
): Plan | undefined {
  if (!priceId) return undefined;
  return PLANS.find((p) => env[p.stripePriceEnv] === priceId);
}
