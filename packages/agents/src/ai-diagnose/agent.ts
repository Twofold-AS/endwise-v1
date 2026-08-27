/// <reference path="../md.d.ts" />
import type { AgentContext, AgentDefinition } from '@endwise/agent-runtime';
import { and, eq, schema, withTenant } from '@endwise/db';
import { createMessagesModule } from '@endwise/modules';
import { tool } from 'ai';
import { z } from 'zod';
import instructions from './instructions.md?raw';

/**
 * Ai-diagnose. Den første agenten som kjører på chat-flaten (F6-18).
 * dataClass: customer_freetext
 * Den som skriver, beskriver et problem med egne ord. Vi kontrollerer ikke hva
 * som står der — det kan være «jeg falt av og brakk håndleddet, sykkelen står
 * i grøfta», altså helseopplysninger (art. 9). Derfor **Mistral (EU), alltid**,
 * håndhevet i `streamAgentChat`/`spawnAgent`, ikke i en konfigfil.
 * De tre verktøyene, og hvorfor akkurat disse
 * `tjenester` lese — hva verkstedet faktisk tilbyr. Uten den ville
 * modellen funnet på tjenester som ikke finnes.
 * `sporKunden` spør — klient-verktøy uten `execute`. Se under.
 * `noterDiagnose` skrive — bak `needsApproval`. Se under.
 * Ingen av dem tar imot en `tenantId`. Den finnes ikke som felt å be i.
 */
export const aiDiagnoseAgent: AgentDefinition = {
  name: 'ai-diagnose',
  instructions,
  role: 'fast',
  dataClass: 'customer_freetext',
  requiredModule: 'ai-diagnose',
  maxSteps: 8,

  tools(context: AgentContext) {
    return {
      tjenester: tool({
        description:
          'Lister tjenestene verkstedet tilbyr, med hvilken kjøretøytype de gjelder. Bruk denne FØR du foreslår noe.',
        inputSchema: z.object({}),
        execute: async () =>
          withTenant(context.db, context.tenantId, (tx) =>
            tx
              .select({
                id: schema.services.id,
                navn: schema.services.name,
                kjoretoytype: schema.services.vehicleType,
              })
              .from(schema.services)
              .where(eq(schema.services.active, true))
              .limit(50),
          ),
      }),

      /**
       * Ingen `execute`. Det er ikke en forglemmelse — det er mekanismen.
       * Et verktøy uten `execute` kjøres ikke på serveren. AI SDK sender det til
       * klienten som en tool-part i tilstand `input-available`, og løkka stopper
       * til svaret kommer tilbake via `addToolOutput`. Det er human-in-the-loop
       * uten at vi har bygget en eneste tilstandsmaskin selv.
       * UI-et rendrer dette som en `Questionnaire` (ui-pakker §9).
       */
      sporKunden: tool({
        description:
          'Still ETT oppklarende spørsmål når du mangler informasjon. Gi konkrete alternativer når det finnes noen, ellers la det stå åpent for fritekst.',
        inputSchema: z.object({
          sporsmal: z.string().min(3).max(200).describe('Spørsmålet, på norsk.'),
          alternativer: z
            .array(z.string().min(1).max(80))
            .max(6)
            .optional()
            .describe('Svaralternativer. Utelat for fritekstsvar.'),
        }),
      }),

      /**
       * Godkjenn-før-agenten-skriver.
       * `needsApproval: true` gjør at AI SDK holder kallet tilbake og sender
       * tilstanden `approval-requested` til klienten. `execute` kjører først når
       * et menneske har svart ja. Samme prinsipp som Quick-push (F8-01) og
       * Framer-publisering (F8-09): agenten foreslår, mennesket utfører.
       * Skrivingen går gjennom `postMessage`, som kaller `assertParticipant`.
       * Er ikke brukeren deltaker i tråden, feiler den — den feiler lukket.
       */
      noterDiagnose: tool({
        description:
          'Skriver diagnosen og den foreslåtte tjenesten som et notat i saken. Krever godkjenning fra et menneske.',
        inputSchema: z.object({
          oppsummering: z
            .string()
            .min(10)
            .max(1000)
            .describe('Kort oppsummering av problemet, på norsk.'),
          foreslattTjeneste: z
            .string()
            .min(1)
            .max(120)
            .describe('Navnet på tjenesten, nøyaktig slik den står i `tjenester`.'),
          usikkerhet: z
            .string()
            .max(300)
            .optional()
            .describe('Hva du ER usikker på. Utelat kun hvis du ikke er usikker på noe.'),
        }),
        needsApproval: true,
        execute: async ({ oppsummering, foreslattTjeneste, usikkerhet }) => {
          if (!context.threadId) {
            return { skrevet: false, grunn: 'Ingen sak å skrive i.' };
          }

          // Tjenesten må finnes. Uten denne sjekken kunne modellen skrevet et
          // notat om «Stor service Platinum» som verkstedet ikke tilbyr, og det
          // ville sett like ekte ut som alt annet i saken.
          const treff = await withTenant(context.db, context.tenantId, (tx) =>
            tx
              .select({ navn: schema.services.name })
              .from(schema.services)
              .where(
                and(eq(schema.services.name, foreslattTjeneste), eq(schema.services.active, true)),
              )
              .limit(1),
          );
          if (treff.length === 0) {
            return {
              skrevet: false,
              grunn: `«${foreslattTjeneste}» finnes ikke blant verkstedets aktive tjenester.`,
            };
          }

          const messages = createMessagesModule(context.db);
          await messages.postMessage({
            tenantId: context.tenantId,
            threadId: context.threadId,
            authorId: context.userId,
            body: [
              `**AI-diagnose**${usikkerhet ? ' (usikker)' : ''}`,
              oppsummering,
              `Foreslått tjeneste: ${foreslattTjeneste}`,
              usikkerhet ? `Usikkerhet: ${usikkerhet}` : null,
            ]
              .filter(Boolean)
              .join('\n\n'),
          });

          return { skrevet: true, tjeneste: foreslattTjeneste };
        },
      }),
    };
  },
};
