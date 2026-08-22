import { randomUUID } from 'node:crypto';
import {
  createRateLimiter,
  createWidgetKeyService,
  createWidgetPublicService,
  originAllowed,
  signWidgetToken,
  WIDGET_SLOT_STEP_MINUTES,
  WidgetBookingError,
  widgetWorkingDay,
} from '@endwise/modules/widget';
import { Hono } from 'hono';
import { z } from 'zod';
import { createAppContext } from '../../context.ts';
import {
  clientIp,
  type WidgetVars,
  widgetAuth,
  widgetCors,
  widgetTokenSecret,
} from '../../lib/widget-auth.ts';
import { widgetChat } from './chat.ts';

/**
 * F4 — OFFENTLIG kundewidget-API (Hono, uautentisert men nøkkel-/token-scopet).
 *
 * Sikkerhet i lag:
 *   1. CORS (`widgetCors`) — cross-origin embed.
 *   2. `/init`: publishable key + Origin-validering → kortlevd token. Rate-limitet.
 *   3. Alt annet: `widgetAuth` verifiserer token → tenant + anonym kunde-ID.
 *   4. All datatilgang RLS-scopet til tenant fra tokenet (aldri klient-input).
 *   5. Rate-limit per endepunkt (anonyme kan spamme).
 *
 * En anonym kunde kan KUN: se tjenester, se ledige tider, opprette EN booking-
 * forespørsel, chatte med kunde-AI-en (EU). Aldri enumerere andres data.
 */

// Rate-limitere (per instans; se rate-limit.ts om delt teller ved skalering).
const initLimiter = createRateLimiter({ windowMs: 5 * 60_000, max: 30 });
const readLimiter = createRateLimiter({ windowMs: 60_000, max: 60 });
const bookingLimiter = createRateLimiter({ windowMs: 10 * 60_000, max: 5 });

function lazyDb() {
  return createAppContext().db;
}

const app = new Hono<{ Variables: WidgetVars }>();

// CORS + preflight på hele flaten.
app.use('*', widgetCors);

/** Veksle publishable key (+ gyldig Origin) inn i et kortlevd token. */
app.post('/init', async (c) => {
  const ip = clientIp(c);
  if (!initLimiter.check(`init:${ip}`).allowed) {
    return c.json({ error: 'For mange forsøk, prøv igjen senere' }, 429);
  }

  const body = await c.req.json().catch(() => null);
  const parsed = z.object({ publishableKey: z.string().min(8).max(128) }).safeParse(body);
  if (!parsed.success) return c.json({ error: 'Ugyldig forespørsel' }, 400);

  const resolution = await createWidgetKeyService(lazyDb()).resolveByPublishableKey(
    parsed.data.publishableKey,
  );
  if (!resolution) return c.json({ error: 'Ukjent eller inaktiv nøkkel' }, 401);

  // CWE-346: embed-en må kjøre fra en registrert origin for denne nøkkelen.
  const origin = c.req.header('origin');
  if (!originAllowed(origin, resolution.allowedOrigins)) {
    return c.json({ error: 'Origin er ikke registrert for denne nøkkelen' }, 403);
  }

  const cid = `customer:${randomUUID()}`;
  const token = signWidgetToken({ tid: resolution.tenantId, cid }, widgetTokenSecret());
  return c.json({ token, expiresIn: 900, cid });
});

// ── Fra her krever alt et gyldig token ────────────────────────────────────────
app.use('/services', widgetAuth);
app.use('/availability', widgetAuth);
app.use('/booking', widgetAuth);
app.use('/chat', widgetAuth);

/** Aktive tjenester (public-safe felt). */
app.get('/services', async (c) => {
  const tenantId = c.get('widgetTenantId');
  if (!readLimiter.check(`svc:${c.get('widgetCid')}`).allowed) {
    return c.json({ error: 'For mange forespørsler' }, 429);
  }
  const services = await createWidgetPublicService(lazyDb()).listServices(tenantId);
  return c.json({ services });
});

/** Ledige tider for en tjeneste på en dag (kun tidspunkter). */
app.get('/availability', async (c) => {
  const tenantId = c.get('widgetTenantId');
  if (!readLimiter.check(`avl:${c.get('widgetCid')}`).allowed) {
    return c.json({ error: 'For mange forespørsler' }, 429);
  }
  const q = z
    .object({ serviceVersionId: z.uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })
    .safeParse({ serviceVersionId: c.req.query('serviceVersionId'), date: c.req.query('date') });
  if (!q.success) return c.json({ error: 'Ugyldige parametre' }, 400);

  // Arbeidsdag 08–16 lokal (forenklet; ekte åpningstider er F5/senere).
  const { dayStart, dayEnd } = widgetWorkingDay(q.data.date);
  const slots = await createWidgetPublicService(lazyDb()).availableSlots(tenantId, {
    serviceVersionId: q.data.serviceVersionId,
    dayStart,
    dayEnd,
    stepMinutes: WIDGET_SLOT_STEP_MINUTES,
    notBefore: new Date(),
  });
  return c.json({ slots: slots.map((s) => s.toISOString()) });
});

/** Opprett en booking-forespørsel (mekaniker velges server-side). */
app.post('/booking', async (c) => {
  const tenantId = c.get('widgetTenantId');
  const cid = c.get('widgetCid');
  if (!bookingLimiter.check(`bk:${cid}`).allowed) {
    return c.json({ error: 'For mange booking-forsøk' }, 429);
  }
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({
      serviceVersionId: z.uuid(),
      // z.coerce.date() (som resten av repoet) — parser ISO-streng til Date.
      startsAt: z.coerce.date(),
      customer: z.object({
        name: z.string().min(1).max(120),
        phone: z.string().min(3).max(20),
        email: z.email().max(160).optional(),
      }),
      regNumber: z.string().max(12).optional(),
      notes: z.string().max(1000).optional(),
    })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: 'Ugyldig booking' }, 400);

  try {
    const result = await createWidgetPublicService(lazyDb()).createBookingRequest(tenantId, {
      serviceVersionId: parsed.data.serviceVersionId,
      startsAt: parsed.data.startsAt,
      customer: parsed.data.customer,
      regNumber: parsed.data.regNumber ?? null,
      notes: parsed.data.notes ?? null,
      // Idempotens bindes til den anonyme økten + tid + tjeneste (hindrer dobbeltbooking).
      idempotencyKey: `widget:${cid}:${parsed.data.serviceVersionId}:${parsed.data.startsAt.toISOString()}`,
    });
    return c.json(result);
  } catch (error) {
    if (error instanceof WidgetBookingError) return c.json({ error: error.message }, 409);
    // Slot-konflikt fra motoren o.l. — generisk, ingen intern lekkasje.
    return c.json({ error: 'Kunne ikke opprette booking (tiden kan være opptatt)' }, 409);
  }
});

/** Kundevendt AI-chat (Mistral EU + scope-gate + art.50). Se chat.ts. */
app.post('/chat', (c) => widgetChat(c));

export const widget = app;
