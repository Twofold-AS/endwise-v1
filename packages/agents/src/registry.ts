import type { AgentDefinition } from '@endwise/agent-runtime';
import { aiDiagnoseAgent } from './ai-diagnose/agent.ts';
import { driftInnsiktAgent } from './drift-innsikt/agent.ts';
import { kundeSupportAgent } from './kunde-support/agent.ts';
import { workshopAgent } from './workshop/agent.ts';

/**
 * Agent-registeret. «Agent = mappe» (techstack §2).
 * Legg merke til `dataClass` på hver agent — den avgjør hvilken leverandør
 * agenten kan kjøre på (F14). Det er ikke en kommentar; `spawnAgent` nekter å
 * starte en `customer_freetext`-agent mot en ikke-EU-leverandør.
 */
const AGENTS: Record<string, AgentDefinition> = {
  [kundeSupportAgent.name]: kundeSupportAgent,
  [driftInnsiktAgent.name]: driftInnsiktAgent,
  // Første agent på chat-flaten (F6-18). customer_freetext ⇒ Mistral EU.
  [aiDiagnoseAgent.name]: aiDiagnoseAgent,
  [workshopAgent.name]: workshopAgent,
};

export class UnknownAgentError extends Error {
  readonly code = 'UNKNOWN_AGENT';
  constructor(name: string) {
    super(`Ukjent agent: ${name}`);
  }
}

export function getAgent(name: string): AgentDefinition {
  const agent = AGENTS[name];
  if (!agent) throw new UnknownAgentError(name);
  return agent;
}

export function listAgents(): AgentDefinition[] {
  return Object.values(AGENTS);
}
