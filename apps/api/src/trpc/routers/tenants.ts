import { createAuth, createTenant } from '@endwise/auth';
import { asc, desc, eq, schema, sql, withPlatformAdmin, withTenant } from '@endwise/db';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { resolveDevMode } from '../dev-mode.ts';
import { endwiseAdminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * F5-26 / F5-27 — FORHANDLER-OPPRETTING OG DEMO-TENANTS.
 *
 * ⛔ **Alt som skriver her er `endwiseAdminProcedure`, ikke `adminProcedure`.**
 * Forskjellen er ikke kosmetisk: `adminProcedure` slipper inn `dealer_admin`,
 * og en forhandler skal ikke kunne opprette forhandlere.
 *
 * `current` er unntaket — den er `protectedProcedure`, fordi den bare svarer
 * på «hva heter tenanten jeg allerede er i?». Den kan ikke lekke noe RLS ikke
 * allerede har gitt deg.
 */

/** Slug: liten forbokstav, tall og bindestrek. Den havner i URL-er. */
const slugSchema = z
  .string()
  .min(2)
  .max(48)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Kun små bokstaver, tall og bindestrek');

/**
 * TILLEGGENE en ny forhandler starter med.
 *
 * ⚠️ F0-16: **tom med vilje.** Basis (Verkstedet, Innboks, Saker, Kunder, Lager,
 * Helpdesk, Settings) har ingen gate og trenger ingen rad her — en ny forhandler
 * kan drive verkstedet fra dag én. Tillegg kommer med abonnementet (F5-32),
 * ikke med opprettelsen. Entitlements er en salgsbeslutning, ikke en default.
 */
const START_MODULER: string[] = [];

export const tenantsRouter = router({
  /**
   * Hvem er jeg hos? Brukes til å erstatte «Endwise-forhandler»-placeholderen
   * i sidebaren med tenantens ekte navn.
   */
  current: protectedProcedure.query(({ ctx }) =>
    withTenant(ctx.db, ctx.tenantId as string, async (tx) => {
      const [t] = await tx
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          kind: schema.tenants.kind,
        })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, ctx.tenantId as string));
      return t ?? null;
    }),
  ),

  /**
   * Alle forhandlere. Den ene lovlige kryss-tenant-lesningen i systemet.
   *
   * ⚠️ **Rettet 07.08.2026 — sto stille tom.** Den gikk på `ctx.db` uten
   * tenant-kontekst, i den tro at «rollen er isolasjonen her». Men RLS på
   * `tenants` er `id = current_setting('app.tenant_id')`, og uten den satt gir
   * policyen **null rader, ikke alle rader**. Siden viste ingen forhandlere, og
   * ingenting feilet — den bare var tom.
   *
   * `withPlatformAdmin` slår på en SELECT-ONLY-policy for nettopp dette. Se
   * `packages/db/src/client.ts` for hvorfor det er tryggere enn alternativet.
   *
   * Feltene er minimale — navn, slug, kind, dato. Ingen forhandlerdata, ingen
   * kunde-PII.
   */
  list: endwiseAdminProcedure.query(({ ctx }) =>
    withPlatformAdmin(ctx.db, (tx) =>
      tx
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          kind: schema.tenants.kind,
          createdAt: schema.tenants.createdAt,
        })
        .from(schema.tenants)
        .orderBy(desc(schema.tenants.createdAt)),
    ),
  ),

  /**
   * F1-07 — Live plattformtall. Ingen Stripe, ingen mock.
   *
   *  · `tenants` via `withPlatformAdmin` (den ene lovlige kryss-tenant-lesningen)
   *  · `user` og `member` har bevisst ingen RLS (Better-Auth, ADR-002)
   *
   * Bookinger telles IKKE: `withPlatformAdmin` åpner bare `tenants`, og en
   * runde `withTenant` per forhandler er ikke billig. Tom telling er ærlig.
   */
  census: endwiseAdminProcedure.query(async ({ ctx }) => {
    const [tenants] = await withPlatformAdmin(ctx.db, (tx) =>
      tx
        .select({
          totalt: sql<number>`count(*)::int`,
          live: sql<number>`count(*) filter (where ${schema.tenants.kind} = 'live')::int`,
          demo: sql<number>`count(*) filter (where ${schema.tenants.kind} = 'demo')::int`,
        })
        .from(schema.tenants),
    );

    const [brukere] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(schema.user);
    const [medlemskap] = await ctx.db.select({ n: sql<number>`count(*)::int` }).from(schema.member);

    return {
      forhandlere: tenants?.totalt ?? 0,
      forhandlereLive: tenants?.live ?? 0,
      forhandlereDemo: tenants?.demo ?? 0,
      brukere: brukere?.n ?? 0,
      medlemskap: medlemskap?.n ?? 0,
    };
  }),

  /**
   * F1-07 / F0-04 — READ-ONLY entitlements per forhandler.
   *
   * `tenant_modules` har RLS. `withPlatformAdmin` åpner den ikke. Vi lister
   * tenants via platform-admin, og leser modulene i hver tenants egen
   * `withTenant` — samme mønster som `myDemoTenants`. Ingen skriving.
   */
  listModules: endwiseAdminProcedure.query(async ({ ctx }) => {
    const tenants = await withPlatformAdmin(ctx.db, (tx) =>
      tx
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          kind: schema.tenants.kind,
        })
        .from(schema.tenants)
        .orderBy(asc(schema.tenants.name)),
    );

    const rader: Array<{
      id: string;
      name: string;
      slug: string;
      kind: (typeof tenants)[number]['kind'];
      modules: Array<{ moduleKey: string; enabled: boolean; plan: string | null }>;
    }> = [];

    for (const t of tenants) {
      const modules = await withTenant(ctx.db, t.id, (tx) =>
        tx
          .select({
            moduleKey: schema.tenantModules.moduleKey,
            enabled: schema.tenantModules.enabled,
            plan: schema.tenantModules.plan,
          })
          .from(schema.tenantModules)
          .where(eq(schema.tenantModules.tenantId, t.id)),
      ).catch(() => [] as Array<{ moduleKey: string; enabled: boolean; plan: string | null }>);
      rader.push({ ...t, modules });
    }

    return rader;
  }),

  /**
   * Opprett en forhandler. Eieren må FINNES fra før — vi setter aldri passord
   * for andre. `ownerEmail` slås opp; finnes brukeren ikke, er svaret nei og
   * ikke «da lager vi en».
   *
   * RLS-fella ved insert er håndtert i `createTenant` (packages/auth) — den
   * setter `app.tenant_id` til den NYE id-en før skriving, så `withCheck`
   * passerer uten at policyen svekkes.
   */
  create: endwiseAdminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(120),
        slug: slugSchema,
        ownerEmail: z.email(),
        kind: z.enum(['live', 'demo']).default('live'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [eksisterende] = await ctx.db
        .select({ id: schema.tenants.id })
        .from(schema.tenants)
        .where(eq(schema.tenants.slug, input.slug));
      if (eksisterende) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Slug «${input.slug}» er allerede i bruk`,
        });
      }

      const [eier] = await ctx.db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(eq(schema.user.email, input.ownerEmail));
      if (!eier) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Fant ingen bruker med e-post ${input.ownerEmail}. Brukeren må registrere seg først — vi oppretter ikke kontoer på andres vegne.`,
        });
      }

      const auth = createAuth(ctx.db);
      const { tenantId } = await createTenant(auth, ctx.db, {
        name: input.name,
        slug: input.slug,
        ownerUserId: eier.id,
        modules: START_MODULER,
        kind: input.kind,
      });

      return { tenantId, name: input.name, slug: input.slug, kind: input.kind };
    }),

  /** Er dev-mode faktisk på for meg? Tre betingelser — se `dev-mode.ts`. */
  devMode: protectedProcedure.query(({ ctx }) => resolveDevMode(ctx)),

  /**
   * F5-27 — Fyll en DEMO-tenant med placeholder-data.
   *
   * ⚠️ **Går gjennom `withTenant`, ikke som DB-eier.** Dev-seeden
   * (`apps/api/scripts/seed.ts`) skriver som eier og sier det selv: «RLS er
   * usynlig». Det er greit for et engangsscript på kommandolinja. Det er IKKE
   * greit for noe som kan kalles fra en innlogget flate — da ville
   * demo-knappen vært den ene skrivestien i systemet uten isolasjon.
   *
   * At det går gjennom vanlige veier er dessuten poenget med demo-data: den
   * skal bevise at rutene virker. Hardkodet demo-UI beviser ingenting.
   *
   * Idempotent: kaller du to ganger, får du ikke to sett.
   */
  seedDemo: endwiseAdminProcedure.mutation(async ({ ctx }) => {
    const dev = await resolveDevMode(ctx);
    if (!dev.enabled) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: dev.isDemoTenant
          ? 'Dev-mode er ikke på'
          : 'Denne tenanten er ikke en demo-tenant (kind ≠ demo)',
      });
    }

    return withTenant(ctx.db, ctx.tenantId as string, async (tx) => {
      // ① Mekaniker-profil på MEG. Dette er hele grunnen til at mekaniker-
      //    konteksten er usynlig for en admin: `isMechanic` krever en rad her.
      //    Vi jukser ikke med gaten — vi oppretter dataene gaten spør etter.
      const [minMek] = await tx
        .select({ id: schema.mechanics.id })
        .from(schema.mechanics)
        .where(eq(schema.mechanics.userId, ctx.userId as string));

      let mechanicId = minMek?.id;
      if (!mechanicId) {
        const [ny] = await tx
          .insert(schema.mechanics)
          .values({
            tenantId: ctx.tenantId as string,
            userId: ctx.userId as string,
            name: 'Demo-mekaniker (deg)',
            capacity: 2,
          })
          .returning({ id: schema.mechanics.id });
        mechanicId = ny?.id;
      }

      // ② En tjeneste, så bookinger har noe å peke på.
      const [finnesTjeneste] = await tx
        .select({ id: schema.services.id })
        .from(schema.services)
        .where(eq(schema.services.tenantId, ctx.tenantId as string));

      let serviceId = finnesTjeneste?.id;
      if (!serviceId) {
        const [ny] = await tx
          .insert(schema.services)
          .values({
            tenantId: ctx.tenantId as string,
            name: 'EU-kontroll MC (demo)',
            // Endwise er MC/båt/ATV — ikke bil. Se vehicleTypeEnum.
            vehicleType: 'mc',
          })
          .returning({ id: schema.services.id });
        serviceId = ny?.id;
      }

      // ③ En kunde og et kjøretøy.
      const [finnesKunde] = await tx
        .select({ id: schema.customers.id })
        .from(schema.customers)
        .where(eq(schema.customers.tenantId, ctx.tenantId as string));

      let customerId = finnesKunde?.id;
      if (!customerId) {
        const [ny] = await tx
          .insert(schema.customers)
          .values({
            tenantId: ctx.tenantId as string,
            name: 'Demo Demosen',
            email: 'demo@example.invalid',
          })
          .returning({ id: schema.customers.id });
        customerId = ny?.id;
      }

      return {
        mechanicId: mechanicId ?? null,
        serviceId: serviceId ?? null,
        customerId: customerId ?? null,
      };
    });
  }),

  /**
   * F5-28 ③ — Demo-tenants jeg ER MEDLEM AV.
   *
   * ⛔ **Ingen auto-innmelding.** Denne ruten lister kun tenants der det
   * allerede finnes en `member`-rad for meg. Den melder aldri noen inn i noe.
   * Å bytte til en tenant man ikke er medlem av er ikke en funksjon som
   * mangler — det er funksjonen vi med vilje ikke bygger.
   *
   * Selve byttet skjer klient-side via Better-Auths `organization.setActive`,
   * som validerer medlemskapet på nytt server-side. Denne lista er kun for å
   * kunne VISE valgene; den gir ingen tilgang.
   */
  myDemoTenants: endwiseAdminProcedure.query(async ({ ctx }) => {
    /**
     * ⚠️ **Ikke en JOIN — og det er to grunner til det.** (Rettet 07.08.2026;
     * den opprinnelige versjonen KASTET og hadde aldri virket.)
     *
     * 1. `member.organization_id` er `text` (Better-Auth eier den), mens
     *    `tenants.id` er `uuid`. Postgres sier `operator does not exist:
     *    text = uuid` — joinen kunne aldri gått.
     * 2. Selv med en cast ville den vært tom: `tenants` har RLS-policyen
     *    `id = current_setting('app.tenant_id')`, og en spørring utenfor
     *    `withTenant` har ingen tenant satt → **null rader, ikke alle rader**.
     *
     * I stedet: `member` har ingen RLS (ADR-002: Better-Auth-tabellene er
     * globale identiteter), så medlemskapene leses direkte. Deretter hentes
     * hver tenant i SIN EGEN `withTenant`-kontekst.
     *
     * Det er ikke bare en omvei rundt problemet — det er strengere. Før var
     * «kun tenants du er medlem av» en WHERE-betingelse vi selv skrev. Nå er
     * det RLS som håndhever det, ett oppslag av gangen. Lista er dessuten
     * kort: en bruker er medlem av en håndfull organisasjoner.
     */
    const medlemskap = await ctx.db
      .select({ orgId: schema.member.organizationId })
      .from(schema.member)
      .where(eq(schema.member.userId, ctx.userId as string));

    const demo: { id: string; name: string; slug: string }[] = [];
    for (const { orgId } of medlemskap) {
      const [t] = await withTenant(ctx.db, orgId, (tx) =>
        tx
          .select({
            id: schema.tenants.id,
            name: schema.tenants.name,
            slug: schema.tenants.slug,
            kind: schema.tenants.kind,
          })
          .from(schema.tenants)
          .where(eq(schema.tenants.id, orgId)),
      ).catch(() => []);
      if (t?.kind === 'demo') demo.push({ id: t.id, name: t.name, slug: t.slug });
    }

    return demo.sort((a, b) => a.name.localeCompare(b.name, 'nb'));
  }),
});
