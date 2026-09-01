import { and, eq, isNull, or, sql, type Database, schema, withTenant } from '@endwise/db';
import { erEnkelEpost } from './resend-avsender.ts';

/**
 * Auth-dest (magic link, invite-mail).
 * Tillatt: eksisterende bruker eller åpen invitee.
 * Ikke `customers.email` — en kundrad verden over er ikke innloggingsrett.
 * Ukjent: stille nei (samme 200, ingen enumerering).
 */
export async function erAuthDestinasjon(db: Database, epost: string): Promise<boolean> {
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
    return Boolean(inv);
  } catch {
    return false;
  }
}

/** @deprecated Bruk `erAuthDestinasjon`. Auth-kanal, ikke varsel-kanal. */
export const erProduktDestinasjon = erAuthDestinasjon;

/**
 * Varsel-dest (toolkit-resend / notify).
 * Tillatt: kjent kunde hos DENNE forhandleren, eller ansatt i samme tenant.
 * Krever tenant-id. Tom tenant = nei. Aldri global `customers.email`.
 */
export async function erTenantDestinasjon(
  db: Database,
  tenantId: string,
  epost: string,
): Promise<boolean> {
  const tenant = tenantId.trim();
  const norm = epost.trim().toLowerCase();
  if (!tenant || !erEnkelEpost(norm)) return false;
  try {
    const [ansatt] = await db
      .select({ id: schema.user.id })
      .from(schema.user)
      .innerJoin(schema.member, eq(schema.member.userId, schema.user.id))
      .where(and(eq(schema.user.email, norm), eq(schema.member.organizationId, tenant)))
      .limit(1);
    if (ansatt) return true;

    const [kunde] = await withTenant(db, tenant, (tx) =>
      tx
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(
          and(
            eq(schema.customers.tenantId, tenant),
            or(eq(schema.customers.email, norm), sql`lower(${schema.customers.email}) = ${norm}`),
          ),
        )
        .limit(1),
    );
    return Boolean(kunde);
  } catch {
    return false;
  }
}
