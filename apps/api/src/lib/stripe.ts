import Stripe from 'stripe';

/**
 * Lat Stripe-klient. Env-variablene skal ikke kreves ved import
 * (build/test/mock). `stripeConfigured` sier om vi kan gjøre ekte kall.
 */
let client: Stripe | undefined;

export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY mangler — Stripe er i mock/test-modus');
  }
  client ??= new Stripe(key);
  return client;
}
