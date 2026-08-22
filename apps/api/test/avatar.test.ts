import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F6-19 — AVATAR: hvem kan sette hvem sitt ansikt, og hva godtar basen?
 *
 * Avataren er kosmetikk. Ruta som lagrer den er ikke: den skriver til
 * `user_preferences`, som **ikke har RLS** (global tabell, se skjemaet). Der er
 * `ctx.userId` hele beskyttelsen, og da må det finnes en test som sier at ingen
 * bruker-ID kan komme fra input (CWE-639).
 *
 * ⚠️ Vi kaller `appRouter` direkte med en håndlaget context — samme grunn som i
 * `module-gate.test.ts`: en angriper går ikke gjennom UI-et.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F6-19 — avatar', () => {
  let owner: Database;
  let app: Database;
  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const brukerA = `test-a-${randomUUID()}`;
  const brukerB = `test-b-${randomUUID()}`;

  const ctx = (tenantId: string, userId: string) => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role: 'dealer_admin' as const,
  });

  const a = () => appRouter.createCaller(ctx(tenantA, brukerA) as never);
  const b = () => appRouter.createCaller(ctx(tenantB, brukerB) as never);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'Avatar A', slug: `ava-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'Avatar B', slug: `avb-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.user).values([
      { id: brukerA, name: 'Ansatt A', email: `${brukerA}@test.no`, emailVerified: true },
      { id: brukerB, name: 'Ansatt B', email: `${brukerB}@test.no`, emailVerified: true },
    ]);
    /**
     * ⚠️ ADR-002: `organization.id` ER tenant-IDen, men det er to tabeller —
     * `tenants` er vår, `organization` er Better-Auths, og `member` sin
     * fremmednøkkel peker på den siste. Begge må finnes.
     */
    await owner.insert(schema.organization).values([
      { id: tenantA, name: 'Avatar A', slug: `ava-${tenantA.slice(0, 8)}`, createdAt: new Date() },
      { id: tenantB, name: 'Avatar B', slug: `avb-${tenantB.slice(0, 8)}`, createdAt: new Date() },
    ]);
    await owner.insert(schema.member).values([
      // ⚠️ `member.created_at` er NOT NULL uten default (Better-Auth eier
      // tabellen), så den må settes eksplisitt her.
      {
        id: randomUUID(),
        organizationId: tenantA,
        userId: brukerA,
        role: 'admin',
        createdAt: new Date(),
      },
      {
        id: randomUUID(),
        organizationId: tenantB,
        userId: brukerB,
        role: 'admin',
        createdAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    await owner
      .delete(schema.userPreferences)
      .where(sql`user_id in (${brukerA}, ${brukerB})`)
      .catch(() => {});
    await owner.delete(schema.member).where(sql`user_id in (${brukerA}, ${brukerB})`);
    await owner.delete(schema.organization).where(sql`id in (${tenantA}, ${tenantB})`);
    await owner.delete(schema.user).where(sql`id in (${brukerA}, ${brukerB})`);
    await owner.delete(schema.tenants).where(sql`id in (${tenantA}, ${tenantB})`);
  });

  /* ══ STANDARD: alt fra seeden ══════════════════════════════════════════ */

  it('uten lagret valg er alle tre null — alt utledes fra seeden', async () => {
    const meg = await a().profile.meg();
    expect(meg.avatar).toEqual({ form: null, humor: null, farge: null, tone: null });
  });

  /* ══ LAGRING ═══════════════════════════════════════════════════════════ */

  it('lagrer form, farge og tone', async () => {
    await a().profile.setAvatar({ form: 'sun', humor: 'happy', farge: 210, tone: 3 });
    const meg = await a().profile.meg();
    expect(meg.avatar).toEqual({ form: 'sun', humor: 'happy', farge: 210, tone: 3 });
  });

  it('null tilbakestiller ÉN egenskap uten å røre de andre', async () => {
    await a().profile.setAvatar({ form: 'sun', humor: 'happy', farge: null, tone: 3 });
    const meg = await a().profile.meg();
    // ⛔ Kjernen i at feltene er `.nullable()` og ikke `.optional()`: null er et
    // valg («per seed»), ikke fravær av et valg.
    expect(meg.avatar).toEqual({ form: 'sun', humor: 'happy', farge: null, tone: 3 });
  });

  /* ══ ANGREP: input som ikke skal godtas ════════════════════════════════ */

  it('ANGREP: ukjent form avvises av zod', async () => {
    await expect(
      a().profile.setAvatar({ form: 'pyramide' as never, humor: null, farge: null, tone: null }),
    ).rejects.toThrow();
  });

  it('ANGREP: farge utenfor 0–359 avvises', async () => {
    await expect(
      a().profile.setAvatar({ form: null, humor: null, farge: 400, tone: null }),
    ).rejects.toThrow();
    await expect(
      a().profile.setAvatar({ form: null, humor: null, farge: -1, tone: null }),
    ).rejects.toThrow();
  });

  it('ANGREP: tone utenfor svatsjsettet avvises', async () => {
    await expect(
      a().profile.setAvatar({ form: null, humor: null, farge: null, tone: 6 }),
    ).rejects.toThrow();
  });

  /* ══ HUMØR (20.08.2026) ════════════════════════════════════════════════ */

  it('ANGREP: et humør utenfor det kuraterte utvalget avvises', async () => {
    // `sad` FINNES i blobatar, men er bevisst ikke tilbudt. At biblioteket
    // kjenner en verdi gjør den ikke lovlig hos oss.
    await expect(
      a().profile.setAvatar({ form: null, humor: 'sad' as never, farge: null, tone: null }),
    ).rejects.toThrow();
  });

  it('humør kan settes til null uten å røre de andre valgene', async () => {
    await a().profile.setAvatar({ form: 'sun', humor: null, farge: null, tone: 3 });
    const meg = await a().profile.meg();
    expect(meg.avatar).toEqual({ form: 'sun', humor: null, farge: null, tone: 3 });
  });

  /**
   * ⚠️ Drizzle pakker databasefeilen inn i sin egen «Failed query»-melding, så
   * constraint-navnet ligger i `cause`, ikke i `message`. En `toThrow(/navn/)`
   * ville derfor bestått på FEIL grunnlag — eller feilet selv om regelen virket.
   * Vi leser derfor navnet der det faktisk står.
   */
  async function constraintVed(fn: () => Promise<unknown>): Promise<string> {
    try {
      await fn();
    } catch (err) {
      const cause = (err as { cause?: { constraint?: string } }).cause;
      return cause?.constraint ?? String(err);
    }
    return 'INGEN FEIL';
  }

  it('ANGREP: rå INSERT med ukjent form avvises av CHECK-en i basen', async () => {
    // ⛔ Det tredje laget. Zod beskytter ruta; denne beskytter tabellen mot en
    // fremtidig rute som glemmer regelen.
    const navn = await constraintVed(() =>
      owner
        .insert(schema.userPreferences)
        .values({ userId: brukerB, avatarShape: 'pyramide' })
        .onConflictDoUpdate({
          target: schema.userPreferences.userId,
          set: { avatarShape: 'pyramide' },
        }),
    );
    expect(navn).toBe('user_preferences_avatar_shape_check');
  });

  it('ANGREP: rå INSERT med farge 999 avvises av CHECK-en', async () => {
    const navn = await constraintVed(() =>
      owner
        .insert(schema.userPreferences)
        .values({ userId: brukerB, avatarHue: 999 })
        .onConflictDoUpdate({
          target: schema.userPreferences.userId,
          set: { avatarHue: 999 },
        }),
    );
    expect(navn).toBe('user_preferences_avatar_hue_check');
  });

  it('ANGREP: rå INSERT med ukjent humør avvises av CHECK-en', async () => {
    const navn = await constraintVed(() =>
      owner
        .insert(schema.userPreferences)
        .values({ userId: brukerB, avatarHumor: 'rasende' })
        .onConflictDoUpdate({
          target: schema.userPreferences.userId,
          set: { avatarHumor: 'rasende' },
        }),
    );
    expect(navn).toBe('user_preferences_avatar_humor_check');
  });

  /* ══ EIERSKAP: ingen bruker-ID fra input ═══════════════════════════════ */

  it('ANGREP: setAvatar tar ingen userId — B kan ikke sette A sitt ansikt', async () => {
    /**
     * Ruta har ikke noe `userId`-felt i det hele tatt, så «angrepet» er å sende
     * ett og se at det ikke får virkning. Består testen, er det fordi
     * `ctx.userId` er eneste kilde — ikke fordi klienten lot være å prøve.
     */
    await b().profile.setAvatar({
      form: 'triangle',
      humor: 'wink',
      farge: 10,
      tone: 0,
      userId: brukerA,
    } as never);

    const megA = await a().profile.meg();
    expect(megA.avatar.form).toBe('sun');
    expect(megA.avatar.farge).toBeNull();

    const megB = await b().profile.meg();
    expect(megB.avatar).toEqual({ form: 'triangle', humor: 'wink', farge: 10, tone: 0 });
  });

  /* ══ VISNINGSNAVN — rotårsaken til sidebar-bugen (20.08.2026) ═════════ */

  it('session.me returnerer brukerens EGET navn', async () => {
    /**
     * ⛔ Dette feltet er hele fiksen. Sidebaren leste navnet fra Better-Auths
     * klientsesjon, mens `profile.setName` skriver til `user.name` i basen —
     * to hjem for samme opplysning, og bare det ene ble oppdatert.
     */
    const meg = await a().session.me();
    expect(meg.navn).toBe('Ansatt A');
  });

  it('setName slår gjennom i session.me med én gang', async () => {
    await a().profile.setName({ navn: 'Ansatt A2' });
    const meg = await a().session.me();
    expect(meg.navn).toBe('Ansatt A2');

    // ⚠️ Og det er MITT navn som endret seg, ikke naboens.
    const megB = await b().session.me();
    expect(megB.navn).toBe('Ansatt B');
  });

  /* ══ OPPSLAG: seed og avatar via directory ═════════════════════════════ */

  it('participants gir seed + avatar for egen tenants folk', async () => {
    const svar = await a().directory.participants({ ids: [brukerA], visning: 'offisiell' });
    expect(svar[brukerA]?.seed).toBe(brukerA);
    expect(svar[brukerA]?.avatar).toEqual({ form: 'sun', humor: null, farge: null, tone: 3 });
  });

  it('ANGREP: nabo-tenanten får verken navn, seed eller ansikt', async () => {
    // ⛔ `user_preferences` har ingen RLS. Isolasjonen kommer av at IDen aldri
    // blir oppløst i tenant B — og en ID vi ikke kan navngi, spør vi heller
    // ikke om et ansikt for.
    const svar = await b().directory.participants({ ids: [brukerA], visning: 'offisiell' });
    expect(svar[brukerA]).toBeUndefined();
  });
});
