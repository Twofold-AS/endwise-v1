import type { GuardrailPipeline } from '@endwise/guardrails';
import { DataRegionViolation, type ModelProvider, providerSatisfies } from '@endwise/providers';
import type { ModelMessage, Tool } from 'ai';
import { type AgentDefinition, assertEntitled } from './agent.ts';
import { type AgentContext, sealContext } from './context.ts';
import { type AgentEvent, runAgentWithTools } from './loop.ts';

/**
 * Spawn: agenten bindes til ÉN tenant, én gang, for alltid.
 * Er dette ekte sikkerhet, eller flytter vi bare på den?
 * Ærlig svar: de tre lagene vi hadde fra før (sesjon → L2-stripping → RLS) var
 * allerede tilstrekkelige mot angrepet. Denne bindingen stopper ikke en
 * lekkasje som ellers ville skjedd **i dag**.
 * Det den gjør, er å endre hva slags feil som er mulig Å introdusere senere.
 * Før: `tenantId` var en verdi som fulgte med i konteksten, og hvert nye verktøy
 * måtte huske å hente den derfra. Regelen var korrekt, men den var en konvensjon.
 * Konvensjoner overlever ikke fem års vedlikehold av folk som ikke leste
 * kommentaren.
 * Nå: verktøyene bygges ÉN gang, ved spawn, med en frosset kontekst. Løkka får
 * dem ferdig bygget og har ingen mulighet til å bygge nye. Det finnes ikke lenger
 * et sted i koden der en tenant-ID kan *settes* — bare et sted der den ble *gitt*.
 * Invarianten er dermed ikke lenger «alle husker å gjøre det riktig», men
 * «det er ikke mulig å gjøre det galt». Det er forskjellen på en regel og en
 * struktur — og det er derfor den er verdt å implementere selv om dagens tre lag
 * holder.
 */
export interface AgentSession {
  readonly agent: string;
  /** Uforanderlig. Ingen setter finnes. */
  readonly tenantId: string;
  readonly userId: string;
  /** Kjører en melding gjennom den bundne agenten. */
  run(messages: ModelMessage[], onEvent: (e: AgentEvent) => void | Promise<void>): Promise<string>;
}

export interface SpawnOptions {
  agent: AgentDefinition;
  context: AgentContext;
  provider: ModelProvider;
  guardrails: GuardrailPipeline;
}

export class TenantBindingError extends Error {
  readonly code = 'TENANT_BINDING_VIOLATION';
  constructor(bound: string, attempted: string) {
    super(`Agenten er bundet til tenant ${bound}, men noe forsøkte å bruke ${attempted}`);
  }
}

export function spawnAgent(options: SpawnOptions): AgentSession {
  const { agent, provider, guardrails } = options;

  // F14: dataregion. Sjekkes først, før noe som helst annet.

  // Agenten erklærer hvilken dataklasse den behandler. Leverandøren erklærer
  // hvilken region den kjører i. Passer de ikke sammen, starter ikke agenten.

  // Dette er grunnen til at regelen ligger her og ikke i en readme: en
  // kunde-support-agent konfigurert mot Fireworks er ikke en bug man retter i
  // neste sprint — det er norske kunders helseopplysninger sendt til usa.
  // Den skal ikke kunne spawnes.
  if (!providerSatisfies(provider, agent.dataClass)) {
    throw new DataRegionViolation(agent.name, agent.dataClass, provider.name, provider.region);
  }

  // 1. Frys konteksten. Etter denne linja finnes det ingen vei til å endre tenant.
  const context = sealContext(options.context);
  const boundTenantId = context.tenantId;

  assertEntitled(agent, context);

  // 2. Bygg verktøyene ÉN gang, med den frosne konteksten. Løkka får dem ferdige
  // og kan ikke be om nye med en annen kontekst.
  const tools: Record<string, Tool> = guardrails.wrapTools(agent.tools(context), context);

  const session: AgentSession = {
    agent: agent.name,
    tenantId: boundTenantId,
    userId: context.userId,

    async run(messages: ModelMessage[], onEvent: (e: AgentEvent) => void | Promise<void>) {
      // 3. Belte og bukseseler: hvis noen senere klarer å muterer konteksten
      // (via `as any`, en JSON-runde, en refaktorering), oppdages det her
      // før et eneste verktøy kjører.
      if (context.tenantId !== boundTenantId) {
        throw new TenantBindingError(boundTenantId, context.tenantId);
      }

      return runAgentWithTools({
        agent,
        context,
        provider,
        guardrails,
        tools,
        messages,
        onEvent,
      });
    },
  };

  // Ingen setter. Ingen vei tilbake. Tenanten er en del av identiteten til
  // denne agent-instansen, ikke en parameter den tar imot per kall.
  return Object.freeze(session);
}
