import { type Database, sql, withTenant } from '@endwise/db';
import { prunableRules, type RetentionRule } from './policy.ts';

export interface PruneResult {
  table: string;
  deleted: number;
  days: number;
}

/**
 * Automatisk sletting. Kjøres av Vercel Cron (F0-13).
 * Går gjennom `withTenant` — altså RLS. Ryddingen kan ikke, ved en feil, slette
 * en annen forhandlers data. Cron-jobben itererer over tenants; den har ingen
 * global slette-tilgang.
 * `audit_log` er bevisst ute av denne løkka: den redakteres, den slettes ikke
 * (mode: 'redact'). Se `erasure/`.
 */
export async function pruneExpired(db: Database, tenantId: string): Promise<PruneResult[]> {
  const results: PruneResult[] = [];

  for (const rule of prunableRules()) {
    if (rule.mode !== 'delete') continue;

    const deleted = await withTenant(db, tenantId, async (tx) => {
      const result = await tx.execute(
        sql`delete from ${sql.identifier(rule.table)}
            where ${sql.identifier(rule.timestampColumn)} < now() - ${rule.days} * interval '1 day'`,
      );
      return result.rowCount ?? 0;
    });

    results.push({ table: rule.table, deleted, days: rule.days });
  }

  return results;
}

/** Aldersgrensen for en tabell, som dato. Til bruk i rapporter. */
export function cutoffFor(rule: RetentionRule, now = new Date()): Date {
  return new Date(now.getTime() - rule.days * 86_400_000);
}
