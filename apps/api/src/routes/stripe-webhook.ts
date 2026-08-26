import { Hono } from 'hono';
import { handleStripeWebhook } from '../http/stripe-webhook.ts';

/**
 * Hono-inngang for lokal `serve`. Logikken og rå-body-kontrakten
 * bor i `http/stripe-webhook.ts` (samme funksjon Next kaller).
 */
export const stripeWebhook = new Hono().post('/', (c) => handleStripeWebhook(c.req.raw));
