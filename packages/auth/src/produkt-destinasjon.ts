import { type Database, eq, schema } from '@endwise/db';
import { erEnkelEpost } from './resend-avsender.ts';

/**
 * CWE-770 — Resend fyrer bare mot produkt-destinasjoner.
 * Klientens `email` i magic-link er ikke en adresse vi stoler på.
 * Ukjent adresse: stille nei (samme 200, ingen enumerering).
 */
export async function erProduktDestinasjon(db: Database, epost: string): Promise<boolean> {
  const norm = epost.trim().toLowerCase();
  if (!erEnkelEpost(norm)) return false;
  const [rad] = await db
    .select({ id: schema.user.id })
    .from(schema.user)
    .where(eq(schema.user.email, norm))
    .limit(1);
  return Boolean(rad);
}
