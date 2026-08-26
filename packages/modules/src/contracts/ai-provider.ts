/**
 * AIProvider (tynt lag for latency-sensitive enkeltkall).
 * Modeller velges aldri hardkodet: kaller oppgir en rolle, og modellkatalogen
 * (packages/providers) mapper tenant/plan + rolle -> modell.
 */
export type ModelRole = 'fast' | 'standard' | 'hard' | 'embed' | 'realtime';

export interface CompletionRequest {
  tenantId: string;
  role: ModelRole;
  system?: string;
  prompt: string;
  maxOutputTokens?: number;
}

export interface CompletionResult {
  text: string;
  modelId: string;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface EmbedRequest {
  tenantId: string;
  input: string[];
}

export interface EmbedResult {
  vectors: number[][];
  modelId: string;
}

export interface AIProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<CompletionResult>;
  embed(request: EmbedRequest): Promise<EmbedResult>;
}
