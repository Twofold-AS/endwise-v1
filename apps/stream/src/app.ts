import {
  assertMember,
  createAuth,
  requireSession,
  SessionExpiredError,
  TwoFactorRequiredError,
} from '@endwise/auth';
import { createDb } from '@endwise/db';
import {
  ConnectionCapError,
  createConnectionRegistry,
  createStreamSubscriber,
  readEventsSince,
} from '@endwise/modules/stream';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { HEARTBEAT_MS, MAX_STREAM_LIFETIME_MS } from './config.ts';

/**
 * apps/stream — F6-02.
 * Én SSE-tjeneste, to typer innhold (techstack §3): menneskemenneske-meldinger
 * Og AI-streaming. De deler transport, ikke datamodell.
 * Sikkerheten, i den rekkefølgen den må skje:
 * 1. sesjon — hvem er du? (F1-12, inkl. absolutt maks-levetid)
 * 2. medlemskap — hører du til denne tenanten? (assertMember)
 * 3. audience — er dette eventet ment for deg?
 * 4. RLS — innholdet hentes gjennom withTenant
 * En SSE-strøm som lekker på tvers av tenants er samme feil som en spørring
 * som gjør det — bare vanskeligere å oppdage, fordi den lekker over tid og
 * ingen ser en 200 som er feil. Derfor er filtreringen i punkt 3 en hard
 * sjekk i tjenesten, ikke bare en antagelse om at notify-en var riktig adressert.
 */
export function createStreamApp(options: { databaseUrl: string; listenUrl?: string }) {
  const db = createDb(options.databaseUrl);
  const auth = createAuth(db);
  const subscriber = createStreamSubscriber(options.listenUrl ?? options.databaseUrl);
  const connections = createConnectionRegistry();

  const app = new Hono();

  app.get('/health', (c) =>
    c.json({ ok: true, service: 'stream', listeners: subscriber.listenerCount }),
  );

  app.get('/sse', async (c) => {
    // 1. Hvem er du?
    // Bare utløpt sesjon er 401. TOTP er valgfri — TwoFactorRequiredError
    // tømmer ikke SSE (og kastes ikke fra requireSession lenger).
    let session: Awaited<ReturnType<typeof requireSession>>;
    try {
      session = await requireSession(auth, db, c.req.raw.headers);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        return c.json({ error: 'Ikke innlogget' }, 401);
      }
      if (error instanceof TwoFactorRequiredError) {
        return c.json({ error: 'Ikke innlogget' }, 401);
      }
      throw error;
    }

    const tenantId = c.req.query('tenantId') ?? session.session.activeOrganizationId;
    if (!tenantId) return c.json({ error: 'Ingen tenant' }, 400);

    // 2. Hører du til denne tenanten? Uten dette kan en innlogget bruker be om
    // hvilken som helst tenant-ID og få strømmen hennes.
    const userId = session.user.id;
    try {
      await assertMember(db, userId, tenantId);
    } catch {
      return c.json({ error: 'Ikke medlem av denne forhandleren' }, 403);
    }

    // 3. Tilkoblings-caps (kostnadsdriveren, techstack §7).
    let release: () => void;
    try {
      release = connections.acquire(tenantId, userId);
    } catch (error) {
      if (error instanceof ConnectionCapError) {
        return c.json({ error: error.message }, 429);
      }
      throw error;
    }

    const lastEventId = Number(c.req.header('Last-Event-ID') || c.req.query('lastEventId') || 0);

    return streamSSE(c, async (stream) => {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        clearTimeout(lifetime);
        release();
      };

      stream.onAbort(close);

      // 4. Avspilling: alt klienten gikk glipp av mens den var frakoblet.
      // Går gjennom RLS — en Last-Event-ID fra en annen tenant gir null rader.
      if (lastEventId > 0) {
        const missed = await readEventsSince(db, tenantId, lastEventId, userId);
        for (const event of missed) {
          await stream.writeSSE({
            id: String(event.id),
            event: event.type,
            data: JSON.stringify({ subjectId: event.subjectId, ...event.payload }),
          });
        }
      }

      // 5. Live. Notify sier bare at det finnes noe nytt; innholdet leses fra
      // tabellen gjennom RLS.
      const unsubscribe = subscriber.subscribe((signal) => {
        if (closed) return;
        // Hard filtrering. Vi stoler ikke på at notify-en var riktig adressert.
        if (signal.tenantId !== tenantId) return;
        if (signal.audienceId !== null && signal.audienceId !== userId) return;

        void (async () => {
          const events = await readEventsSince(db, tenantId, signal.id - 1, userId, 1);
          const event = events[0];
          if (!event || closed) return;
          await stream.writeSSE({
            id: String(event.id),
            event: event.type,
            data: JSON.stringify({ subjectId: event.subjectId, ...event.payload }),
          });
        })().catch(() => {
          /* en enkelt feilet levering skal ikke rive ned strømmen */
        });
      });

      const heartbeat = setInterval(() => {
        if (closed) return;
        void stream.writeSSE({ event: 'heartbeat', data: String(Date.now()) }).catch(close);
      }, HEARTBEAT_MS);

      const lifetime = setTimeout(() => {
        // Tvungen resirkulering. Klienten kobler til igjen med Last-Event-ID og
        // mister ingenting — men vi unngår forbindelser som lever evig.
        void stream.close();
        close();
      }, MAX_STREAM_LIFETIME_MS);

      await stream.writeSSE({ event: 'ready', data: JSON.stringify({ tenantId }) });

      // Hold strømmen åpen til klienten går, eller levetiden løper ut.
      while (!closed && !stream.aborted) {
        await stream.sleep(1000);
      }
      close();
    });
  });

  return { app, subscriber, connections };
}
