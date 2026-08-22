import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F13-03 — Next-ruta MÅ lese rå body med `req.text()`.
 * En `req.json()` her ville ødelagt Stripe-signaturen i produksjon.
 */
describe('stripe webhook route (F13-03)', () => {
  const src = readFileSync(
    join(dirname(fileURLToPath(import.meta.url)), '../app/stripe/webhook/route.ts'),
    'utf8',
  );

  it('kaller await req.text() og aldri req.json()', () => {
    const body = src.split('export async function POST')[1] ?? '';
    expect(body).toMatch(/await req\.text\(\)/);
    expect(body).not.toMatch(/req\.json\(/);
    expect(src).toMatch(/handleStripeWebhookRaw/);
  });
});
