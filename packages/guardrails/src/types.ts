import type { ModelMessage, Tool } from 'ai';

/** Minimum agent-runtimen trenger å vite. Guardrails kjenner ikke DB-en. */
export interface GuardContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly role: string;
}

export interface GuardrailPipeline {
  filterInput(messages: ModelMessage[], context: GuardContext): Promise<ModelMessage[]>;
  wrapTools(tools: Record<string, Tool>, context: GuardContext): Record<string, Tool>;
  filterOutput(text: string, context: GuardContext): Promise<string>;
}

export class GuardrailViolation extends Error {
  readonly code = 'GUARDRAIL_VIOLATION';
  // Eksplisitt felt + tilordning (ikke TS parameter property) — Node strip-only
  // (--experimental-strip-types) støtter ikke parameter properties.
  readonly level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5';
  constructor(level: 'L1' | 'L2' | 'L3' | 'L4' | 'L5', message: string) {
    super(`[${level}] ${message}`);
    this.level = level;
  }
}
