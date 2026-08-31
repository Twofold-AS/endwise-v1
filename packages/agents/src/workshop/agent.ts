/// <reference path="../md.d.ts" />
import type { AgentContext, AgentDefinition } from '@endwise/agent-runtime';
import { schema, withTenant } from '@endwise/db';
import { tool } from 'ai';
import { z } from 'zod';
import { lagerVerktoy } from '../drift-innsikt/lager-verktoy.ts';
import instructions from './instructions.md?raw';

/**
 * Workshop-agenten. Samme provider-sti som drift-innsikt (tenant_operational,
 * rolle `fast` — billig/cachet). Ingen ny leverandør. Ingen Quick-skriving.
 * `requiredModule: null` — den følger brukeren på hver side, også uten
 * ai-support-modulen.
 */
export const workshopAgent: AgentDefinition = {
  name: 'workshop',
  instructions,
  role: 'fast',
  dataClass: 'tenant_operational',
  requiredModule: null,
  maxSteps: 5,

  tools(context: AgentContext) {
    return {
      dagensBookinger: tool({
        description: 'Bookinger for forhandleren. Kun lesing.',
        inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(20) }),
        execute: async ({ limit }) =>
          withTenant(context.db, context.tenantId, (tx) =>
            tx.select().from(schema.bookings).limit(limit),
          ),
      }),
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
