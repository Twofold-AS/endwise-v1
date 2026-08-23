import { createHash, randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';
import { hashSlettKode } from '../src/trpc/slett-otp.ts';

async function forventer(kall: Promise<unknown>, code: 'FORBIDDEN' | 'NOT_FOUND' | 'BAD_REQUEST') {
  await expect(kall).rejects.toMatchObject({ code });
}

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

const ctx = (
  app: Database,
  role: 'endwise_admin' | 'dealer_admin',
  tenantId: string,
  userId: string,
) =>
  ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
  }) as never;

describeDb('F5-26 — slett, Endwise-lås og extras-steg', () => {
  let owner: Database;
  let app: Database;
  const adminTenant = randomUUID();
  const adminUser = `ew-slett-${adminTenant.slice(0, 8)}`;
  const tenantIds: string[] = [];
  let endwiseId: string | null = null;
  let endwiseOpprettet = false;

  const somEndwise = () =>
    appRouter.createCaller(ctx(app, 'endwise_admin', adminTenant, adminUser));

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values({
      id: adminTenant,
      name: 'Endwise HQ slett',
      slug: `ew-slett-${adminTenant.slice(0, 8)}`,
    });
    await owner.insert(schema.organization).values({
      id: adminTenant,
      name: 'Endwise HQ slett',
      slug: `ew-slett-${adminTenant.slice(0, 8)}`,
      createdAt: new Date(),
    });

    const [eksisterende] = await owner
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.slug, 'endwise'));
    if (eksisterende) {
      endwiseId = eksisterende.id;
    } else {
      endwiseId = randomUUID();
      endwiseOpprettet = true;
      await owner.insert(schema.tenants).values({
        id: endwiseId,
        name: 'Endwise',
        slug: 'endwise',
        kind: 'live',
      });
      await owner.insert(schema.organization).values({
        id: endwiseId,
        name: 'Endwise',
        slug: 'endwise',
        createdAt: new Date(),
      });
    }
  });

  afterAll(async () => {
    for (const id of tenantIds) {
      await owner
        .delete(schema.tenantDeleteChallenges)
        .where(eq(schema.tenantDeleteChallenges.tenantId, id));
      await owner.delete(schema.auditLog).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.invitations).where(eq(schema.invitations.tenantId, id));
      await owner.delete(schema.memberProfiles).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.tenantModules).where(sql`tenant_id = ${id}`);
      await owner.delete(schema.member).where(sql`organization_id = ${id}`);
      await owner.delete(schema.organization).where(sql`id = ${id}`);
      await owner.delete(schema.tenants).where(sql`id = ${id}`);
    }
    await owner.delete(schema.auditLog).where(sql`tenant_id = ${adminTenant}`);
    await owner.delete(schema.organization).where(eq(schema.organization.id, adminTenant));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, adminTenant));
    if (endwiseOpprettet && endwiseId) {
      await owner.delete(schema.organization).where(eq(schema.organization.id, endwiseId));
      await owner.delete(schema.tenants).where(eq(schema.tenants.id, endwiseId));
    }
  });

  it('kan ikke slette Endwise-tenanten', async () => {
    expect(endwiseId).toBeTruthy();
    await forventer(
      somEndwise().tenants.slett({
        tenantId: endwiseId as string,
        slug: 'endwise',
        kode: '123456',
      }),
      'FORBIDDEN',
    );
    await forventer(
      somEndwise().tenants.sendSlettKode({ tenantId: endwiseId as string }),
      'FORBIDDEN',
    );
    const [rad] = await owner
      .select({ slug: schema.tenants.slug })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, endwiseId as string));
    expect(rad?.slug).toBe('endwise');
  });

  it('Send invitasjon på nytt er FORBIDDEN på Endwise-tenanten', async () => {
    await forventer(
      somEndwise().tenants.resendOwnerInvite({ tenantId: endwiseId as string }),
      'FORBIDDEN',
    );
    await forventer(
      somEndwise().tenants.setModules({ tenantId: endwiseId as string, tier: 'pro' }),
      'FORBIDDEN',
    );
  });

  it('slett uten slug eller kode avvises', async () => {
    const slug = `slett-nei-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Slett nei AS',
      slug,
      ownerEmail: `slett.${slug}@verksted.test`,
      kind: 'demo',
      tier: 'start',
    });
    tenantIds.push(opprettet.tenantId);

    await forventer(
      somEndwise().tenants.slett({
        tenantId: opprettet.tenantId,
        slug: 'feil-slug',
        kode: '123456',
      }),
      'BAD_REQUEST',
    );
    await forventer(
      somEndwise().tenants.slett({
        tenantId: opprettet.tenantId,
        slug,
        kode: '123456',
      }),
      'BAD_REQUEST',
    );
    await forventer(
      somEndwise().tenants.slett({
        tenantId: opprettet.tenantId,
        slug,
        kode: '12',
      }),
      'BAD_REQUEST',
    );

    const [lever] = await owner
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, opprettet.tenantId));
    expect(lever?.id).toBe(opprettet.tenantId);
  });

  it('slett med gyldig slug + kode fjerner forhandleren', async () => {
    const slug = `slett-ja-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Slett ja AS',
      slug,
      ownerEmail: `ok.${slug}@verksted.test`,
      kind: 'demo',
      tier: 'start',
    });

    await owner.insert(schema.tenantDeleteChallenges).values({
      tenantId: opprettet.tenantId,
      requestedBy: adminUser,
      codeHash: hashSlettKode('123456'),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    const slettet = await somEndwise().tenants.slett({
      tenantId: opprettet.tenantId,
      slug,
      kode: '123456',
    });
    expect(slettet.name).toBe('Slett ja AS');

    const [borte] = await owner
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, opprettet.tenantId));
    expect(borte).toBeUndefined();

    const audit = await owner
      .select({ action: schema.auditLog.action })
      .from(schema.auditLog)
      .where(eq(schema.auditLog.tenantId, adminTenant));
    expect(audit.some((a) => a.action === 'tenant.deleted')).toBe(true);
  });

  it('slett redigerer audit_log (ikke hard-slett) og rører ikke user', async () => {
    const slug = `slett-audit-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Slett audit AS',
      slug,
      ownerEmail: `audit.${slug}@verksted.test`,
      kind: 'demo',
      tier: 'start',
    });

    const piiId = randomUUID();
    const userId = `slett-usr-${opprettet.tenantId.slice(0, 8)}`;
    await owner.insert(schema.user).values({
      id: userId,
      name: 'Skal overleve',
      email: `lever.${slug}@verksted.test`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await owner.insert(schema.member).values({
      id: `mem-${userId}`,
      organizationId: opprettet.tenantId,
      userId,
      role: 'dealer_staff',
      createdAt: new Date(),
    });
    await owner.insert(schema.auditLog).values({
      id: piiId,
      tenantId: opprettet.tenantId,
      actor: 'kunde@test.no',
      action: 'test.pii',
      subjectType: 'customer',
      subjectId: 'cust-skal-redigeres',
      metadata: { telefon: '99999999' },
      ipAddress: '203.0.113.9',
    });

    await owner.insert(schema.tenantDeleteChallenges).values({
      tenantId: opprettet.tenantId,
      requestedBy: adminUser,
      codeHash: hashSlettKode('123456'),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await somEndwise().tenants.slett({
      tenantId: opprettet.tenantId,
      slug,
      kode: '123456',
    });

    const [borte] = await owner
      .select({ id: schema.tenants.id })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, opprettet.tenantId));
    expect(borte).toBeUndefined();

    const [bruker] = await owner
      .select({ id: schema.user.id, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, userId));
    expect(bruker?.email).toBe(`lever.${slug}@verksted.test`);
    await owner.delete(schema.user).where(eq(schema.user.id, userId));

    const [kjede] = await owner
      .select({
        tenantId: schema.auditLog.tenantId,
        actor: schema.auditLog.actor,
        subjectId: schema.auditLog.subjectId,
        metadata: schema.auditLog.metadata,
        ipAddress: schema.auditLog.ipAddress,
      })
      .from(schema.auditLog)
      .where(eq(schema.auditLog.id, piiId));
    expect(kjede).toBeDefined();
    expect(kjede?.tenantId).toBe(endwiseId);
    expect(kjede?.actor).toBe('[REDAKTERT]');
    expect(kjede?.subjectId).toBe('[REDAKTERT]');
    expect(kjede?.metadata).toEqual({ redacted: true });
    expect(kjede?.ipAddress).toBeNull();

    await owner.delete(schema.auditLog).where(eq(schema.auditLog.id, piiId));
    await owner
      .delete(schema.auditLog)
      .where(
        sql`tenant_id = ${endwiseId} and action = 'audit.redacted' and metadata->>'reason' = 'slett_forhandler'`,
      );
  });

  it('slett roterer erasure_requests-id og hasher identifikatorer i Endwise-kontekst', async () => {
    const slug = `slett-erasure-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Slett erasure AS',
      slug,
      ownerEmail: `erasure.${slug}@verksted.test`,
      kind: 'demo',
      tier: 'start',
    });

    const originalId = randomUUID();
    const subjectId = `cust-${opprettet.tenantId.slice(0, 8)}`;
    const requestedBy = `user-${opprettet.tenantId.slice(0, 8)}`;
    await owner.insert(schema.erasureRequests).values({
      id: originalId,
      tenantId: opprettet.tenantId,
      subjectType: 'customer',
      subjectId,
      requestedBy,
      status: 'completed',
      report: { requestId: originalId, purged: { customers: 1 } },
    });

    await owner.insert(schema.tenantDeleteChallenges).values({
      tenantId: opprettet.tenantId,
      requestedBy: adminUser,
      codeHash: hashSlettKode('123456'),
      expiresAt: new Date(Date.now() + 5 * 60 * 1000),
    });

    await somEndwise().tenants.slett({
      tenantId: opprettet.tenantId,
      slug,
      kode: '123456',
    });

    const [gammel] = await owner
      .select({ id: schema.erasureRequests.id })
      .from(schema.erasureRequests)
      .where(eq(schema.erasureRequests.id, originalId));
    expect(gammel).toBeUndefined();

    const forventetSubject = createHash('sha256')
      .update(subjectId + opprettet.tenantId, 'utf8')
      .digest('hex');
    const forventetBestiller = createHash('sha256')
      .update(requestedBy + opprettet.tenantId, 'utf8')
      .digest('hex');

    const [flyttet] = await owner
      .select({
        id: schema.erasureRequests.id,
        tenantId: schema.erasureRequests.tenantId,
        subjectId: schema.erasureRequests.subjectId,
        requestedBy: schema.erasureRequests.requestedBy,
        report: schema.erasureRequests.report,
      })
      .from(schema.erasureRequests)
      .where(
        sql`tenant_id = ${endwiseId} and report->>'reason' = 'slett_forhandler' and subject_id = ${forventetSubject}`,
      );
    expect(flyttet).toBeDefined();
    expect(flyttet?.id).not.toBe(originalId);
    expect(flyttet?.tenantId).toBe(endwiseId);
    expect(flyttet?.subjectId).toBe(forventetSubject);
    expect(flyttet?.requestedBy).toBe(forventetBestiller);
    expect(flyttet?.subjectId).not.toBe(subjectId);
    expect(flyttet?.requestedBy).not.toBe(requestedBy);
    expect(flyttet?.report).not.toHaveProperty('requestId');
    expect(flyttet?.report).toMatchObject({
      relocated: true,
      request_id_rotated: true,
      purged: { customers: 1 },
    });

    if (flyttet) {
      await owner.delete(schema.erasureRequests).where(eq(schema.erasureRequests.id, flyttet.id));
    }
  });

  it('kan ikke slette tenanten du selv er i', async () => {
    const [meg] = await owner
      .select({ slug: schema.tenants.slug })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, adminTenant));
    await forventer(
      somEndwise().tenants.slett({
        tenantId: adminTenant,
        slug: meg?.slug ?? 'x',
        kode: '123456',
      }),
      'FORBIDDEN',
    );
  });

  it('extras-steget utelater included-tier-moduler og shop — SMS bare hvis åpnet', async () => {
    const slug = `extras-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Extras AS',
      slug,
      ownerEmail: `ex.${slug}@verksted.test`,
      kind: 'demo',
      tier: 'pro',
      included: ['white-label'],
      optional: ['sso', 'nyhetsbrev'],
    });
    tenantIds.push(opprettet.tenantId);

    const eier = appRouter.createCaller(ctx(app, 'dealer_admin', opprettet.tenantId, adminUser));
    const status = await eier.onboarding.status();
    const extras = status.optional.map((m) => m.key);

    expect(status.nivaa).toEqual({ key: 'pro', name: 'Pro' });
    expect(extras).toEqual(expect.arrayContaining(['sso', 'nyhetsbrev']));
    expect(extras).not.toContain('white-label');
    expect(extras).not.toContain('shop');
    expect(extras).not.toContain('twilio');
    expect(extras).not.toContain('quick');
    expect(extras).not.toContain('ai-support');
    expect(extras).not.toContain('vegvesen');
    expect(status.included.map((m) => m.key)).toEqual(
      expect.arrayContaining(['quick', 'white-label']),
    );
    expect(status.included.map((m) => m.key)).not.toContain('twilio');
    expect(status.included.map((m) => m.key)).not.toContain('shop');
  });

  it('SMS kan inkluderes som tillegg på Pro uten å ligge i nivået', async () => {
    const slug = `sms-${randomUUID().slice(0, 8)}`;
    const opprettet = await somEndwise().tenants.create({
      name: 'Sms AS',
      slug,
      ownerEmail: `sms.${slug}@verksted.test`,
      kind: 'demo',
      tier: 'pro',
      included: ['twilio'],
    });
    tenantIds.push(opprettet.tenantId);

    const eier = appRouter.createCaller(ctx(app, 'dealer_admin', opprettet.tenantId, adminUser));
    const status = await eier.onboarding.status();
    expect(status.included.map((m) => m.key)).toContain('twilio');
    expect(status.optional.map((m) => m.key)).not.toContain('twilio');
  });
});
