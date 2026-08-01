import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { CompetenceForbiddenError, createCompetenceRegistry } from '../src/competence/index.ts';
import { createRuleMatcher } from '../src/matching/index.ts';

/**
 * F3-12 — Kompetanseregisteret, og angrepene på det.
 *
 * To beskyttelseslag som gjør ULIKE jobber, og begge testes:
 *   - RLS:   «hvilken tenants rader?»   → cross-tenant-angrepene
 *   - rolle: «har DU lov til å skrive?» → privilege-escalation-angrepet
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('kompetanseregister (F3-12)', () => {
  let owner: Database;
  let app: Database;

  const tenantA = randomUUID();
  const tenantB = randomUUID();
  const mekanikerA = randomUUID();
  const mekanikerB = randomUUID(); // hos tenant B
  const serviceId = randomUUID();

  const iMorgen = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
  const iGar = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner.insert(schema.tenants).values([
      { id: tenantA, name: 'A', slug: `ka-${tenantA.slice(0, 8)}` },
      { id: tenantB, name: 'B', slug: `kb-${tenantB.slice(0, 8)}` },
    ]);
    await owner.insert(schema.mechanics).values([
      { id: mekanikerA, tenantId: tenantA, name: 'Kari hos A' },
      { id: mekanikerB, tenantId: tenantB, name: 'Bob hos B' },
    ]);
    await owner.insert(schema.skills).values([
      { tenantId: tenantA, key: 'mc-eu', name: 'EU-kontroll MC', requiresCertification: true },
      { tenantId: tenantA, key: 'dekkskift', name: 'Dekkskift' },
      { tenantId: tenantB, key: 'mc-eu', name: 'EU-kontroll MC', requiresCertification: true },
    ]);
    await owner
      .insert(schema.services)
      .values({ id: serviceId, tenantId: tenantA, name: 'EU MC', vehicleType: 'mc' });
  });

  afterAll(async () => {
    for (const t of [tenantA, tenantB]) {
      await owner.delete(schema.mechanicSkills).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.skills).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.services).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.mechanics).where(sql`tenant_id = ${t}`);
      await owner.delete(schema.tenants).where(sql`id = ${t}`);
    }
  });

  // ── ROLLE-GATE ────────────────────────────────────────────────────────
  it('ANGREP: en mekaniker (dealer_staff) kan IKKE gi seg selv en ferdighet', async () => {
    const registry = createCompetenceRegistry(app);
    await expect(
      registry.setMechanicSkill(tenantA, 'dealer_staff', {
        mechanicId: mekanikerA,
        skillKey: 'mc-eu',
        level: 5,
        certificationExpiresAt: iMorgen,
      }),
    ).rejects.toBeInstanceOf(CompetenceForbiddenError);
  });

  it('ANGREP: en kunde kan ikke røre kompetanse i det hele tatt', async () => {
    const registry = createCompetenceRegistry(app);
    await expect(
      registry.upsertSkill(tenantA, 'customer', { key: 'hack', name: 'Hack' }),
    ).rejects.toBeInstanceOf(CompetenceForbiddenError);
  });

  it('dealer_admin kan sette kompetanse i egen tenant', async () => {
    const registry = createCompetenceRegistry(app);
    const row = await registry.setMechanicSkill(tenantA, 'dealer_admin', {
      mechanicId: mekanikerA,
      skillKey: 'mc-eu',
      level: 3,
      certifiedAt: '2026-01-01',
      certificationExpiresAt: iMorgen,
      yearsExperience: 7,
    });
    expect(row?.level).toBe(3);
  });

  // ── RLS / CROSS-TENANT ────────────────────────────────────────────────
  it('ANGREP: A kan ikke lese B sine mekanikeres kompetanse', async () => {
    await owner.insert(schema.mechanicSkills).values({
      tenantId: tenantB,
      mechanicId: mekanikerB,
      skillKey: 'mc-eu',
      level: 5,
      certificationExpiresAt: iMorgen,
    });

    const registry = createCompetenceRegistry(app);
    const rows = await registry.listMechanicSkills(tenantA, mekanikerB);
    expect(rows).toHaveLength(0);
  });

  it('ANGREP: A kan ikke SKRIVE kompetanse på B sin mekaniker — selv som admin', async () => {
    const registry = createCompetenceRegistry(app);
    await expect(
      registry.setMechanicSkill(tenantA, 'dealer_admin', {
        mechanicId: mekanikerB,
        skillKey: 'mc-eu',
        level: 5,
        certificationExpiresAt: iMorgen,
      }),
    ).rejects.toThrow(/finnes ikke i denne tenanten/);
  });

  it('ANGREP: A ser ikke B sin ferdighetskatalog', async () => {
    const registry = createCompetenceRegistry(app);
    const skills = await registry.listSkills(tenantA);
    expect(skills.every((s) => s.tenantId === tenantA)).toBe(true);
    expect(skills).toHaveLength(2);
  });

  // ── MATCHEREN LESER FRA REGISTERET ────────────────────────────────────
  it('matcheren finner mekanikeren når kompetansen er registrert', async () => {
    const result = await createRuleMatcher(app).match({
      tenantId: tenantA,
      serviceId,
      requiredSkills: ['mc-eu'],
      from: new Date('2026-10-01T09:00:00Z'),
      to: new Date('2026-10-01T10:00:00Z'),
    });
    expect(result.map((c) => c.mechanicId)).toContain(mekanikerA);
  });

  /**
   * DEN VIKTIGSTE. En dato som ikke sjekkes er ikke en sertifisering — det er
   * en påstand. En mekaniker med utløpt EU-sertifisering skal ikke kunne bookes
   * på en EU-kontroll. Det er ikke en UX-bug; det er et tilsynsavvik.
   */
  it('ANGREP: utløpt sertifisering diskvalifiserer mekanikeren', async () => {
    const registry = createCompetenceRegistry(app);
    await registry.setMechanicSkill(tenantA, 'dealer_admin', {
      mechanicId: mekanikerA,
      skillKey: 'mc-eu',
      level: 5,
      certifiedAt: '2020-01-01',
      certificationExpiresAt: iGar, // utløpt i går
    });

    const result = await createRuleMatcher(app).match({
      tenantId: tenantA,
      serviceId,
      requiredSkills: ['mc-eu'],
      from: new Date('2026-10-02T09:00:00Z'),
      to: new Date('2026-10-02T10:00:00Z'),
    });
    expect(result.map((c) => c.mechanicId)).not.toContain(mekanikerA);
  });

  it('sertifiseringer som utløper snart kan hentes ut (varsel i F3-04)', async () => {
    const registry = createCompetenceRegistry(app);
    await registry.setMechanicSkill(tenantA, 'dealer_admin', {
      mechanicId: mekanikerA,
      skillKey: 'mc-eu',
      level: 4,
      certificationExpiresAt: iMorgen,
    });

    const expiring = await registry.expiringCertifications(tenantA, 30);
    expect(expiring.some((r) => r.mechanicId === mekanikerA)).toBe(true);
  });
});
