import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { createInvitasjonsmodul } from '@endwise/modules/invitasjoner';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { handleHono } from '../src/http/hono.ts';

/**
 * Prod 28.08.2026: mekaniker opprettet via Opprett ansatt / invite
 * sto uten credential-konto. Sign-in ga
 * «Credential account not found». Godta må lage passordkonto
 * når brukeren allerede finnes uten en.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F1-10 — staff-invite lager credential for eksisterende bruker', () => {
  let owner: Database;
  const tenantId = randomUUID();
  const lederId = `leder-${tenantId.slice(0, 8)}`;
  const ansattId = `mek-${tenantId.slice(0, 8)}`;
  const epost = `mek.${tenantId.slice(0, 8)}@verksted.test`;

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    await owner.insert(schema.tenants).values({
      id: tenantId,
      name: 'Credential-verksted',
      slug: `cred-${tenantId.slice(0, 8)}`,
    });
    await owner.insert(schema.organization).values({
      id: tenantId,
      name: 'Credential-verksted',
      slug: `cred-${tenantId.slice(0, 8)}`,
      createdAt: new Date(),
    });
    await owner.insert(schema.user).values([
      { id: lederId, name: 'Leder', email: `${lederId}@test.invalid`, emailVerified: true },
      { id: ansattId, name: 'Per Tang', email: epost, emailVerified: false },
    ]);
    await owner.insert(schema.member).values({
      id: randomUUID(),
      organizationId: tenantId,
      userId: lederId,
      role: 'dealer_admin',
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    await owner.delete(schema.invitations).where(eq(schema.invitations.tenantId, tenantId));
    await owner.delete(schema.memberProfiles).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.member).where(sql`organization_id = ${tenantId}`);
    await owner.delete(schema.account).where(sql`user_id in (${lederId}, ${ansattId})`);
    await owner.delete(schema.session).where(sql`user_id in (${lederId}, ${ansattId})`);
    await owner.delete(schema.user).where(sql`id in (${lederId}, ${ansattId})`);
    await owner.delete(schema.organization).where(eq(schema.organization.id, tenantId));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it('GET krever ikke passord, godta oppretter uten credential-hash', async () => {
    const [kontoFor] = await owner
      .select({ id: schema.account.id })
      .from(schema.account)
      .where(eq(schema.account.userId, ansattId));
    expect(kontoFor).toBeUndefined();

    const modul = createInvitasjonsmodul(owner);
    const { token } = await modul.opprett({
      tenantId,
      epost,
      funksjon: 'mekaniker',
      invitedBy: lederId,
    });

    const peek = await handleHono(
      new Request(`http://endwise.test/invitasjoner/${encodeURIComponent(token)}`),
    );
    expect(peek.status).toBe(200);
    const peekBody = (await peek.json()) as {
      gyldig: boolean;
      harKonto: boolean;
      kreverPassord: boolean;
    };
    expect(peekBody.gyldig).toBe(true);
    expect(peekBody.harKonto).toBe(true);
    expect(peekBody.kreverPassord).toBe(false);

    const godta = await handleHono(
      new Request('http://endwise.test/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          token,
          navn: 'Per Tang',
        }),
      }),
    );
    const body = (await godta.json()) as { ok?: boolean; error?: string };
    expect(godta.status, body.error).toBe(200);
    expect(body.ok).toBe(true);

    const [konto] = await owner
      .select({
        providerId: schema.account.providerId,
        password: schema.account.password,
      })
      .from(schema.account)
      .where(eq(schema.account.userId, ansattId));
    expect(konto?.password ?? null).toBeFalsy();
  });
});
