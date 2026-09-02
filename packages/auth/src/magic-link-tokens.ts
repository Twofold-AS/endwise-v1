import { createDb, type Database, inArray, schema } from '@endwise/db';
import { authEnv } from './env.ts';
import { erMagicLinkForEpost, erMagicLinkVerificationRad } from './magic-link.ts';

let hookDb: Database | undefined;

function dbForHook(db?: Database): Database {
  if (db) return db;
  hookDb ??= createDb(authEnv.databaseUrl);
  return hookDb;
}

/**
 * Bare den nyeste, ubrukte magic-lenken skal gjelde.
 * Better-Auth lager en ny verification-rad per send — uten denne slettingen
 * lever link 1 videre når link 2 er sendt.
 */
export async function slettEldreMagicLinkTokens(epost: string, db?: Database): Promise<number> {
  const trimmet = epost.trim();
  if (!trimmet) return 0;
  const instans = dbForHook(db);
  const rader = await instans
    .select({
      id: schema.verification.id,
      identifier: schema.verification.identifier,
      value: schema.verification.value,
    })
    .from(schema.verification);
  const ids = rader
    .filter(
      (rad) =>
        erMagicLinkVerificationRad(rad.identifier, rad.value) &&
        erMagicLinkForEpost(rad.value, trimmet),
    )
    .map((rad) => rad.id);
  if (ids.length === 0) return 0;
  await instans.delete(schema.verification).where(inArray(schema.verification.id, ids));
  return ids.length;
}
