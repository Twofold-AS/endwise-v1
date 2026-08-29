import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  OTP_UTLOPT_MELDING,
  tolkToFaktorVerifySvar,
  visGjenopprettingsvalg,
} from '../src/to-faktor-oppsett.ts';
import {
  festUbrukteGjenopprettingskoderPaaRedirect,
  lesHarUbrukteGjenopprettingskoder,
} from '../src/to-faktor-server.ts';

/**
 * F1-21 live-bug: koder må lages ved enable (kryptert, engangs),
 * gjenoppretting skjules uten ubrukte, og utløpt OTP skal feile lukket.
 */

const OPPRINNELIG = { ...process.env };
const OWNER_URL = OPPRINNELIG.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

afterEach(() => {
  process.env = { ...OPPRINNELIG };
  vi.restoreAllMocks();
});

describe('F1-21: etter-hooken rører bare twoFactorRedirect', () => {
  it('hopper over andre stier uten å lese databasen', async () => {
    const returned = { twoFactorRedirect: true };
    await festUbrukteGjenopprettingskoderPaaRedirect(
      { path: '/change-password', body: { email: 'a@b.c' }, context: { returned } },
      null as never,
    );
    expect(returned).not.toHaveProperty('harUbrukteGjenopprettingskoder');
  });

  it('hopper over innlogging uten 2FA-redirect', async () => {
    const returned = { token: 'sesjon' };
    await festUbrukteGjenopprettingskoderPaaRedirect(
      { path: '/sign-in/email', body: { email: 'a@b.c' }, context: { returned } },
      null as never,
    );
    expect(returned).not.toHaveProperty('harUbrukteGjenopprettingskoder');
  });
});

