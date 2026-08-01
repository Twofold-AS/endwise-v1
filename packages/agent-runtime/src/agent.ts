import type { ModelRole } from '@endwise/modules';
import type { DataClass } from '@endwise/providers';
import type { Tool } from 'ai';
import type { AgentContext } from './context.ts';

/**
 * Agent = mappe (techstack §2): `agent.ts` + `instructions.md` + `skills/`.
 * Denne typen er kontrakten en slik mappe må oppfylle.
 */
export interface AgentDefinition {
  readonly name: string;
  /** Systeminstruksjonen. Lastes normalt fra `instructions.md`. */
  readonly instructions: string;
  /** Modellrolle, ikke modellnavn. */
  readonly role: ModelRole;
  /**
   * F14 — Hva slags data agenten KAN se.
   *
   * `customer_freetext` binder agenten til en EU-provider (Mistral). Det er ikke
   * en anbefaling — `spawnAgent()` nekter å starte den mot Fireworks.
   *
   * Sett den til `tenant_operational` kun hvis agenten aldri, under noen
   * omstendighet, får sluttkundens egne ord inn i prompten.
   */
  readonly dataClass: DataClass;
  /** Modulen tenanten må ha for å bruke agenten (F0-04). Null = alltid tilgjengelig. */
  readonly requiredModule: string | null;
  /** Maks antall tool-steg før løkka stopper. Circuit breaker. */
  readonly maxSteps: number;
  /** Verktøyene agenten får — bygget MED konteksten, aldri uten. */
  tools(context: AgentContext): Record<string, Tool>;
}

export class EntitlementRequiredError extends Error {
  readonly code = 'AGENT_ENTITLEMENT_REQUIRED';
  constructor(agent: string, module: string) {
    super(`Agenten «${agent}» krever modulen «${module}»`);
  }
}

export function assertEntitled(agent: AgentDefinition, context: AgentContext): void {
  if (!agent.requiredModule) return;
  if (!context.entitlements.includes(agent.requiredModule)) {
    throw new EntitlementRequiredError(agent.name, agent.requiredModule);
  }
}
