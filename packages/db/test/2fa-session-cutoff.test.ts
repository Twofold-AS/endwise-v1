import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database, eq, schema, sql } from '../src/index.ts';

/**
 * F1-11 — **ANGREPSTEST: en pre-2FA-sesjon skal ALDRI overleve påslaget.**
 *
 * ⚠️ Testen kjører bevisst mot RÅ SQL, ikke gjennom applikasjonen. Kravet er
 * «uansett hvordan 2FA ble slått på — også direkte i basen», og en test som går
 * via appen ville aldri bevist det. Her er `UPDATE "user" SET
 * two_factor_enabled = true` selve angrepet.
 *
 * Sperren er en databasetrigger (`0010_2fa_session_cutoff.sql`), fordi det er
 * det eneste laget som ser alle veier inn.
 */
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

describeDb('F1-11: 2FA-påslag river pre-2FA-sesjoner', () => {
  let db: Database;
  const bruker = randomUUID();
  const annenBruker = randomUUID();

  const lagSesjon = async (userId: string, id: string) => {
    const naa = Date.now();
    await db.insert(schema.session).values({
      id,
      token: `t-${id}`,
      userId,
      createdAt: new Date(naa),
      updatedAt: new Date(naa),
      expiresAt: new Date(naa + 60 * 60 * 1000),
      absoluteExpiresAt: new Date(naa + 12 * 60 * 60 * 1000),
    });
  };

  const sesjoner = async (userId: string) =>
    (
      await db
        .select({ id: schema.session.id })
        .from(schema.session)
        .where(eq(schema.session.userId, userId))
    ).map((r) => r.id);

  beforeAll(async () => {
    db = createDb(OWNER_URL as string);
    await db.insert(schema.user).values(
      [bruker, annenBruker].map((id) => ({
        id,
        name: `C-${id.slice(0, 4)}`,
        email: `cut-${id.slice(0, 8)}@test.local`,
        emailVerified: true,
        twoFactorEnabled: false,
      })),
    );
  });

  afterAll(async () => {
    for (const id of [bruker, annenBruker]) {
      await db.delete(schema.session).where(eq(schema.session.userId, id));
      await db.delete(schema.user).where(eq(schema.user.id, id));
    }
  });

  it('⛔ ANGREP: rått UPDATE i basen river alle pre-2FA-sesjoner', async () => {
    const gammelA = randomUUID();
    const gammelB = randomUUID();
    await lagSesjon(bruker, gammelA);
    await lagSesjon(bruker, gammelB);
    expect(await sesjoner(bruker)).toHaveLength(2);

    // Selve angrepet: 2FA slås på UTENOM oppsettflaten, uten at én linje
    // applikasjonskode kjører.
    await db.execute(sql`update "user" set two_factor_enabled = true where id = ${bruker}`);

    expect(await sesjoner(bruker)).toEqual([]);
  });

  it('en sesjon opprettet ETTER påslaget overlever', async () => {
    const ny = randomUUID();
    await lagSesjon(bruker, ny);
    expect(await sesjoner(bruker)).toEqual([ny]);
  });

  /**
   * ⚠️ Den viktigste negative testen. Uten `OLD.two_factor_enabled IS DISTINCT
   * FROM TRUE` i triggeren ville ENHVER oppdatering av en 2FA-bruker logget
   * vedkommende ut — navnebytte, e-postverifisering, Better-Auths egne
   * felt-oppdateringer. Det er et driftsavbrudd, ikke en sikring.
   */
  it('⛔ rører IKKE sesjoner ved en urelatert oppdatering av brukeren', async () => {
    const fra_for = await sesjoner(bruker);
    expect(fra_for.length).toBeGreaterThan(0);

    await db.update(schema.user).set({ name: 'Nytt Navn' }).where(eq(schema.user.id, bruker));

    expect(await sesjoner(bruker)).toEqual(fra_for);
  });

  it('⛔ rører IKKE sesjoner når 2FA settes til true på nytt (allerede true)', async () => {
    const fra_for = await sesjoner(bruker);
    await db.execute(sql`update "user" set two_factor_enabled = true where id = ${bruker}`);
    expect(await sesjoner(bruker)).toEqual(fra_for);
  });

  it('⛔ rører ALDRI en ANNEN brukers sesjoner', async () => {
    const annen = randomUUID();
    await lagSesjon(annenBruker, annen);

    // Slå 2FA av og på igjen for den første brukeren.
    await db.execute(sql`update "user" set two_factor_enabled = false where id = ${bruker}`);
    await db.execute(sql`update "user" set two_factor_enabled = true where id = ${bruker}`);

    expect(await sesjoner(annenBruker)).toEqual([annen]);
  });
});
