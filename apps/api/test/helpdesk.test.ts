import { randomUUID } from 'node:crypto';
import { createDb, type Database, eq, schema, sql } from '@endwise/db';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * F5-23 — HELPDESK: hvem får skrive, og hva ser en leser?
 *
 * ⛔ **Kjernespørsmålet:** en artikkel publisert her vises i sidebaren hos ALLE
 * forhandlere. Klarer en `dealer_admin` å skrive en, kan ett verksted sende
 * innhold inn i 249 andres navigasjon. Skrivestien er derfor
 * `endwiseAdminProcedure` og ikke `adminProcedure` — forskjellen er nettopp at
 * den siste ville sluppet dealer_admin inn.
 *
 * ⚠️ Tabellene har INGEN RLS (globalt innhold, se skjemaet). Da er ruta hele
 * beskyttelsen, og det er ruta denne testen angriper — direkte på `appRouter`,
 * ikke gjennom UI-et.
 */
const OWNER_URL = process.env.DATABASE_URL;
const APP_URL = process.env.APP_DATABASE_URL;
const describeDb = OWNER_URL && APP_URL ? describe : describe.skip;

describeDb('F5-23 — helpdesk', () => {
  let owner: Database;
  let app: Database;
  const tenant = randomUUID();
  const endwise = `hd-endwise-${randomUUID()}`;
  const forhandler = `hd-dealer-${randomUUID()}`;
  const ansatt = `hd-staff-${randomUUID()}`;

  const ctx = (userId: string, role: 'endwise_admin' | 'dealer_admin' | 'dealer_staff') => ({
    db: app,
    events: { publish: async () => {} } as never,
    tenantId: tenant,
    userId,
    role,
  });

  const somEndwise = () => appRouter.createCaller(ctx(endwise, 'endwise_admin') as never);
  const somForhandler = () => appRouter.createCaller(ctx(forhandler, 'dealer_admin') as never);
  const somAnsatt = () => appRouter.createCaller(ctx(ansatt, 'dealer_staff') as never);

  const slugger: string[] = [];
  let artikkelId = '';

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    app = createDb(APP_URL as string);
    await owner
      .insert(schema.tenants)
      .values({ id: tenant, name: 'Helpdesk-test', slug: `hd-${tenant.slice(0, 8)}` });
    await owner.insert(schema.user).values([
      { id: endwise, name: 'Endwise', email: `${endwise}@test.no`, emailVerified: true },
      { id: forhandler, name: 'Forhandler', email: `${forhandler}@test.no`, emailVerified: true },
      { id: ansatt, name: 'Ansatt', email: `${ansatt}@test.no`, emailVerified: true },
    ]);
  });

  afterAll(async () => {
    await owner
      .delete(schema.helpdeskReads)
      .where(sql`user_id in (${endwise}, ${forhandler}, ${ansatt})`)
      .catch(() => {});
    for (const s of slugger) {
      await owner.delete(schema.helpdeskArticles).where(eq(schema.helpdeskArticles.slug, s));
    }
    await owner.delete(schema.user).where(sql`id in (${endwise}, ${forhandler}, ${ansatt})`);
    await owner.delete(schema.tenants).where(eq(schema.tenants.id, tenant));
  });

  /* ══ ANGREP: forhandlere skal ikke kunne skrive ════════════════════════ */

  const utkast = {
    title: 'Kapret artikkel fra en forhandler',
    summary: 'Denne skal aldri bli opprettet av noen andre enn Endwise.',
    body: 'Om denne finnes i basen, er gaten åpen.',
    image: null,
    published: true,
  };

  it('ANGREP: dealer_admin kan ikke opprette en artikkel', async () => {
    await expect(somForhandler().helpdesk.opprett(utkast)).rejects.toThrow(
      /Kun Endwise-admin|FORBIDDEN/i,
    );
  });

  it('ANGREP: dealer_staff kan ikke opprette en artikkel', async () => {
    await expect(somAnsatt().helpdesk.opprett(utkast)).rejects.toThrow(
      /Kun Endwise-admin|FORBIDDEN/i,
    );
  });

  it('ANGREP: dealer_admin kan ikke se kladdelista', async () => {
    // `alle` returnerer OGSÅ upubliserte. Det er Endwise-internt.
    await expect(somForhandler().helpdesk.alle()).rejects.toThrow(/Kun Endwise-admin|FORBIDDEN/i);
  });

  /* ══ ENDWISE-ADMIN skriver ════════════════════════════════════════════ */

  it('endwise_admin kan opprette, og slug utledes av tittelen', async () => {
    const rad = await somEndwise().helpdesk.opprett({
      title: 'Slik fungerer å teste ting',
      summary: 'En artikkel som finnes kun for testens skyld.',
      body: 'Første avsnitt.\n\nAndre avsnitt.',
      image: '/images/img_1.jpg',
      published: true,
    });
    expect(rad?.slug).toBe('slik-fungerer-a-teste-ting');
    if (rad) {
      artikkelId = rad.id;
      slugger.push(rad.slug);
    }
  });

  it('to artikler med samme tittel gir ulik slug i stedet for en krasj', async () => {
    const rad = await somEndwise().helpdesk.opprett({
      title: 'Slik fungerer å teste ting',
      summary: 'Samme tittel som over, med vilje.',
      body: 'Skal få suffiks, ikke feile.',
      image: null,
      published: false,
    });
    expect(rad?.slug).toBe('slik-fungerer-a-teste-ting-2');
    if (rad) slugger.push(rad.slug);
  });

  it('ANGREP: et bilde utenfor allowlisten avvises', async () => {
    await expect(
      somEndwise().helpdesk.opprett({
        title: 'Bilde fra en fremmed',
        summary: 'Peker på en URL vi ikke eier.',
        body: 'Skal avvises av zod, ikke lagres.',
        image: 'https://example.invalid/spor.png' as never,
        published: true,
      }),
    ).rejects.toThrow();
  });

  /* ══ LESING ═══════════════════════════════════════════════════════════ */

  it('en forhandler KAN lese publiserte artikler', async () => {
    const liste = await somForhandler().helpdesk.list({ limit: 50 });
    expect(liste.some((a) => a.id === artikkelId)).toBe(true);
  });

  it('⛔ kladder er usynlige for lesere — også i bySlug', async () => {
    const liste = await somForhandler().helpdesk.list({ limit: 50 });
    expect(liste.some((a) => a.slug === 'slik-fungerer-a-teste-ting-2')).toBe(false);
    const direkte = await somForhandler().helpdesk.bySlug({
      slug: 'slik-fungerer-a-teste-ting-2',
    });
    expect(direkte).toBeNull();
  });

  /* ══ ULEST ════════════════════════════════════════════════════════════ */

  it('en ny artikkel er ULEST uten at publiseringen skrev noe per bruker', async () => {
    const liste = await somForhandler().helpdesk.list({ limit: 50 });
    expect(liste.find((a) => a.id === artikkelId)?.ulest).toBe(true);
  });

  it('markerLest gjelder KUN deg — ikke kollegaen din', async () => {
    const forFor = await somForhandler().helpdesk.ulesteAntall();
    await somForhandler().helpdesk.markerLest({ articleId: artikkelId });

    const etter = await somForhandler().helpdesk.list({ limit: 50 });
    expect(etter.find((a) => a.id === artikkelId)?.ulest).toBe(false);
    expect(await somForhandler().helpdesk.ulesteAntall()).toBe(forFor - 1);

    // ⛔ Ansatt i samme tenant har ikke lest noe, og skal fortsatt se den som ny.
    const annen = await somAnsatt().helpdesk.list({ limit: 50 });
    expect(annen.find((a) => a.id === artikkelId)?.ulest).toBe(true);
  });

  it('å lese to ganger er ikke en feil, og teller ikke dobbelt', async () => {
    const før = await somForhandler().helpdesk.ulesteAntall();
    await somForhandler().helpdesk.markerLest({ articleId: artikkelId });
    expect(await somForhandler().helpdesk.ulesteAntall()).toBe(før);
  });

  it('ANGREP: markerLest tar ingen userId — den kan ikke settes for andre', async () => {
    /**
     * Ruta har ikke feltet i det hele tatt. «Angrepet» er å sende det og se at
     * det ikke får virkning: ansatt-brukeren skal fortsatt ha artikkelen ulest.
     */
    await somAnsatt().helpdesk.markerLest({
      articleId: artikkelId,
      userId: endwise,
    } as never);

    const somEndwiseSer = await somEndwise().helpdesk.list({ limit: 50 });
    expect(somEndwiseSer.find((a) => a.id === artikkelId)?.ulest).toBe(true);
  });

  /* ══ OPPDATERING ══════════════════════════════════════════════════════ */

  it('oppdatering endrer tittelen, men ALDRI slug — lenka skal overleve', async () => {
    const før = await somEndwise().helpdesk.bySlug({ slug: 'slik-fungerer-a-teste-ting' });
    const oppdatert = await somEndwise().helpdesk.oppdater({
      id: artikkelId,
      title: 'Slik fungerer å teste ting, rettet',
      summary: 'Oppdatert ingress som er lang nok.',
      body: 'Ny brødtekst, fortsatt lang nok.',
      image: null,
      published: true,
    });
    expect(oppdatert?.title).toBe('Slik fungerer å teste ting, rettet');
    expect(oppdatert?.slug).toBe(før?.slug);
  });

  it('ANGREP: dealer_admin kan ikke oppdatere en artikkel', async () => {
    await expect(
      somForhandler().helpdesk.oppdater({
        id: artikkelId,
        title: 'Overtatt',
        summary: 'Skal ikke gå gjennom i det hele tatt.',
        body: 'Skal ikke gå gjennom i det hele tatt.',
        image: null,
        published: true,
      }),
    ).rejects.toThrow(/Kun Endwise-admin|FORBIDDEN/i);
  });
});
