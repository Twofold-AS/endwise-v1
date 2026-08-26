import { and, lt, or, sql } from 'drizzle-orm';
import type { Database } from '../client.ts';
import { session } from '../schema/auth.ts';

/**
 * Sesjonsspørringer. Bor her av samme grunn som `membership.ts`: Drizzle skal ha
 * ÉN instans i treet.
 * Ingen av disse går gjennom `withTenant`. Det er med vilje
 * Better-Auth-tabellene har bevisst ingen RLS (se `schema/auth.ts`): de er
 * globale identiteter, og innloggingen skjer før noen forhandler er valgt.
 * Grensen her er at spørringene alltid er bundet til en `userId` som kommer fra
 * en verifisert sesjon, aldri fra klienten.
 */

/**
 * Sletter sesjoner som uansett er døde: utløpt idle-vindu eller passert absolutt
 * maks-levetid (F1-12).
 * Dette er opprydding, ikke en sikkerhetsmekanisme. En utløpt rad gir ingen
 * tilgang — `requireSession` avviser den lenge før den slettes. Poenget er at
 * tabellen ikke skal vokse i det uendelige med rader ingen kan bruke.
 * `absoluteExpiresAt` er nullbar på eldre rader. `or(...)` dekker begge:
 * er den satt og passert, eller er `expiresAt` passert, er raden død.
 */
export async function purgeExpiredSessions(db: Database, now: Date = new Date()): Promise<number> {
  const rows = await db
    .delete(session)
    .where(
      or(
        lt(session.expiresAt, now),
        and(sql`${session.absoluteExpiresAt} is not null`, lt(session.absoluteExpiresAt, now)),
      ),
    )
    .returning({ id: session.id });
  return rows.length;
}

/** Antall sesjoner totalt / utløpte. Kun til rapportering i cleanup-jobben. */
export async function countSessions(
  db: Database,
  now: Date = new Date(),
): Promise<{ totalt: number; utlopte: number }> {
  const [row] = await db
    .select({
      totalt: sql<number>`count(*)::int`,
      utlopte: sql<number>`count(*) filter (where ${session.expiresAt} < ${now})::int`,
    })
    .from(session);
  return row ?? { totalt: 0, utlopte: 0 };
}
