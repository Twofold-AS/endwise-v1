import { and, type Database, eq, schema } from '@endwise/db';
import { hashPassword } from 'better-auth/crypto';

/**
 * F5-26 — sett/bytt passord uten gjeldende passord.
 *
 * Better-Auth `changePassword` krever det gamle. Eier-invitasjonen er
 * beviset (samme som F1-10 for ny konto): den som har tokenet eier
 * e-posten. Admin ser aldri passordet.
 *
 * ⛔ Ingen sesjon deles ut her. Invitee logger inn etterpå og møter 2FA.
 */
export async function settPassordUtenSesjon(
  db: Database,
  userId: string,
  passord: string,
): Promise<void> {
  const hash = await hashPassword(passord);
  const [konto] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, 'credential')))
    .limit(1);

  if (konto) {
    await db
      .update(schema.account)
      .set({ password: hash, updatedAt: new Date() })
      .where(eq(schema.account.id, konto.id));
  } else {
    await db.insert(schema.account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hash,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  await db.delete(schema.session).where(eq(schema.session.userId, userId));
}
