/// <reference path="../md.d.ts" />
import type { AgentContext, AgentDefinition } from '@endwise/agent-runtime';
import { ilike, or, schema, withTenant } from '@endwise/db';
import { tool } from 'ai';
import { z } from 'zod';
import { lagerVerktoy } from '../drift-innsikt/lager-verktoy.ts';
import { erTillattGaaTil } from './gaa-til.ts';
import instructions from './instructions.md?raw';
import {
  filtrerRonnyVerktoy,
  RONNY_TILLATTE_VERKTOY,
  sisteBrukertekst,
  vurderRonnyInn,
  vurderRonnySvar,
} from './scope-lock.ts';

/**
 * Workshop-agenten (Ronny). Samme dataklasse som drift-innsikt
 * (`tenant_operational`, rolle `fast`). `resolveModelProvider` ruter begge
 * til Mistral EU (Mikael 02.09.2026) — ikke Fireworks. Ingen Quick-skriving.
 * `requiredModule: null` — den følger brukeren på hver side, også uten
 * ai-support-modulen.
 * Scope-lås (Mikael 04.09.2026): systemprompt + `scope-lock.ts` (inn/ut +
 * tool-allowlist). Parkerte skriv utvides ikke.
 */
export const workshopAgent: AgentDefinition = {
  name: 'workshop',
  instructions,
  role: 'fast',
  dataClass: 'tenant_operational',
  requiredModule: null,
  maxSteps: 5,
  toolAllowlist: RONNY_TILLATTE_VERKTOY,
  preflight: vurderRonnyInn,
  rewriteOutput: (text, { usedTools, messages }) =>
    vurderRonnySvar({
      brukertekst: sisteBrukertekst(messages),
      svar: text,
      brukteVerktoy: usedTools,
    }).svar,

  tools(context: AgentContext) {
    return filtrerRonnyVerktoy({
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
      /** ASCII-nøkkel mot Mistral. UI matcher også `gåTil` i tool-parts. */
      gaaTil: tool({
        description:
          'Naviger til en kjent side i Endwise. Klienten åpner stien. Ingen eksterne URL-er.',
        inputSchema: z.object({
          href: z.string().max(200).describe('In-app-sti, f.eks. /kunder eller /innboks'),
        }),
        execute: async ({ href }) => {
          if (!erTillattGaaTil(href)) {
            return { ok: false, feil: 'Stien er ikke tillatt.' };
          }
          return { ok: true, href };
        },
      }),
      sokKunder: tool({
        description: 'Søk i forhandlerens kunder. Tenant-scopet. Returnerer navn og id.',
        inputSchema: z.object({
          sok: z.string().max(120).optional(),
        }),
        execute: async ({ sok }) => {
          const q = sok?.trim();
          const rader = await withTenant(context.db, context.tenantId, (tx) =>
            tx
              .select({
                id: schema.customers.id,
                navn: schema.customers.name,
              })
              .from(schema.customers)
              .where(
                q
                  ? or(
                      ilike(schema.customers.name, `%${q}%`),
                      ilike(schema.customers.email, `%${q}%`),
                    )
                  : undefined,
              )
              .limit(8),
          );
          return { kunder: rader };
        },
      }),
      opprettBooking: tool({
        description: 'Opprett booking. Parkert — krever bekreftelse senere.',
        inputSchema: z.object({}),
        execute: async () => ({ status: 'kommer' as const }),
      }),
      sokJobber: tool({
        description: 'Søk i jobber. Parkert — kommer.',
        inputSchema: z.object({ sok: z.string().max(120).optional() }),
        execute: async () => ({ status: 'kommer' as const }),
      }),
      aapneInnboks: tool({
        description: 'Åpne innboks. Parkert — bruk gaaTil med /innboks.',
        inputSchema: z.object({}),
        execute: async () => ({ status: 'kommer' as const }),
      }),
    });
  },
};
