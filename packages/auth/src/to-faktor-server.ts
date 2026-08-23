import { type Database, eq, schema, withTenant } from '@endwise/db';
import { TO_FAKTOR_DISABLE_AUDIT_ACTION } from './to-faktor-oppsett.ts';

/**
 * F1-22 — spor i `audit_log` når 2FA slås av.
 *
 * ⛔ Ingen passord, koder eller tokens i metadata. Tabellen er append-only
 * og leses av flere (F5-05).
 *
 * En bruker kan høre til flere forhandlere. Vi skriver én rad per
 * medlemskap — det er den forhandleren som har krav på å se at personen
 * slokket 2FA, ikke en tilfeldig «aktiv» tenant.
 */
export async function skriv2faDisableAudit(db: Database, userId: string): Promise<number> {
  const medlemskap = await db
    .select({ tenantId: schema.member.organizationId })
    .from(schema.member)
    .where(eq(schema.member.userId, userId));

  let skrevet = 0;
  for (const rad of medlemskap) {
    await withTenant(db, rad.tenantId, async (tx) => {
      await tx.insert(schema.auditLog).values({
        tenantId: rad.tenantId,
        actor: userId,
        action: TO_FAKTOR_DISABLE_AUDIT_ACTION,
        subjectType: 'user',
        subjectId: userId,
        metadata: {},
      });
    });
    skrevet += 1;
  }
  return skrevet;
}
