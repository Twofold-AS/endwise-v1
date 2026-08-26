import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createAuth } from '../src/auth.ts';
import {
  KREDENTIAL_MUTASJON_GENERISK_FEILKODE,
  KREDENTIAL_MUTASJON_GENERISK_MELDING,
  TO_FAKTOR_DISABLE_STI,
} from '../src/bytt-passord.ts';
import { byttPassordForHook } from '../src/bytt-passord-server.ts';
import {
  slaaAv2faKall,
  TO_FAKTOR_DISABLE_AUDIT_ACTION,
  validerSlaaAv2fa,
} from '../src/to-faktor-oppsett.ts';

/**
 * Slå av 2FA krever passord på serveren, og skriver audit.
 * Klientflagg er ikke en sperre. En åpen sesjon alene skal ikke slå av 2FA.
 * Feil passord og annen auth-feil får samme generiske svar (CWE-209).
 */

const OPPRINNELIG = { ...process.env };
const OWNER_URL = OPPRINNELIG.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;

afterEach(() => {
  process.env = { ...OPPRINNELIG };
  vi.restoreAllMocks();
});

describe('F1-22: disable-kallet har ingen klientflagg å stole på', () => {
  it('payloaden er bare password — skip/confirm/flagg finnes ikke', () => {
    const sjekk = validerSlaaAv2fa('riktig-passord-123');
    expect(sjekk.ok).toBe(true);
    if (!sjekk.ok) return;
    const kall = slaaAv2faKall(sjekk);
    expect(kall).toEqual({ password: 'riktig-passord-123' });
    expect('skipPassword' in kall).toBe(false);
    expect('passwordRequired' in kall).toBe(false);
  });

  it('⛔ serverhooken avviser tomt passord — klienten er ikke sperren', async () => {
    await expect(
      byttPassordForHook({
        path: TO_FAKTOR_DISABLE_STI,
        body: { password: '' },
      } as never),
    ).rejects.toMatchObject({
      body: {
        code: KREDENTIAL_MUTASJON_GENERISK_FEILKODE,
        message: KREDENTIAL_MUTASJON_GENERISK_MELDING,
      },
    });
    await expect(
      byttPassordForHook({
        path: TO_FAKTOR_DISABLE_STI,
        body: {},
      } as never),
    ).rejects.toMatchObject({
      body: { code: KREDENTIAL_MUTASJON_GENERISK_FEILKODE },
    });
  });
});

describeDb('F1-22: disable mot ekte database', () => {
  let db: Database;
  let auth: ReturnType<typeof createAuth>;
  const PASSORD = 'gammelt-passord-123';
  const opprettede: string[] = [];
  const tenantId = randomUUID();

  async function nyBruker(): Promise<{ epost: string; userId: string; cookie: string }> {
    const epost = `tfa-av-${randomUUID()}@endwise.test`;
    await auth.api.signUpEmail({
      body: { email: epost, password: PASSORD, name: 'ToFaktor Av' },
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
      name: '2FA-av test',
      slug: `tfa-av-${tenantId.slice(0, 8)}`,
    });
    await db.insert(schema.organization).values({
      id: tenantId,
      name: '2FA-av test',
      slug: `tfa-av-${tenantId.slice(0, 8)}`,
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

  it('enable returnerer backupCodes — de er allerede der, vi viser dem bare', async () => {
    const { cookie, userId } = await nyBruker();
    const koder = await slaaPaa2fa(cookie, userId);
    expect(koder.length).toBeGreaterThanOrEqual(8);
    expect(koder.every((k) => typeof k === 'string' && k.length > 0)).toBe(true);
  });

  it('⛔ disable uten passord avvises — 2FA blir stående', async () => {
    const { cookie, userId } = await nyBruker();
    await slaaPaa2fa(cookie, userId);

    await expect(
      auth.api.disableTwoFactor({
        body: { password: '' },
        headers: new Headers({ cookie }),
      }),
    ).rejects.toMatchObject({
      body: {
        code: KREDENTIAL_MUTASJON_GENERISK_FEILKODE,
        message: KREDENTIAL_MUTASJON_GENERISK_MELDING,
      },
    });

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.twoFactorEnabled).toBe(true);
  });

  it('⛔ feil passord lekker ikke INVALID_PASSWORD og slår ikke av', async () => {
    const { cookie, userId } = await nyBruker();
    await slaaPaa2fa(cookie, userId);

    const kall = auth.api.disableTwoFactor({
      body: { password: 'helt-feil-passord-999' },
      headers: new Headers({ cookie }),
    });
    await expect(kall).rejects.toMatchObject({
      body: {
        code: KREDENTIAL_MUTASJON_GENERISK_FEILKODE,
        message: KREDENTIAL_MUTASJON_GENERISK_MELDING,
      },
    });
    await expect(kall).rejects.not.toMatchObject({
      body: { code: 'INVALID_PASSWORD' },
    });

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.twoFactorEnabled).toBe(true);
  });

  it('riktig passord slår av 2FA og skriver audit_log', async () => {
    const { cookie, userId } = await nyBruker();
    await slaaPaa2fa(cookie, userId);

    const svar = await auth.api.disableTwoFactor({
      body: slaaAv2faKall({ passord: PASSORD }),
      headers: new Headers({ cookie }),
    });
    expect(svar).toMatchObject({ status: true });

    const [etter] = await db.select().from(schema.user).where(eq(schema.user.id, userId));
    expect(etter?.twoFactorEnabled).toBe(false);

    const audit = await db
      .select()
      .from(schema.auditLog)
      .where(eq(schema.auditLog.subjectId, userId));
    expect(audit.some((rad) => rad.action === TO_FAKTOR_DISABLE_AUDIT_ACTION)).toBe(true);
    expect(audit.every((rad) => rad.tenantId === tenantId)).toBe(true);
    expect(JSON.stringify(audit)).not.toMatch(PASSORD);
    expect(TO_FAKTOR_DISABLE_STI).toBe('/two-factor/disable');
  });
});
