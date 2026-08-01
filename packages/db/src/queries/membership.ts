import { and, eq } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { member } from '../schema/auth.ts';

/**
 * Medlemskapsoppslag. Bor i @endwise/db (ikke i @endwise/auth) fordi Drizzle
 * skal ha ÉN instans i treet — to kopier gir to inkompatible typeverdener.
 */
export async function findMembership(
  db: Database,
  userId: string,
  organizationId: string,
): Promise<{ role: string } | undefined> {
  const rows = await db
    .select({ role: member.role })
    .from(member)
    .where(and(eq(member.userId, userId), eq(member.organizationId, organizationId)))
    .limit(1);
  return rows[0];
}
