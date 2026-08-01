import { publishEvent } from '@endwise/modules/stream';
import type { AgentContext } from './context.ts';
import type { AgentEvent } from './loop.ts';

/**
 * F6-13 × F6-02 — AI-streamingen går på SAMME SSE-kanal som meldingene.
 *
 * Ingen parallell WebSocket, ingen egen streaming-endepunkt. Techstack §3 er
 * tydelig: «to systemer som deler transport». En agent er bare en deltaker til
 * i tråden (F6-05), og tokenene dens er bare enda en type event.
 *
 * `audienceId` settes til brukeren som snakker med agenten — ellers ville hele
 * forhandlerens ansatte fått hvert token fra hver kundes AI-samtale.
 */
export function createStreamBridge(context: AgentContext) {
  return async (event: AgentEvent): Promise<void> => {
    await publishEvent(context.db, {
      tenantId: context.tenantId,
      audienceId: context.userId,
      type: event.type,
      subjectId: context.threadId ?? null,
      payload: { ...event },
    });
  };
}
