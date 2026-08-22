import { afterEach, describe, expect, it, vi } from 'vitest';
import { handleStripeWebhook, handleStripeWebhookRaw } from '../src/http/stripe-webhook.ts';

/**
 * F13-03 / F5-09 — rå body til Stripe-signaturen.
 *
 * Beviser kontrakten uten å snakke med Stripe eller DB: uten nøkler feiler
 * ruta LUKKET (503), og med nøkler men uten gyldig signatur blir det 400.
 * `req.json()` brukes aldri — kun `req.text()` / raw string.
 */
describe('handleStripeWebhookRaw', () => {
  const ORIG_SK = process.env.STRIPE_SECRET_KEY;
  const ORIG_WH = process.env.STRIPE_WEBHOOK_SECRET;

  afterEach(() => {
    if (ORIG_SK === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = ORIG_SK;
    if (ORIG_WH === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIG_WH;
  });

  it('503 når Stripe ikke er konfigurert (feil lukket)', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const res = await handleStripeWebhookRaw('{"id":"evt_1"}', 't=1,v1=abc');
    expect(res.status).toBe(503);
    expect(await res.json()).toMatchObject({ ok: false, mock: true });
  });

  it('400 ved ugyldig signatur på rå body', async () => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_dummy_for_constructEvent';
    process.env.STRIPE_WEBHOOK_SECRET = 'whsec_dummy';
    const raw = '{"id":"evt_1","type":"ping","data":{"object":{}}}';
    const res = await handleStripeWebhookRaw(raw, 't=1,v1=ikke-gyldig');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'signaturfeil' });
  });
});

describe('handleStripeWebhook (req.text)', () => {
  const ORIG_SK = process.env.STRIPE_SECRET_KEY;
  const ORIG_WH = process.env.STRIPE_WEBHOOK_SECRET;

  afterEach(() => {
    if (ORIG_SK === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = ORIG_SK;
    if (ORIG_WH === undefined) delete process.env.STRIPE_WEBHOOK_SECRET;
    else process.env.STRIPE_WEBHOOK_SECRET = ORIG_WH;
  });

  it('leser body med text(), ikke json()', async () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    const raw = '{"id":"evt_raw","type":"ping"}';
    const req = new Request('http://endwise.test/stripe/webhook', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': 't=1,v1=x' },
      body: raw,
    });
    const spyText = vi.spyOn(req, 'text');
    const spyJson = vi.spyOn(req, 'json');
    const res = await handleStripeWebhook(req);
    expect(spyText).toHaveBeenCalledOnce();
    expect(spyJson).not.toHaveBeenCalled();
    expect(res.status).toBe(503);
  });
});
