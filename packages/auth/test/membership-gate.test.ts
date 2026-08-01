import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { assertMember, TenantAccessError } from '../src/tenant.ts';

/**
 * F1-04/F1-05 — Medlemskaps-gaten kan IKKE omgås server-side.
 *
 * tRPC-context setter kun tenant/rolle etter assertMember. Denne testen viser at
 * en bruker som IKKE er medlem av en tenant får `TenantAccessError` — uansett
 * hvilken tenant-ID de oppgir. Det er dette som gjør at en mekaniker/ansatt i A
 * ikke kan «claime» B (RLS beskytter mot lekkasje, assertMember mot løgn).
 *
 * Skippes uten DB — kjør mot Docker.
 */
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

describeDb('F1-05: medlemskaps-gate', () => {
  let owner: Database;
  const orgA = randomUUID();
  const orgB = randomUUID();
  const userU = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const now = new Date();
    await owner.insert(schema.user).values({
      id: userU,
      name: 'U',
      email: `u-${userU.slice(0, 8)}@test.local`,
      emailVerified: true,
    });
    await owner.insert(schema.organization).values([
      { id: orgA, name: 'A', slug: `a-${orgA.slice(0, 8)}`, createdAt: now },
      { id: orgB, name: 'B', slug: `b-${orgB.slice(0, 8)}`, createdAt: now },
    ]);
    // U er medlem KUN av A, som dealer_staff.
    await owner.insert(schema.member).values({
      id: randomUUID(),
      organizationId: orgA,
      userId: userU,
      role: 'dealer_staff',
      createdAt: now,
    });
  });

  afterAll(async () => {
    await owner.delete(schema.member).where(sql`user_id = ${userU}`);
    await owner.delete(schema.organization).where(sql`id in (${orgA}, ${orgB})`);
    await owner.delete(schema.user).where(sql`id = ${userU}`);
  });

  it('medlem av A får sin rolle', async () => {
    expect(await assertMember(owner, userU, orgA)).toBe('dealer_staff');
  });

  it('ANGREP: U kan ikke claime B (ikke medlem) → TenantAccessError', async () => {
    await expect(assertMember(owner, userU, orgB)).rejects.toBeInstanceOf(TenantAccessError);
  });
});
