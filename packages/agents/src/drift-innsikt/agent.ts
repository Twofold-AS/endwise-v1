// / <reference path="../md.d.ts" />
import type { AgentContext, AgentDefinition } from '@endwise/agent-runtime';
import { schema, withTenant } from '@endwise/db';
import { tool } from 'ai';
import { z } from 'zod';
import instructions from './instructions.md?raw';
import { lagerVerktoy } from './lager-verktoy.ts';

/**
 * F14 — Drifts-agenten. Kontrasten til kunde-support.
 * `dataClass: 'tenant_operational'` — den ser kun forhandlerens egne
 * strukturerte driftsdata. Ingen sluttkunde skriver inn i den; det er en ansatt
 * som spør om sin egen kapasitet.
 * Derfor kan den kjøre på Fireworks. Og derfor må den aldri få et verktøy som
 * returnerer kundens fritekst. Legger noen til et `lesKundemelding`-verktøy
 * her, må dataklassen endres til `customer_freetext` i samme commit — ellers er
 * det en stille lekkasje.
 */
export const driftInnsiktAgent: AgentDefinition = {
  name: 'drift-innsikt',
  instructions,
  role: 'fast',
  dataClass: 'tenant_operational',
  requiredModule: 'ai-support',
  maxSteps: 5,

  tools(context: AgentContext) {
    return {
      dagensBookinger: tool({
        description: 'Bookinger for forhandleren i et tidsrom.',
        inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(20) }),
        execute: async ({ limit }) =>
          withTenant(context.db, context.tenantId, (tx) =>
            tx.select().from(schema.bookings).limit(limit),
          ),
      }),

      // Lager, kun lesing og med felt-allowlist (ingen kostpris).
      // Se lager-verktoy.ts for de tre grensene og hvorfor de står der.
      ...lagerVerktoy(context),

      mekanikere: tool({
        description: 'Mekanikerne hos forhandleren, med kapasitet.',
        inputSchema: z.object({}),
        execute: async () =>
          withTenant(context.db, context.tenantId, (tx) =>
            tx.select().from(schema.mechanics).limit(50),
          ),
      }),
    };
  },
};
