/**
 * mock som speiler `@endwise/modules/billing` (plans.ts). Web har ikke tRPC-
 * klient ennå — ekte data kommer fra `trpc.billing.plans/subscription/
 * integrations` når klienten wires. Vi importerer ikke @endwise/modules i web
 * (den drar inn pg/DB); derfor dette web-trygge speilet.
 */
export type PlanUI = { key: string; name: string; priceMonthly: string; modules: string[] };

export const PLANS_UI: PlanUI[] = [
  {
    key: 'basis',
    name: 'Basis',
    priceMonthly: '499 kr/mnd',
    modules: ['booking', 'messages', 'vegvesen'],
  },
  {
    key: 'pluss',
    name: 'Pluss',
    priceMonthly: '999 kr/mnd',
    modules: ['booking', 'messages', 'vegvesen', 'quick', 'resend', 'twilio'],
  },
  {
    key: 'proff',
    name: 'Proff',
    priceMonthly: '1 999 kr/mnd',
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

export const MOCK_SUB = { planKey: 'pluss', status: 'active', currentPeriodEnd: '01.08.2026' };

/*
 * `INTEGRATIONS_UI` fjernet .
 * Den var hardkodet mock-data med av/på-brytere som kun levde i `useState`.
 * Integrasjonsfanen leser nå `billing.katalog` — ekte `tenant_modules` og
 * ekte priser fra Stripe-katalogen — og har ingen brytere i det hele tatt.
 * Se `packages/modules/src/billing/katalog.ts`.
 */
