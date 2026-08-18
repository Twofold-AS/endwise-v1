import { randomUUID } from 'node:crypto';
import { createDb, type Database, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createAuth } from '../src/auth.ts';
import { createTenant } from '../src/tenant.ts';

/**
 * F1-04 — **«LÅST INNE»-TESTEN.**
 *
 * ── Bugen denne fanger ────────────────────────────────────────────────────
 * `auth.api.createOrganization` gir oppretteren Better-Auths standardrolle
 * `owner`. Vår RBAC-modell kjenner ikke den verdien: `OrgRole` er
 * `customer | dealer_staff | dealer_admin | endwise_admin`.
 *
 * En bruker som ble stående med `owner` matchet derfor ingen rolleliste i
 * navigasjonen. Sidebar-radene forsvant, kontekstvelgeren forsvant, og
 * brukeren var **låst inne i tenanten uten en dør ut** — nøyaktig det som
 * skjedde i «Yamaha Bergen» 09.08.2026.
 *
 * Det var ikke et sikkerhetshull. Det var verre på sin egen måte: en stille
 * feil som ikke ga noen feilmelding, bare en app som manglet halvparten av seg
 * selv. Derfor testes det på ROLLEN, ikke på UI-et — UI-et er bare der det ble
 * synlig.
 */
const OWNER_URL = process.env.DATABASE_URL;
/**
 * Krever OGSÅ BETTER_AUTH_SECRET: testen instansierer en ekte Better-Auth for å
 * gå gjennom den FAKTISKE opprettelsesveien. En test som stubbet den ville ikke
 * fanget bugen, siden bugen lå i hva Better-Auth selv skriver.
 * Kjør med .env lastet, f.eks. `node --env-file=.env` i test-kommandoen.
 * Uten secret skippes testen i stedet for å feile på en manglende variabel.
 */
const describeDb = OWNER_URL && process.env.BETTER_AUTH_SECRET ? describe : describe.skip;

/** De eneste rollene resten av systemet forstår. Speiler `OrgRole` i nav.ts. */
const KJENTE_ROLLER = ['customer', 'dealer_staff', 'dealer_admin', 'endwise_admin'];

describeDb('F1-04: createTenant normaliserer eierens rolle', () => {
  let owner: Database;
  const userId = randomUUID();
  const slug = `rolletest-${randomUUID().slice(0, 8)}`;
  let tenantId: string;

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    await owner.insert(schema.user).values({
      id: userId,
      name: 'Rolle Testesen',
      email: `${userId}@test.invalid`,
      emailVerified: true,
    });

    const auth = createAuth(owner);
    ({ tenantId } = await createTenant(auth, owner, {
      name: 'Rolletest AS',
      slug,
      ownerUserId: userId,
      kind: 'demo',
    }));
  });

  afterAll(async () => {
    if (!tenantId) return;
    await owner.delete(schema.tenantModules).where(sql`tenant_id = ${tenantId}`);
    await owner.delete(schema.tenants).where(sql`id = ${tenantId}`);
    await owner.delete(schema.member).where(sql`organization_id = ${tenantId}`);
    await owner.delete(schema.organization).where(sql`id = ${tenantId}`);
    await owner.delete(schema.user).where(sql`id = ${userId}`);
  });

  it('⛔ eieren står IKKE igjen som Better-Auths «owner»', async () => {
    const [medlem] = await owner
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(sql`organization_id = ${tenantId} and user_id = ${userId}`);

    expect(medlem?.role).not.toBe('owner');
  });

  it('eieren blir dealer_admin — det doc-kommentaren alltid har lovet', async () => {
    const [medlem] = await owner
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(sql`organization_id = ${tenantId} and user_id = ${userId}`);

    expect(medlem?.role).toBe('dealer_admin');
  });

  it('rollen er innenfor RBAC-modellen — ellers forsvinner navigasjonen', async () => {
    const [medlem] = await owner
      .select({ role: schema.member.role })
      .from(schema.member)
      .where(sql`organization_id = ${tenantId} and user_id = ${userId}`);

    expect(KJENTE_ROLLER).toContain(medlem?.role);
  });
});
