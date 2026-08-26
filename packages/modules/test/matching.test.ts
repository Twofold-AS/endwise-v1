import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createBooking } from '../src/booking/index.ts';
import { createRuleMatcher } from '../src/matching/index.ts';

/** Regelbasert matching, mot ekte database. */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('mekaniker-matching (F3-02)', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();
  const spesialist = randomUUID(); // mange ferdigheter
  const generalist = randomUUID(); // akkurat det som trengs
  const nybegynner = randomUUID(); // mangler ferdigheten
  const deltid = randomUUID(); // har ferdigheten, men er opptatt
  const serviceId = randomUUID();
  const versionId = randomUUID();

  const from = new Date('2026-09-01T09:00:00Z');
  const to = new Date('2026-09-01T10:00:00Z');

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);

    await owner
      .insert(schema.tenants)
      .values({ id: tenantId, name: 'V', slug: `m-${tenantId.slice(0, 8)}` });
    await owner.insert(schema.mechanics).values([
      { id: spesialist, tenantId, name: 'Spesialist' },
      { id: generalist, tenantId, name: 'Generalist' },
      { id: nybegynner, tenantId, name: 'Nybegynner' },
      { id: deltid, tenantId, name: 'Opptatt' },
    ]);

    // Ferdighetskatalogen + kompetansen — kilden matcheren leser (F3-12).
    await owner.insert(schema.skills).values([
      { tenantId, key: 'mc-eu', name: 'EU-kontroll MC' },
      { tenantId, key: 'båtmotor', name: 'Båtmotor' },
      { tenantId, key: 'dekkskift', name: 'Dekkskift' },
    ]);
    await owner.insert(schema.mechanicSkills).values([
      // Spesialisten: høyt nivå på mange ting.
      { tenantId, mechanicId: spesialist, skillKey: 'mc-eu', level: 5 },
      { tenantId, mechanicId: spesialist, skillKey: 'båtmotor', level: 5 },
      // Generalisten: akkurat det jobben krever.
      { tenantId, mechanicId: generalist, skillKey: 'mc-eu', level: 3 },
      // Nybegynneren mangler ferdigheten helt.
      { tenantId, mechanicId: nybegynner, skillKey: 'dekkskift', level: 2 },
      // «Opptatt» kan jobben, men er booket.
      { tenantId, mechanicId: deltid, skillKey: 'mc-eu', level: 3 },
    ]);
    await owner
      .insert(schema.services)
      .values({ id: serviceId, tenantId, name: 'EU MC', vehicleType: 'mc' });
    await owner.insert(schema.serviceVersions).values({
      id: versionId,
      tenantId,
      serviceId,
      version: 1,
      durationMinutes: 60,
      skills: ['mc-eu'],
    });

    // «Opptatt» er allerede booket i nøyaktig dette vinduet.
    await createBooking(app, {
      tenantId,
      mechanicId: deltid,
      serviceVersionId: versionId,
      startsAt: from,
      endsAt: to,
      idempotencyKey: randomUUID(),
    });
  });

  afterAll(async () => {
    await owner.delete(schema.bookings).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.serviceVersions).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.services).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.mechanicSkills).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.skills).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.mechanics).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.tenants).where(sql`id = ${tenantId}`);
  });

  it('diskvalifiserer den som mangler ferdigheten', async () => {
    const result = await createRuleMatcher(app).match({
      tenantId,
      serviceId,
      requiredSkills: ['mc-eu'],
      from,
      to,
    });
    expect(result.map((c) => c.mechanicId)).not.toContain(nybegynner);
  });

  it('diskvalifiserer den som allerede er booket i vinduet', async () => {
    const result = await createRuleMatcher(app).match({
      tenantId,
      serviceId,
      requiredSkills: ['mc-eu'],
      from,
      to,
    });
    expect(result.map((c) => c.mechanicId)).not.toContain(deltid);
  });

  it('generalisten rangeres FORAN spesialisten på en enkel jobb', async () => {
    const result = await createRuleMatcher(app).match({
      tenantId,
      serviceId,
      requiredSkills: ['mc-eu'],
      from,
      to,
    });
    expect(result).toHaveLength(2);
    expect(result[0]?.mechanicId).toBe(generalist);
    expect(result[1]?.mechanicId).toBe(spesialist);
  });

  it('hver kandidat har en begrunnelse', async () => {
    const result = await createRuleMatcher(app).match({
      tenantId,
      serviceId,
      requiredSkills: ['mc-eu'],
      from,
      to,
    });
    expect(result[0]?.reasons.length).toBeGreaterThan(0);
  });

  it('ingen kandidater når ingen har ferdigheten', async () => {
    const result = await createRuleMatcher(app).match({
      tenantId,
      serviceId,
      requiredSkills: ['helikopter'],
      from,
      to,
    });
    expect(result).toHaveLength(0);
  });
});
