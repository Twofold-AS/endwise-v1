import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * Vi sjekker feil-koden, ikke meldingsteksten. Meldingene er norske og skal
 * kunne skrives om uten at en sikkerhetstest brekker — og en test som består
 * fordi ordlyden tilfeldigvis passet, tester ordlyden og ikke sperren.
 */
async function forventerForbidden(kall: Promise<unknown>) {
  await expect(kall).rejects.toMatchObject({ code: 'FORBIDDEN' });
}

/**
 * angrepstest: hvem får invitere?
 * Vi kaller `appRouter` direkte med en håndlaget context, ikke over HTTP.
 * Det er med vilje — en angriper går heller ikke gjennom UI-et. Ruta må stå
 * imot et rått kall fra en som har en gyldig sesjon, men feil rolle.
 * Skjulte knapper er ingen sperre. Sperren er `adminProcedure` pluss den
 * eksplisitte rollesjekken i ruta.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F1-10: hvem kan invitere', () => {
  let owner: Database;
  let app: Database;
  const tenantId = randomUUID();

  const ctx = (role: string, userId = 'bruker-test') => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
  });

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner
      .insert(schema.tenants)
      .values({ id: tenantId, name: 'Inv-gate', slug: `invgate-${tenantId.slice(0, 8)}` });
    await owner.insert(schema.organization).values({
      id: tenantId,
      name: 'Inv-gate',
      slug: `invgate-${tenantId.slice(0, 8)}`,
      createdAt: new Date(),
    });
  });

  afterAll(async () => {
    await owner.delete(schema.invitations).where(eq(schema.invitations.tenantId, tenantId));
    await owner.delete(schema.organization).where(eq(schema.organization.id, tenantId));
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, tenantId));
  });

  /* Angrep: feil rolle */

  it('⛔ ANGREP: dealer_staff kan ikke invitere', async () => {
    const caller = appRouter.createCaller(ctx('dealer_staff') as never);
    await forventerForbidden(
      caller.invitasjoner.opprett({ epost: 'ny@verksted.no', funksjon: 'selger' }),
    );
  });

  it('⛔ ANGREP: customer kan ikke invitere', async () => {
    const caller = appRouter.createCaller(ctx('customer') as never);
    await forventerForbidden(
      caller.invitasjoner.opprett({ epost: 'ny@verksted.no', funksjon: 'selger' }),
    );
  });

  it('⛔ ANGREP: dealer_staff kan ikke engang SE åpne invitasjoner', async () => {
    // Lista røper hvem verkstedet er i ferd med å ansette. Den hører til
    // lederen, ikke til enhver innlogget.
    const caller = appRouter.createCaller(ctx('dealer_staff') as never);
    await forventerForbidden(caller.invitasjoner.list());
  });

  it('⛔ ANGREP: dealer_staff kan ikke tilbakekalle', async () => {
    const caller = appRouter.createCaller(ctx('dealer_staff') as never);
    await forventerForbidden(caller.invitasjoner.tilbakekall({ id: randomUUID() }));
  });

  /* Lederen slipper gjennom */

  it('dealer_admin kan invitere', async () => {
    const caller = appRouter.createCaller(ctx('dealer_admin') as never);
    const res = await caller.invitasjoner.opprett({
      epost: 'Godkjent@Verksted.no',
      funksjon: 'mekaniker',
    });
    expect(res.epost).toBe('godkjent@verksted.no');
    expect(res.funksjon).toBe('mekaniker');
  });

  it('⛔ lederen kan ikke invitere til `leder` — avvist av inputvalideringen', async () => {
    const caller = appRouter.createCaller(ctx('dealer_admin') as never);
    await expect(
      // @ts-expect-error — poenget er at runtime avviser den, ikke bare typene.
      caller.invitasjoner.opprett({ epost: 'sjef@verksted.no', funksjon: 'leder' }),
    ).rejects.toThrow();
  });

  it('⛔ lederen kan ikke oppgi en annen tenant — feltet finnes ikke', async () => {
    const caller = appRouter.createCaller(ctx('dealer_admin') as never);
    const fremmed = randomUUID();
    const res = await caller.invitasjoner.opprett({
      // @ts-expect-error — sendes med vilje; Zod skal strippe den.
      tenantId: fremmed,
      epost: 'forsok@verksted.no',
      funksjon: 'selger',
    });
    // Invitasjonen havnet i vår tenant, ikke i den oppgitte.
    const [rad] = await owner
      .select({ tenantId: schema.invitations.tenantId })
      .from(schema.invitations)
      .where(eq(schema.invitations.id, res.id));
    expect(rad?.tenantId).toBe(tenantId);
    expect(rad?.tenantId).not.toBe(fremmed);
  });
});
