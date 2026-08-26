import { TIERS, TILLEGG } from '@endwise/modules/billing';
import Stripe from 'stripe';

/**
 * Opprett Products + Prices i Stripe fra priskatalogen.
 * Kjør: `pnpm stripe:setup`
 * test-modus only. Scriptet nekter å kjøre med en `sk_live_`-nøkkel.
 * Prisstrukturen skal settes opp og verifiseres i test før den røres i live,
 * og et script som «bare» kan opprette et live-produkt ved et uhell er et
 * script som en dag gjør det.
 * Idempotent: hvert produkt får en fast `lookup_key` på prisen. Kjører du
 * på nytt, gjenbrukes eksisterende pris i stedet for at det lages en ny — ellers
 * ville tredje kjøring gitt tre priser på samme produkt og ingen visshet om
 * hvilken som faktisk brukes.
 * Scriptet skriver ikke i .env. Det skriver ut linjene du limer inn. Å la et
 * script redigere hemmeligheter automatisk er en vane man ikke vil ha.
 */

const key = process.env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(`
⛔ STRIPE_SECRET_KEY mangler.

Slik gjør du:
  1. Gå til https://dashboard.stripe.com/test/apikeys  (merk: /test/)
  2. Kopier "Secret key" — den skal begynne med sk_test_
  3. Legg den i .env:  STRIPE_SECRET_KEY="sk_test_..."
  4. Kjør dette scriptet på nytt.
`);
  process.exit(1);
}

if (key.startsWith('sk_live_')) {
  console.error(`
⛔ Dette er en LIVE-nøkkel. Scriptet kjører kun mot test.

Bytt til test-nøkkelen fra https://dashboard.stripe.com/test/apikeys
(begynner med sk_test_). Live-oppsettet gjøres bevisst, manuelt, av et menneske.
`);
  process.exit(1);
}

const stripe = new Stripe(key);
const VALUTA = 'nok';

/** Én linje i katalogen, uavhengig av om det er et nivå eller et tillegg. */
type Vare = {
  navn: string;
  beskrivelse: string;
  oreMnd: number;
  envNokkel: string;
  lookupKey: string;
};

const VARER: Vare[] = [
  ...TIERS.map((t) => ({
    navn: `Endwise ${t.name}`,
    beskrivelse: t.pitch,
    oreMnd: t.priceMonthlyMinor,
    envNokkel: t.stripePriceEnv,
    lookupKey: `endwise_tier_${t.key}_mnd`,
  })),
  ...TILLEGG.filter((t) => t.priceMonthlyMinor > 0).map((t) => ({
    navn: `Endwise tillegg: ${t.name}`,
    beskrivelse: t.desc,
    oreMnd: t.priceMonthlyMinor,
    envNokkel: t.stripePriceEnv,
    lookupKey: `endwise_addon_${t.key}_mnd`,
  })),
];

const kr = (ore: number) => (ore / 100).toLocaleString('nb-NO');

async function opprett(v: Vare): Promise<string> {
  // Finnes prisen allerede? `lookup_key` er vår idempotensnøkkel.
  const eksisterende = await stripe.prices.list({
    lookup_keys: [v.lookupKey],
    active: true,
    limit: 1,
  });
  const funnet = eksisterende.data[0];
  if (funnet) {
    console.info(`  ↻ ${v.navn.padEnd(38)} finnes  ${funnet.id}`);
    return funnet.id;
  }

  const produkt = await stripe.products.create({
    name: v.navn,
    description: v.beskrivelse,
  });
  const pris = await stripe.prices.create({
    product: produkt.id,
    currency: VALUTA,
    unit_amount: v.oreMnd,
    recurring: { interval: 'month' },
    lookup_key: v.lookupKey,
    // Katalogen er eks. mva; Stripe Tax legger på mva ved checkout hvis satt opp.
    tax_behavior: 'exclusive',
  });
  console.info(`  ✓ ${v.navn.padEnd(38)} ${kr(v.oreMnd).padStart(7)} kr  ${pris.id}`);
  return pris.id;
}

console.info('\nOppretter Endwise-produkter i Stripe TEST…\n');

const linjer: string[] = [];
for (const v of VARER) {
  const priceId = await opprett(v);
  linjer.push(`${v.envNokkel}="${priceId}"`);
}

console.info(`
──────────────────────────────────────────────────────────────────
Lim disse inn i .env:

${linjer.join('\n')}

──────────────────────────────────────────────────────────────────
Deretter, for å teste webhooken lokalt:

  stripe listen --forward-to localhost:3001/stripe/webhook

Kommandoen skriver ut en whsec_… — legg den i .env som STRIPE_WEBHOOK_SECRET.
Uten den svarer webhooken 503 og ingenting provisjoneres. Det er med vilje:
den feiler LUKKET.
`);

process.exit(0);
