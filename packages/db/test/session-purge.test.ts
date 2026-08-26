import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  countSessions,
  createDb,
  type Database,
  eq,
  purgeExpiredSessions,
  schema,
} from '../src/index.ts';

/**
 * F1-11/F1-12 — opprydding av døde sesjonsrader.
 * Testen som betyr noe er den siste: at en levende sesjon overlever.
 * En «opprydding» som logger ut folk midt i arbeidsdagen er et driftsavbrudd,
 * ikke vedlikehold — og det er den feilen som er lett å skrive.
 */
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

describeDb('sesjons-opprydding', () => {
  let db: Database;
  const bruker = randomUUID();
  const levende = randomUUID();
  const utlopt = randomUUID();
  const absoluttUte = randomUUID();

  beforeAll(async () => {
    db = createDb(OWNER_URL as string);
    const naa = Date.now();

    await db.insert(schema.user).values({
      id: bruker,
      name: 'Purge',
      email: `purge-${bruker.slice(0, 8)}@test.local`,
      emailVerified: true,
    });

    await db.insert(schema.session).values([
      {
        id: levende,
        token: `t-${levende}`,
        userId: bruker,
        createdAt: new Date(naa),
        updatedAt: new Date(naa),
        expiresAt: new Date(naa + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(naa + 12 * 60 * 60 * 1000),
      },
      {
        // Idle-vinduet er ute.
        id: utlopt,
        token: `t-${utlopt}`,
        userId: bruker,
        createdAt: new Date(naa - 3 * 60 * 60 * 1000),
        updatedAt: new Date(naa - 3 * 60 * 60 * 1000),
        expiresAt: new Date(naa - 60 * 1000),
        absoluteExpiresAt: new Date(naa + 9 * 60 * 60 * 1000),
      },
      {
        // Idle-vinduet ser friskt ut, men absolutt maks-levetid er passert.
        // Uten `or(...)` i spørringen ville denne blitt liggende for alltid.
        id: absoluttUte,
        token: `t-${absoluttUte}`,
        userId: bruker,
        createdAt: new Date(naa - 20 * 60 * 60 * 1000),
        updatedAt: new Date(naa),
        expiresAt: new Date(naa + 60 * 60 * 1000),
        absoluteExpiresAt: new Date(naa - 60 * 1000),
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(schema.session).where(eq(schema.session.userId, bruker));
    await db.delete(schema.user).where(eq(schema.user.id, bruker));
  });

  it('teller sesjoner uten å endre noe', async () => {
    const for_ = await countSessions(db);
    expect(for_.totalt).toBeGreaterThanOrEqual(3);
    expect(for_.utlopte).toBeGreaterThanOrEqual(1);
  });

  it('sletter utløpte OG de som har passert absolutt maks-levetid', async () => {
    const slettet = await purgeExpiredSessions(db);
    expect(slettet).toBeGreaterThanOrEqual(2);

    const igjen = await db
      .select({ id: schema.session.id })
      .from(schema.session)
      .where(eq(schema.session.userId, bruker));
    const ider = igjen.map((r) => r.id);

    expect(ider).not.toContain(utlopt);
    expect(ider).not.toContain(absoluttUte);
  });

  it('⛔ rører ALDRI en levende sesjon', async () => {
    await purgeExpiredSessions(db);
    const igjen = await db
      .select({ id: schema.session.id })
      .from(schema.session)
      .where(eq(schema.session.userId, bruker));
    expect(igjen.map((r) => r.id)).toEqual([levende]);
  });
});
