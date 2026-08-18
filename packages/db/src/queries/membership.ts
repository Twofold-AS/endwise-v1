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

/**
 * F1-11 — ALLE roller brukeren har, på tvers av forhandlere.
 *
 * ⚠️ Hvorfor «alle» og ikke bare rollen i den aktive forhandleren: en bruker kan
 * være `customer` hos verksted A og `dealer_admin` hos verksted B. Sjekker vi
 * bare den aktive, kan hen logge inn uten 2FA med A som aktiv, og deretter bytte
 * til B. 2FA-kravet henger på PERSONEN, ikke på hvilken fane som er åpen.
 */
export async function findRolesForUser(db: Database, userId: string): Promise<string[]> {
  const rows = await db.select({ role: member.role }).from(member).where(eq(member.userId, userId));
  return [...new Set(rows.map((r) => r.role))];
}
