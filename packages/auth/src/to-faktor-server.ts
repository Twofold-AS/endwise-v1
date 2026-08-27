import { type Database, eq, schema, withTenant } from '@endwise/db';
import {
  harUbrukteGjenopprettingskoder,
  TO_FAKTOR_DISABLE_AUDIT_ACTION,
} from './to-faktor-oppsett.ts';

export const TO_FAKTOR_SIGNIN_STI = '/sign-in/email';

/**
 * Etter passord + twoFactorRedirect: finnes det ubrukte backup-koder?
 * Leser `two_factor.backup_codes` — ingen nye felter. Tom liste / ingen rad
 * = innloggingen skal skjule gjenopprettingsvalget (CWE-640, ikke orakel:
 * passordet er allerede bevist).
 */
export async function lesHarUbrukteGjenopprettingskoder(
  db: Database,
  epost: string,
): Promise<boolean> {
  const [rad] = await db
    .select({ backupCodes: schema.twoFactor.backupCodes })
    .from(schema.twoFactor)
    .innerJoin(schema.user, eq(schema.twoFactor.userId, schema.user.id))
    .where(eq(schema.user.email, epost))
    .limit(1);
  return harUbrukteGjenopprettingskoder(rad?.backupCodes);
}

export async function festUbrukteGjenopprettingskoderPaaRedirect(
  ctx: {
    path: string;
    body?: unknown;
    context: { returned?: unknown };
  },
  db: Database,
): Promise<void> {
  if (ctx.path !== TO_FAKTOR_SIGNIN_STI) return;
  const returned = ctx.context.returned;
  if (typeof returned !== 'object' || returned === null) return;
  if ((returned as { twoFactorRedirect?: unknown }).twoFactorRedirect !== true) return;
  const body = ctx.body;
  const epost =
    typeof body === 'object' && body !== null && 'email' in body
      ? (body as { email?: unknown }).email
      : undefined;
  if (typeof epost !== 'string' || !epost.trim()) return;
  const har = await lesHarUbrukteGjenopprettingskoder(db, epost.trim());
  (returned as Record<string, unknown>).harUbrukteGjenopprettingskoder = har;
}

/**
 * Spor i `audit_log` når 2FA slås av.
 * Ingen passord, koder eller tokens i metadata. Tabellen er append-only
 * og leses av flere (F5-05).
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
