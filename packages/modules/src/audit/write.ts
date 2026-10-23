import { type Database, schema, withTenant } from '@endwise/db';

/**
 * Rekursiv allowlist for AI-audit-metadata.
 * Alt som ikke står her — også nestet — er promptinnhold eller støy.
 */
const ALLOWED_METADATA_KEYS = new Set([
  'agent',
  'triggered',
  'allowed',
  'level',
  'code',
  'source',
  'failed',
  'event',
  'tool',
]);

export interface AiAuditInput {
  tenantId: string;
  actor: string;
  action: string;
  subjectType?: string;
  subjectId?: string | null;
  metadata?: Record<string, unknown>;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function scrubValue(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(scrubValue).filter((item) => item !== undefined);
  }
  if (!isPlainObject(value)) return undefined;

  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value)) {
    if (!ALLOWED_METADATA_KEYS.has(key.toLowerCase())) continue;
    const cleaned = scrubValue(nested);
    if (cleaned !== undefined) out[key] = cleaned;
  }
  return out;
}

export function scrubAiAuditMetadata(
  metadata: Record<string, unknown> = {},
): Record<string, unknown> {
  const scrubbed = scrubValue(metadata);
  return isPlainObject(scrubbed) ? scrubbed : {};
}

/**
 * AI-audit uten promptinnhold (F14 / F0-14).
 * Logger at noe skjedde — agent, utfall, kategori — aldri hva brukeren skrev.
 * Feiler synlig i loggen, ikke stille: en audit som svelges er ingen audit.
 */
export async function writeAiAudit(db: Database, input: AiAuditInput): Promise<void> {
  try {
    await withTenant(db, input.tenantId, (tx) =>
      tx.insert(schema.auditLog).values({
        tenantId: input.tenantId,
        actor: input.actor,
        action: input.action,
        subjectType: input.subjectType ?? 'ai',
        subjectId: input.subjectId ?? null,
        metadata: scrubAiAuditMetadata(input.metadata),
      }),
    );
  } catch (error) {
    console.error(
      `[ai-audit] skriving feilet action=${input.action} subject=${input.subjectType ?? 'ai'}`,
    );
    if (error instanceof Error) {
      console.error(`[ai-audit] ${error.name}`);
    }
  }
}
