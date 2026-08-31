import { and, type Database, eq, inArray, schema } from '@endwise/db';
import { type BloubFargeId, erBloubFarge, nesteFarge } from './farge.ts';

/**
 * Neste ledige palettfarge blant medlemmene i tenanten.
 * `user_preferences` har ingen RLS — isolasjonen er at vi bare leser IDer som
 * allerede er tenant-skopet via `member`.
 */
export async function brukteFargerITenant(db: Database, tenantId: string): Promise<string[]> {
  const medlemmer = await db
    .select({ userId: schema.member.userId })
    .from(schema.member)
    .where(eq(schema.member.organizationId, tenantId));
  const ider = medlemmer.map((m) => m.userId);
  if (ider.length === 0) return [];
  const rader = await db
    .select({
      userId: schema.userPreferences.userId,
      avatarColor: schema.userPreferences.avatarColor,
    })
    .from(schema.userPreferences)
    .where(inArray(schema.userPreferences.userId, ider));
  return rader.map((r) => r.avatarColor).filter((f): f is string => Boolean(f));
}

/**
 * Persisterer én ColorId på brukeren. Har hen allerede en gyldig, beholdes den.
 * Kall ved invite, seed, lokal opprett og self-signup — ikke fra en leserute.
 */
export async function tildelAnsattFarge(
  db: Database,
  tenantId: string,
  userId: string,
): Promise<BloubFargeId> {
  const [pref] = await db
    .select({ avatarColor: schema.userPreferences.avatarColor })
    .from(schema.userPreferences)
    .where(eq(schema.userPreferences.userId, userId));
  if (erBloubFarge(pref?.avatarColor)) return pref.avatarColor;

  const brukt = await brukteFargerITenant(db, tenantId);
  const farge = nesteFarge(brukt);
  await db
    .insert(schema.userPreferences)
    .values({ userId, avatarColor: farge })
    .onConflictDoUpdate({
      target: schema.userPreferences.userId,
      set: { avatarColor: farge, updatedAt: new Date() },
    });
  return farge;
}

export async function settAnsattFarge(
  db: Database,
  userId: string,
  farge: BloubFargeId,
): Promise<BloubFargeId> {
  await db
    .insert(schema.userPreferences)
    .values({ userId, avatarColor: farge })
    .onConflictDoUpdate({
      target: schema.userPreferences.userId,
      set: { avatarColor: farge, updatedAt: new Date() },
    });
  return farge;
}

/** Medlemskap i *denne* tenanten. Samme sperre som `team.setFunction`. */
export async function assertMedlemAvTenant(
  db: Database,
  tenantId: string,
  userId: string,
): Promise<boolean> {
  const [rad] = await db
    .select({ userId: schema.member.userId })
    .from(schema.member)
    .where(and(eq(schema.member.organizationId, tenantId), eq(schema.member.userId, userId)));
  return Boolean(rad);
}
