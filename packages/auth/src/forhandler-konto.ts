import { randomUUID } from 'node:crypto';
import { and, type Database, eq, isNull, or, schema, sql, withTenant } from '@endwise/db';
import { erEnkelEpost } from './resend-avsender.ts';

/** Opprett user ved bekreftet kode når dest er kjent kunde uten konto. */
export async function opprettBrukerForEpost(
  db: Database,
  epost: string,
  navn = '',
): Promise<string | null> {
  const norm = epost.trim().toLowerCase();
  if (!erEnkelEpost(norm)) return null;
  const [finnes] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, norm))
    .limit(1);
  if (finnes) return finnes.id;
  const id = randomUUID();
  await db.insert(schema.user).values({
    id,
    name: navn.trim() || norm.split('@')[0] || 'Kunde',
    email: norm,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  return id;
}

/** Kobler customers.userId hos tenanten. Flere rader med samme e-post: eldste først. */
export async function knyttKundeUser(
  db: Database,
  tenantId: string,
  userId: string,
  epost: string,
): Promise<string | null> {
  const norm = epost.trim().toLowerCase();
  if (!tenantId || !userId || !erEnkelEpost(norm)) return null;
  return withTenant(db, tenantId, async (tx) => {
    const rader = await tx
      .select({ id: schema.customers.id, userId: schema.customers.userId })
      .from(schema.customers)
      .where(
        and(
          eq(schema.customers.tenantId, tenantId),
          or(eq(schema.customers.email, norm), sql`lower(${schema.customers.email}) = ${norm}`),
        ),
      )
      .orderBy(schema.customers.createdAt);
    const ledig = rader.find((r) => !r.userId) ?? rader.find((r) => r.userId === userId);
    if (!ledig) return null;
    if (ledig.userId === userId) return ledig.id;
    await tx
      .update(schema.customers)
      .set({ userId, updatedAt: new Date() })
      .where(and(eq(schema.customers.id, ledig.id), isNull(schema.customers.userId)));
    return ledig.id;
  });
}

export async function harForhandlerRolle(db: Database, userId: string, tenantId: string) {
  const [m] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(and(eq(schema.member.userId, userId), eq(schema.member.organizationId, tenantId)))
    .limit(1);
  return Boolean(m?.role && (m.role === 'dealer_admin' || m.role === 'dealer_staff'));
}

export async function lesTenantIdFraSlug(db: Database, slug: string): Promise<string | null> {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  try {
    return await db.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.slug_sjekk', ${s}, true)`);
      const [t] = await tx
        .select({ id: schema.tenants.id })
        .from(schema.tenants)
        .where(eq(schema.tenants.slug, s))
        .limit(1);
      return t?.id ?? null;
    });
  } catch {
    return null;
  }
}

/** Ansatt eller Endwise-rolle — krever TOTP. Ikke customer. */
export async function harBedriftRolle(db: Database, userId: string): Promise<boolean> {
  if (!userId) return false;
  const [m] = await db
    .select({ role: schema.member.role })
    .from(schema.member)
    .where(
      and(
        eq(schema.member.userId, userId),
        or(
          eq(schema.member.role, 'dealer_admin'),
          eq(schema.member.role, 'dealer_staff'),
          eq(schema.member.role, 'endwise_admin'),
          eq(schema.member.role, 'endwise_support'),
        ),
      ),
    )
    .limit(1);
  return Boolean(m);
}
