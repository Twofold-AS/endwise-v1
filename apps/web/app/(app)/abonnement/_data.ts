/**
 * MOCK som speiler `@endwise/modules/billing` (plans.ts). Web har ikke tRPC-
 * klient ennå — ekte data kommer fra `trpc.billing.plans/subscription/
 * integrations` når klienten wires. Vi importerer IKKE @endwise/modules i web
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

export type IntegrationUI = {
  key: string;
  name: string;
  desc: string;
  entitled: boolean;
  enabled: boolean;
  minPlan: string;
};

// entitled = planen gir tilgang; enabled = forhandleren har skrudd den på.
export const INTEGRATIONS_UI: IntegrationUI[] = [
  {
    key: 'vegvesen',
    name: 'Vegvesen',
    desc: 'Regnr → merke/modell/EU-frist (Autosys)',
    entitled: true,
    enabled: true,
    minPlan: 'Basis',
  },
  {
    key: 'quick',
    name: 'Quick',
    desc: 'Import av bookinger fra Quick',
    entitled: true,
    enabled: false,
    minPlan: 'Pluss',
  },
  {
    key: 'twilio',
    name: 'Twilio (SMS)',
    desc: 'SMS-varsler til kunder',
    entitled: true,
    enabled: true,
    minPlan: 'Pluss',
  },
  {
    key: 'resend',
    name: 'Resend (e-post)',
    desc: 'Transaksjons-e-post + nyhetsbrev',
    entitled: true,
    enabled: true,
    minPlan: 'Pluss',
  },
  {
    key: 'ai-providers',
    name: 'AI-leverandører',
    desc: 'Fireworks + Mistral (AI-agenter)',
    entitled: false,
    enabled: false,
    minPlan: 'Proff',
  },
];
