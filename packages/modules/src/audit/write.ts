import { type Database, schema, withTenant } from '@endwise/db';

/** Felter som aldri skal inn i AI-audit — det er promptinnhold. */
const BANNED_METADATA_KEYS = new Set([
  'prompt',
  'message',
  'messages',
  'text',
  'content',
  'reply',
  'input',
  'output',
  'body',
]);

export interface AiAuditInput {
  tenantId: string;
  actor: string;
  action: string;
  subjectType?: string;
  subjectId?: string | null;
  metadata?: Record<string, unknown>;
}

export function scrubAiAuditMetadata(
  metadata: Record<string, unknown> = {},
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(metadata)) {
    if (BANNED_METADATA_KEYS.has(key.toLowerCase())) continue;
    out[key] = value;
  }
  return out;
}

/**
 * AI-audit uten promptinnhold (F14 / F0-14).
 * Logger at noe skjedde — agent, utfall, kategori — aldri hva brukeren skrev.
 */
export async function writeAiAudit(db: Database, input: AiAuditInput): Promise<void> {
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
}
