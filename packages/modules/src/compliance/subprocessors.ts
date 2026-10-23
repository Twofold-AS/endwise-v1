/**
 * Underdatabehandlere — generert fra kode, ikke et notat (F14-06/F14-15).
 * Fireworks er fjernet: agent-runtime ruter ikke dit. Mistral er merket
 * med regionalt EU-endepunkt (api.eu.mistral.ai).
 */
export interface Subprocessor {
  vendor: string;
  purpose: string;
  data: string;
  location: string;
  transferBasis: string;
}

export const SUBPROCESSORS: readonly Subprocessor[] = [
  {
    vendor: 'Mistral',
    purpose: 'AI-inferens for alle agenter (Ronny, kunde, intern drift) + moderasjon',
    data: 'Maskert fritekst og tenant-skopede driftsfelt. Chat completions + function calling.',
    location: 'EU (regional inference, api.eu.mistral.ai)',
    transferBasis: 'DPA (F14-09). ZDR søkes (F14-11). Ingen tredjelandsoverføring for inferens.',
  },
  {
    vendor: 'Vercel',
    purpose: 'App-hosting, Functions, Cron, Blob',
    data: 'All app-data i transitt/kjøring',
    location: 'US-selskap, EU-region (cdg1 Paris)',
    transferBasis: 'SCC / DPF',
  },
  {
    vendor: 'Vercel Web Analytics',
    purpose: 'Anonym besøksstatistikk',
    data: 'Cookieless, aggregert; hash nullstilles daglig. Ingen PII.',
    location: 'Vercel (US/EU)',
    transferBasis: 'SCC. Kun på deploy.',
  },
  {
    vendor: 'Scaleway',
    purpose: 'Postgres (EU)',
    data: 'All tenant-/kundedata',
    location: 'EU (Frankrike)',
    transferBasis: 'DPA',
  },
  {
    vendor: 'Resend',
    purpose: 'Transaksjons-e-post',
    data: 'E-postadresser + innhold',
    location: 'US',
    transferBasis: 'DPA + SCC',
  },
  {
    vendor: 'Twilio',
    purpose: 'SMS-varsler',
    data: 'Telefonnummer + meldingsinnhold',
    location: 'US',
    transferBasis: 'DPA + SCC',
  },
  {
    vendor: 'Stripe',
    purpose: 'Forhandler-abonnement',
    data: 'Betalings-/personopplysninger (kortdata hos Stripe)',
    location: 'US-selskap med EU-entitet',
    transferBasis: 'SCC + PCI-DSS (F14-19)',
  },
];

export function subprocessorVendors(): string[] {
  return SUBPROCESSORS.map((s) => s.vendor);
}
