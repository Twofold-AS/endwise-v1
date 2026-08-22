/// <reference path="../md.d.ts" />
import type { AgentContext, AgentDefinition } from '@endwise/agent-runtime';
import { schema, withTenant } from '@endwise/db';
import { tool } from 'ai';
import { z } from 'zod';
import instructions from './instructions.md?raw';

/** Instruksjonen bor i `instructions.md` — ikke i en TS-streng. Den skal kunne
 *  redigeres av et menneske uten å røre kode (techstack §2: «agent = mappe»).
 *  Importeres som modulstreng så Next/Vercel inliner den; `readFileSync` mot
 *  `import.meta.url` peker på `/var/task/...` som ikke finnes i bunten. */

/**
 * F6-13 — Kunde-support-agenten (techstack §3, kanal «kunde ↔ forhandler»).
 *
 * Legg merke til hva verktøyene IKKE tar imot: ingen `tenantId`. Den kommer fra
 * `context`, som kommer fra sesjonen. Modellen kan be om hva den vil — den kan
 * ikke be om en annen forhandlers data, fordi det ikke finnes et felt å be i.
 */
export const kundeSupportAgent: AgentDefinition = {
  name: 'kunde-support',
  instructions,
  role: 'fast',
  // Kunden skriver fritt. Vi kontrollerer ikke hva som står der — det kan være
  // helseopplysninger (art. 9). Derfor: EU-provider, håndhevet i spawnAgent().
  dataClass: 'customer_freetext',
  requiredModule: 'ai-support',
  maxSteps: 5,

  tools(context: AgentContext) {
    return {
      mineBookinger: tool({
        description: 'Henter kundens kommende bookinger hos denne forhandleren.',
        inputSchema: z.object({
          // Ingen tenantId. Ingen customerId. Bevisst.
          limit: z.number().int().min(1).max(20).default(5),
        }),
        execute: async ({ limit }) =>
          withTenant(context.db, context.tenantId, (tx) =>
            tx.select().from(schema.bookings).limit(limit),
          ),
      }),

      tjenester: tool({
        description: 'Lister tjenestene verkstedet tilbyr, med varighet.',
        inputSchema: z.object({}),
        execute: async () =>
          withTenant(context.db, context.tenantId, (tx) =>
            tx.select().from(schema.services).limit(50),
          ),
      }),
    };
  },
};
