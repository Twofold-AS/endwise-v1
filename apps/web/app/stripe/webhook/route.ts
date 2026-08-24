import { handleStripeWebhookRaw } from '@endwise/api/http/stripe-webhook';

/**
 * F13-03 / F5-09 — Stripe-webhook.
 *
 * ⛔ RÅ body. `constructEvent` signerer bytes, ikke et parse-tre.
 * `await req.text()` — aldri `req.json()` — før signaturen sjekkes.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'cdg1';

export async function POST(req: Request) {
  const rawBody = await req.text();
  return handleStripeWebhookRaw(rawBody, req.headers.get('stripe-signature'));
}
