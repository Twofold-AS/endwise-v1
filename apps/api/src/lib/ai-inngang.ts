import { type Database, desc, schema, withTenant } from '@endwise/db';
import {
  type GuardContext,
  type Moderator,
  type Pseudonymizer,
  prepareModelMessages,
  type ScopeGateResult,
} from '@endwise/guardrails';
import { writeAiAudit } from '@endwise/modules/audit';
import { createMistralModerator } from '@endwise/providers';
import type { ModelMessage } from 'ai';

export const AI_HANDOVER_NO = 'Meldingen ble stoppet. En medarbeider må ta over samtalen.';

export const MAX_KJENTE_NAVN = 200;
export const KJENTE_NAVN_CACHE_TTL_MS = 5 * 60_000;

type NavnCacheEntry = { names: string[]; expiresAt: number };
const kjenteNavnCache = new Map<string, NavnCacheEntry>();

export function toemKjenteNavnCache(): void {
  kjenteNavnCache.clear();
}

export function lesKjenteNavnCache(tenantId: string, now = Date.now()): string[] | null {
  const hit = kjenteNavnCache.get(tenantId);
  if (!hit) return null;
  if (now >= hit.expiresAt) {
    kjenteNavnCache.delete(tenantId);
    return null;
  }
  return hit.names;
}

export function skrivKjenteNavnCache(tenantId: string, names: string[], now = Date.now()): void {
  kjenteNavnCache.set(tenantId, { names, expiresAt: now + KJENTE_NAVN_CACHE_TTL_MS });
  if (kjenteNavnCache.size <= 200) return;
  const eldst = [...kjenteNavnCache.entries()].sort((a, b) => a[1].expiresAt - b[1].expiresAt)[0];
  if (eldst) kjenteNavnCache.delete(eldst[0]);
}

export function createConfiguredModerator(): Moderator | undefined {
  return process.env.MISTRAL_API_KEY ? createMistralModerator() : undefined;
}

/** Kundenavn fra tenant — til [NAVN_n] før prompt og i verktøyresultater. */
export async function hentKjenteKundenavn(
  db: Database,
  tenantId: string,
  options?: { cache?: boolean },
): Promise<string[]> {
  if (options?.cache) {
    const cached = lesKjenteNavnCache(tenantId);
    if (cached) return cached;
  }

  const rader = await withTenant(db, tenantId, (tx) =>
    tx
      .select({ navn: schema.customers.name })
      .from(schema.customers)
      .orderBy(desc(schema.customers.updatedAt), desc(schema.customers.createdAt))
      .limit(MAX_KJENTE_NAVN),
  ).catch((error) => {
    console.error('[ai-inngang] hentKjenteKundenavn feilet');
    if (error instanceof Error) console.error(`[ai-inngang] ${error.name}`);
    return [] as Array<{ navn: string | null }>;
  });
  const names = rader.map((rad) => rad.navn?.trim() ?? '').filter((navn) => navn.length >= 2);
  if (options?.cache) skrivKjenteNavnCache(tenantId, names);
  return names;
}

export async function forberedAiMeldinger(options: {
  db: Database;
  messages: ModelMessage[];
  context: GuardContext;
  agent: string;
  knownNames?: readonly string[];
  pseudonymizer?: Pseudonymizer;
  /** Widget: ikke treff DB på hver melding. */
  cacheKnownNames?: boolean;
}): Promise<{ messages: ModelMessage[]; pseudonymizer: Pseudonymizer; knownNames: string[] }> {
  const knownNames = options.knownNames
    ? [...options.knownNames]
    : await hentKjenteKundenavn(options.db, options.context.tenantId, {
        cache: options.cacheKnownNames === true,
      });
  const moderate = createConfiguredModerator();
  const prepared = await prepareModelMessages({
    messages: options.messages,
    context: options.context,
    knownNames,
    pseudonymizer: options.pseudonymizer,
    moderate,
    mode: moderate ? 'escalate' : 'audit',
    onTrigger: (result: ScopeGateResult) => {
      void writeAiAudit(options.db, {
        tenantId: options.context.tenantId,
        actor: options.context.userId,
        action: 'ai.scope_gate',
        subjectType: 'agent',
        subjectId: options.agent,
        metadata: { triggered: result.triggered, allowed: result.allowed },
      });
    },
  });
  return { ...prepared, knownNames };
}
