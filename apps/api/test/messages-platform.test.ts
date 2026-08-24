import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { createMessagesModule } from '@endwise/modules/messages';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F5-11 — Endwise-admin skal se dealer↔Endwise-tråder på tvers av tenants.
 *
 * `listThreads` er tenant-skopet og skal forbli det. Den nye ruta er
 * `endwiseAdminProcedure` + `withPlatformAdmin`, og RLS åpner KUN
 * `thread_kind = dealer_admin`. customer_dealer og mechanic_dealer er
 * usynlige. dealer_admin/dealer_staff får FORBIDDEN.
 */
async function forventer(
  kall: Promise<unknown>,
  code: 'FORBIDDEN' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'BAD_REQUEST',
) {
  await expect(kall).rejects.toMatchObject({ code });
}

const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

const fakeCtx = (role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff') =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: `mps-fake-${role}`,
    role,
  }) as never;

describe('F5-11 — siste melding og svar-sti (CWE-200 / CWE-284)', () => {
  it('last-message-subquery binder messages.tenant_id til trådens tenant', () => {
    const her = dirname(fileURLToPath(import.meta.url));
    const kilde = readFileSync(
      resolve(her, '../../../packages/modules/src/messages/threads.ts'),
      'utf8',
    );
    expect(kilde).toMatch(/m\.tenant_id = \$\{schema\.threads\.tenantId\}/);
    expect(kilde).toMatch(/auditLog|platform\.support\.reply/);
    expect(kilde).toMatch(/kontaktNavn/);
    expect(kilde).toMatch(/authorNavn/);
    expect(kilde).toMatch(/authorRolle/);
    expect(kilde).toMatch(/kontaktRolle/);
    expect(kilde).toMatch(/navnForDealerOgEndwise/);
    expect(kilde).toMatch(/visningsnavn/);
  });
});

describe('F5-11 — platform-support-ruter er endwiseAdminProcedure', () => {
  it('⛔ ANGREP: dealer_admin får FORBIDDEN på listPlatformSupport', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_admin')).messages.listPlatformSupport(),
      'FORBIDDEN',
    );
  });

  it('⛔ ANGREP: dealer_staff får FORBIDDEN på listPlatformSupport', async () => {
    await forventer(
      appRouter.createCaller(fakeCtx('dealer_staff')).messages.listPlatformSupport(),
      'FORBIDDEN',
    );
  });
});

describeDb('F5-11 — kryss-tenant dealer_admin-tråder', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const endwiseTenant = randomUUID();
  const lederA = `mps-leder-a-${tenantA.slice(0, 8)}`;
  const lederB = `mps-leder-b-${tenantB.slice(0, 8)}`;
  const endwise = `mps-endwise-${endwiseTenant.slice(0, 8)}`;
  let supportA = '';
  let kundeTradA = '';

  const ctx = (
    role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff',
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

  const somEndwise = () => appRouter.createCaller(ctx('endwise_admin', endwiseTenant, endwise));
  const somLederA = () => appRouter.createCaller(ctx('dealer_admin', tenantA, lederA));
  const somLederB = () => appRouter.createCaller(ctx('dealer_admin', tenantB, lederB));

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Verksted A', slug: `mps-a-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Verksted B', slug: `mps-b-${tenantB.slice(0, 8)}` },
      { id: endwiseTenant, name: 'Endwise', slug: `mps-ew-${endwiseTenant.slice(0, 8)}` },
    ]);

    const meldinger = createMessagesModule(app);
    const support = await meldinger.createThread({
      tenantId: tenantA,
      kind: 'dealer_admin',
      subject: 'Hjelp med Quick',
      participantIds: [lederA],
    });
    supportA = support.id;
    await meldinger.postMessage({
      tenantId: tenantA,
      threadId: support.id,
      authorId: lederA,
      body: 'Quick synker ikke lenger.',
    });

    const internB = await meldinger.createThread({
      tenantId: tenantB,
      kind: 'dealer_admin',
      subject: 'Faktura',
      participantIds: [lederB],
    });
    await meldinger.postMessage({
      tenantId: tenantB,
      threadId: internB.id,
      authorId: lederB,
      body: 'Kan dere sjekke fakturaen?',
    });

    const kunde = await meldinger.createThread({
      tenantId: tenantA,
      kind: 'customer_dealer',
      subject: 'EU-kontroll',
      participantIds: [lederA, 'kunde-hemmelig'],
    });
    kundeTradA = kunde.id;
    await meldinger.postMessage({
      tenantId: tenantA,
      threadId: kunde.id,
      authorId: 'kunde-hemmelig',
      body: 'Denne skal Endwise ALDRI se.',
    });
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB, endwiseTenant]) {
      await owner.delete(schema.streamEvents).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.messages).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.threadParticipants).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.threads).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.tenants).where(sql`id = ${t}`);
    }
  });

  it('endwise_admin lister dealer_admin-tråder fra ALLE forhandlere', async () => {
    const lista = await somEndwise().messages.listPlatformSupport();
    const ider = lista.map((t) => t.id);
    expect(ider).toContain(supportA);
    expect(lista.some((t) => t.tenantName === 'Verksted A')).toBe(true);
    expect(lista.some((t) => t.tenantName === 'Verksted B')).toBe(true);
    expect(lista.every((t) => t.kind === 'dealer_admin')).toBe(true);
  });

  it('⛔ ANGREP: platform-lista inneholder IKKE customer_dealer', async () => {
    const lista = await somEndwise().messages.listPlatformSupport();
    expect(lista.some((t) => t.id === kundeTradA)).toBe(false);
    const tekster = JSON.stringify(lista);
    expect(tekster).not.toContain('Denne skal Endwise ALDRI se.');
  });

  it('⛔ ANGREP: listThreads hos dealer A ser ikke dealer B', async () => {
    const a = await somLederA().messages.listThreads();
    const b = await somLederB().messages.listThreads();
    expect(a.every((t) => t.id !== b[0]?.id)).toBe(true);
    expect(b.some((t) => t.id === supportA)).toBe(false);
  });

  it('⛔ ANGREP: dealer_admin i A får FORBIDDEN på listPlatformSupport (ekte ctx)', async () => {
    await forventer(somLederA().messages.listPlatformSupport(), 'FORBIDDEN');
  });

  it('Endwise kan lese og svare; svaret lander i forhandlerens tråd', async () => {
    const meldinger = await somEndwise().messages.listPlatformSupportMessages({
      threadId: supportA,
    });
    expect(meldinger.some((m) => m.body === 'Quick synker ikke lenger.')).toBe(true);

    const svar = await somEndwise().messages.postPlatformSupport({
      threadId: supportA,
      body: 'Vi ser på det i dag.',
    });
    expect(svar.body).toBe('Vi ser på det i dag.');
    expect(svar.tenantId).toBe(tenantA);

    const hosForhandler = await somLederA().messages.listMessages({ threadId: supportA });
    expect(hosForhandler.some((m) => m.body === 'Vi ser på det i dag.')).toBe(true);
  });

  it('⛔ ANGREP: Endwise kan ikke åpne en customer_dealer-tråd via platform-ruta', async () => {
    await forventer(
      somEndwise().messages.listPlatformSupportMessages({ threadId: kundeTradA }),
      'NOT_FOUND',
    );
    await forventer(
      somEndwise().messages.postPlatformSupport({
        threadId: kundeTradA,
        body: 'kapret',
      }),
      'NOT_FOUND',
    );
  });
});
