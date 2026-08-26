import { pgConnectionConfig, STREAM_CHANNEL } from '@endwise/db';
import { Client } from 'pg';

export interface StreamSignal {
  id: number;
  tenantId: string;
  audienceId: string | null;
}

type Listener = (signal: StreamSignal) => void;

/**
 * Én listen-forbindelse for hele prosessen.
 * Merk: dette MÅ være en `Client`, ikke en `Pool`. Listen er session-tilstand
 * en pooled forbindelse som gis tilbake og lånes ut igjen, slutter å lytte uten
 * å si fra. Vi ville da hatt en SSE-tjeneste som stille sluttet å levere.
 * Én forbindelse, én listen, og fan-out i minnet til alle tilkoblede klienter.
 * Alternativet — én listen per tenant — ville betydd at hver nye forhandler
 * krevde en ny DB-forbindelse.
 */
export function createStreamSubscriber(connectionString: string) {
  const listeners = new Set<Listener>();
  let client: Client | undefined;
  let reconnectTimer: NodeJS.Timeout | undefined;
  let stopped = false;

  async function connect(): Promise<void> {
    if (stopped) return;

    client = new Client(pgConnectionConfig(connectionString));

    client.on('notification', (msg) => {
      if (msg.channel !== STREAM_CHANNEL || !msg.payload) return;
      try {
        const signal = JSON.parse(msg.payload) as StreamSignal;
        for (const listener of listeners) listener(signal);
      } catch {
        // En ugyldig payload skal ikke rive ned strømmen for alle andre.
      }
    });

    client.on('error', () => {
      // Mistet DB-forbindelsen. Klientene beholder sine SSE-tilkoblinger og
      // henter det de gikk glipp av via Last-Event-ID når vi er oppe igjen.
      scheduleReconnect();
    });

    await client.connect();
    await client.query(`LISTEN ${STREAM_CHANNEL}`);
  }

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = undefined;
      connect().catch(scheduleReconnect);
    }, 1000);
  }

  return {
    start: connect,

    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },

    get listenerCount() {
      return listeners.size;
    },

    async stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      listeners.clear();
      await client?.end();
    },
  };
}

export type StreamSubscriber = ReturnType<typeof createStreamSubscriber>;