describeDb('F1-21: koder ved enable, skjul uten ubrukte, utløpt OTP', () => {
  let db: Database;
  let auth: ReturnType<typeof createAuth>;
  const PASSORD = 'gammelt-passord-123';
  const opprettede: string[] = [];
  const tenantId = randomUUID();

  async function nyBruker(): Promise<{ epost: string; userId: string; cookie: string }> {
    const epost = `tfa-koder-${randomUUID()}@endwise.test`;
    await auth.api.signUpEmail({
      body: { email: epost, password: PASSORD, name: 'ToFaktor Koder' },
    });
    const [rad] = await db.select().from(schema.user).where(eq(schema.user.email, epost));
    const userId = rad?.id ?? '';
    await db.update(schema.user).set({ emailVerified: true }).where(eq(schema.user.id, userId));
    await db.insert(schema.member).values({
      id: randomUUID(),
      organizationId: tenantId,
      userId,
      role: 'dealer_admin',
      createdAt: new Date(),
    });
    opprettede.push(userId);

    const svar = await auth.api.signInEmail({
      body: { email: epost, password: PASSORD },
      asResponse: true,
    });
    const cookies = svar.headers.getSetCookie?.() ?? [];
    const raw = cookies.length > 0 ? cookies : [svar.headers.get('set-cookie') ?? ''];
    const cookie = raw
      .filter((c) => c.includes('session_token'))
      .map((c) => c.split(';')[0])
      .join('; ');

    return { epost, userId, cookie };
  }

  async function slaaPaa2fa(cookie: string, userId: string): Promise<string[]> {
    const enablet = await auth.api.enableTwoFactor({
      body: { password: PASSORD },
      headers: new Headers({ cookie }),
    });
    await db.update(schema.user).set({ twoFactorEnabled: true }).where(eq(schema.user.id, userId));
    const koder =
      enablet && typeof enablet === 'object' && 'backupCodes' in enablet
        ? (enablet as { backupCodes: string[] }).backupCodes
        : [];
    return koder;
  }

  async function toFaktorCookie(epost: string): Promise<string> {
    const svar = await auth.api.signInEmail({
      body: { email: epost, password: PASSORD },
      asResponse: true,
    });
    const cookies = svar.headers.getSetCookie?.() ?? [];
    const raw = cookies.length > 0 ? cookies : [svar.headers.get('set-cookie') ?? ''];
    return raw
      .filter((c) => /two.factor|2fa/i.test(c) || c.includes('session_token'))
      .map((c) => c.split(';')[0])
      .join('; ');
  }

  beforeAll(async () => {
    process.env.BETTER_AUTH_SECRET = 'test-hemmelighet-som-er-lang-nok-til-alt';
    process.env.BETTER_AUTH_URL = 'https://endwise.test';
    process.env.RESEND_API_KEY = '';
    process.env.NODE_ENV = 'test';
    db = createDb(OWNER_URL as string);
    auth = createAuth(db);
    const now = new Date();
    await db.insert(schema.tenants).values({
      id: tenantId,
      name: '2FA-koder test',
      slug: `tfa-koder-${tenantId.slice(0, 8)}`,
    });
    await db.insert(schema.organization).values({
      id: tenantId,
      name: '2FA-koder test',
      slug: `tfa-koder-${tenantId.slice(0, 8)}`,
      createdAt: now,
    });
  });

  afterAll(async () => {
    for (const id of opprettede) {
      await db.delete(schema.auditLog).where(eq(schema.auditLog.subjectId, id));
      await db.delete(schema.twoFactor).where(eq(schema.twoFactor.userId, id));
      await db.delete(schema.session).where(eq(schema.session.userId, id));
      await db.delete(schema.account).where(eq(schema.account.userId, id));
      await db.delete(schema.member).where(eq(schema.member.userId, id));
      await db.delete(schema.user).where(eq(schema.user.id, id));
    }
    await db.delete(schema.organization).where(eq(schema.organization.id, tenantId));
    await db.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  it('enable lager koder, lagrer dem kryptert og ikke i klartekst', async () => {
    const { cookie, userId, epost } = await nyBruker();
    const koder = await slaaPaa2fa(cookie, userId);
    expect(koder.length).toBeGreaterThanOrEqual(8);
    expect(koder.every((k) => typeof k === 'string' && k.length > 0)).toBe(true);

    const [rad] = await db
      .select()
      .from(schema.twoFactor)
      .where(eq(schema.twoFactor.userId, userId));
    expect(rad?.backupCodes).toBeTruthy();
    expect(rad?.backupCodes).not.toBe('[]');
    for (const kode of koder) {
      expect(rad?.backupCodes).not.toContain(kode);
    }

    expect(await lesHarUbrukteGjenopprettingskoder(db, epost)).toBe(true);
    expect(visGjenopprettingsvalg(true)).toBe(true);
  });

  it('ingen ubrukte koder → gjenopprettingsvalg skjules', async () => {
    const { userId, epost, cookie } = await nyBruker();
    await slaaPaa2fa(cookie, userId);
    await db
      .update(schema.twoFactor)
      .set({ backupCodes: '[]' })
      .where(eq(schema.twoFactor.userId, userId));

    expect(await lesHarUbrukteGjenopprettingskoder(db, epost)).toBe(false);
    expect(visGjenopprettingsvalg(false)).toBe(false);

    const returned: { twoFactorRedirect: true; harUbrukteGjenopprettingskoder?: boolean } = {
      twoFactorRedirect: true,
    };
    await festUbrukteGjenopprettingskoderPaaRedirect(
      { path: '/sign-in/email', body: { email: epost }, context: { returned } },
      db,
    );
    expect(returned.harUbrukteGjenopprettingskoder).toBe(false);
  });

  it('gjenopprettingskode er engangs — andre forsøk feiler', async () => {
    const { cookie, userId, epost } = await nyBruker();
    const koder = await slaaPaa2fa(cookie, userId);
    const kode = koder[0];
    expect(kode).toBeTruthy();

    const headers = new Headers({ cookie: await toFaktorCookie(epost) });
    const forste = await auth.api.verifyBackupCode({
      body: { code: kode },
      headers,
    });
    expect(forste).toBeTruthy();

    const andreHeaders = new Headers({ cookie: await toFaktorCookie(epost) });
    await expect(
      auth.api.verifyBackupCode({
        body: { code: kode },
        headers: andreHeaders,
      }),
    ).rejects.toMatchObject({
      body: { code: 'INVALID_BACKUP_CODE' },
    });
  });

  it('utløpt OTP blir norsk feil — ikke et hengende suksess-svar', async () => {
    const { cookie, userId, epost } = await nyBruker();
    await slaaPaa2fa(cookie, userId);
    const headers = new Headers({ cookie: await toFaktorCookie(epost) });
    await auth.api.sendTwoFactorOTP({
      headers,
    });

    await db
      .update(schema.verification)
      .set({ expiresAt: new Date(0) })
      .where(sql`${schema.verification.identifier} like '2fa-otp-%'`);

    const kall = auth.api.verifyTwoFactorOTP({
      body: { code: '000000' },
      headers,
    });
    await expect(kall).rejects.toMatchObject({
      body: { code: 'OTP_HAS_EXPIRED' },
    });
    await kall.catch((error: unknown) => {
      const utfall = tolkToFaktorVerifySvar(error);
      expect(utfall.ok).toBe(false);
      if (!utfall.ok) {
        expect(utfall.feil).toBe(OTP_UTLOPT_MELDING);
        expect(utfall.knappeTilstand).toBe('error');
      }
    });
  });
});
