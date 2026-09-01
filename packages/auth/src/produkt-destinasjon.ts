import { and, eq, isNull, or, sql, type Database, schema } from '@endwise/db';
import { erEnkelEpost } from './resend-avsender.ts';

/**
 * CWE-770 — Resend fyrer bare mot produkt-destinasjoner.
 * Tillatt: eksisterende bruker, åpen invitee, eller kjent kundeadresse.
 * Klientens `email` er ikke en destinasjon.
 * Ukjent adresse: stille nei (samme 200, ingen enumerering).
 */
export async function erProduktDestinasjon(db: Database, epost: string): Promise<boolean> {
  const norm = epost.trim().toLowerCase();
  if (!erEnkelEpost(norm)) return false;
  try {
    const [bruker] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .where(eq(schema.user.email, norm))
      .limit(1);
    if (bruker) return true;

    const [ba] = await db
      .select({ id: schema.invitation.id })
      .from(schema.invitation)
      .where(and(eq(schema.invitation.email, norm), eq(schema.invitation.status, 'pending')))
      .limit(1);
    if (ba) return true;

    const [inv] = await db
      .select({ id: schema.invitations.id })
      .from(schema.invitations)
      .where(
        and(
          eq(schema.invitations.email, norm),
          isNull(schema.invitations.acceptedAt),
          isNull(schema.invitations.revokedAt),
        ),
      )
      .limit(1);
    if (inv) return true;

    const [kunde] = await db
      .select({ id: schema.customers.id })
      .from(schema.customers)
      .where(or(eq(schema.customers.email, norm), sql`lower(${schema.customers.email}) = ${norm}`))
      .limit(1);
    return Boolean(kunde);
  } catch {
    return false;
  }
}
