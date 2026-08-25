import {
  authEnv,
  createAuth,
  createTenant,
  createTenantShell,
  sendInvitation,
  sendTwoFactorOtp,
} from '@endwise/auth';
import { and, asc, desc, eq, schema, sql, withPlatformAdmin, withTenant } from '@endwise/db';
import {
  addonKatalog,
  BASIS_MODULES,
  ENDWISE_SLUG,
  erBlokertTildeling,
  erEndwiseSlug,
  erGyldigEkstraTillegg,
  erTierKey,
  pakkeKatalog,
  publishEvent,
  TIER_KEYS,
  utvidPakke,
} from '@endwise/modules';
import { createInvitasjonsmodul } from '@endwise/modules/invitasjoner';
import { erPlattformTenant } from '@endwise/modules/plattform';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { resolveDevMode } from '../dev-mode.ts';
import {
  endwiseAdminProcedure,
  endwiseSupportProcedure,
  protectedProcedure,
  router,
} from '../init.ts';
import { hashSlettKode, lagSlettKode, slettKodeErGyldig } from '../slett-otp.ts';
import { loggSlettPostgresFeil, mapSlettPostgresFeil } from '../slett-postgres.ts';

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
 * Ekstra TILLEGG utenom nivået. Tom med vilje — Start/Pro/Enterprise
 * kommer fra TIERS. Admin krysser bare av det som ikke allerede ligger i
 * pakken. shop er aldri ekstra. SMS (twilio) er tillegg på alle nivåer.
 */
const START_MODULER: string[] = [];

const BLOKKERT_MELDING: Record<string, string> = {
  shop: 'Nettbutikk (shop) er blokkert og ikke til salgs.',
};

const ekstraTilleggSchema = z.array(z.string().min(1).max(64)).max(40);

const tildelbareModulerSchema = ekstraTilleggSchema.superRefine((keys, ctx) => {
  for (const key of keys) {
    if (erBlokertTildeling(key)) {
      ctx.addIssue({
        code: 'custom',
        message: BLOKKERT_MELDING[key] ?? `Kan ikke tildeles: ${key}`,
      });
    }
  }
});

function avvisEkstraTillegg(keys: readonly string[], tierKey: string): string[] {
  const unike = [...new Set(keys)];
  const basis = unike.filter((k) => (BASIS_MODULES as readonly string[]).includes(k));
  if (basis.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Basis-moduler kan ikke tildeles: ${basis.join(', ')}. De er alltid på.`,
    });
  }
  const blokkert = unike.filter((k) => erBlokertTildeling(k) || k === 'shop');
  if (blokkert.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: blokkert.map((k) => BLOKKERT_MELDING[k] ?? `Kan ikke tildeles: ${k}`).join(' '),
    });
  }
  const ugyldige = unike.filter((k) => !erGyldigEkstraTillegg(k, tierKey));
  if (ugyldige.length) {
    throw new TRPCError({
      code: 'BAD_REQUEST',
      message: `Tillegget hører ikke til dette nivået: ${ugyldige.join(', ')}`,
    });
  }
  return unike;
}

function krevIkkeEndwise(tenant: { slug: string; kind?: string | null }, handling: string): void {
  if (erPlattformTenant(tenant) || erEndwiseSlug(tenant.slug)) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: `Du kan ikke ${handling} Endwise-plattformen.`,
    });
  }
}

async function lesTenant(
  db: Parameters<typeof withPlatformAdmin>[0],
  tenantId: string,
): Promise<{
  id: string;
  name: string;
  slug: string;
  kind: 'live' | 'demo' | 'platform';
  plan: string | null;
} | null> {
  const [tenant] = await withPlatformAdmin(db, (tx) =>
    tx
      .select({
        id: schema.tenants.id,
        name: schema.tenants.name,
        slug: schema.tenants.slug,
        kind: schema.tenants.kind,
        plan: schema.tenants.plan,
      })
      .from(schema.tenants)
      .where(eq(schema.tenants.id, tenantId)),
  );
  return tenant ?? null;
}

async function eierInfo(
  db: Parameters<typeof withTenant>[0],
  tenantId: string,
): Promise<{ eierEpost: string | null; eierInviteUbrukt: boolean }> {
  const modul = createInvitasjonsmodul(db);
  const siste = await modul.sisteEierInvitasjon(tenantId);
  const naa = Date.now();
  const ubrukt = Boolean(
    siste && !siste.akseptert && !siste.trukket && siste.utloper.getTime() > naa,
  );
  let epost = siste?.epost ?? null;
  if (!epost) {
    const [medlem] = await db
      .select({ userId: schema.member.userId })
      .from(schema.member)
      .where(
        and(eq(schema.member.organizationId, tenantId), eq(schema.member.role, 'dealer_admin')),
      )
      .limit(1);
    if (medlem) {
      const [bruker] = await db
        .select({ email: schema.user.email })
        .from(schema.user)
        .where(eq(schema.user.id, medlem.userId));
      epost = bruker?.email ?? null;
    }
  }
  return { eierEpost: epost, eierInviteUbrukt: ubrukt };
}

async function adminEpost(db: Parameters<typeof withTenant>[0], userId: string): Promise<string> {
  const [bruker] = await db
    .select({ email: schema.user.email })
    .from(schema.user)
    .where(eq(schema.user.id, userId));
  if (!bruker?.email) {
    throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke e-posten din.' });
  }
  return bruker.email;
}

async function skrivEntitlementAudit(
  tx: Parameters<Parameters<typeof withTenant>[2]>[0],
  input: {
    tenantId: string;
    actor: string;
    action:
      | 'entitlement.granted'
      | 'entitlement.revoked'
      | 'tenant.created'
      | 'tenant.updated'
      | 'tenant.deleted';
    subjectId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await tx.insert(schema.auditLog).values({
    tenantId: input.tenantId,
    actor: input.actor,
    action: input.action,
    subjectType: input.action.startsWith('tenant.') ? 'tenant' : 'tenant_module',
    subjectId: input.subjectId,
    metadata: input.metadata ?? {},
  });
}

async function sendEierLenke(input: {
  db: Parameters<typeof withTenant>[0];
  tenantId: string;
  epost: string;
  invitedBy: string;
  forhandler: string;
}) {
  const modul = createInvitasjonsmodul(input.db);
  await modul.tilbakekallApneEier(input.tenantId, input.epost);
  const { invitasjon, token } = await modul.opprettEier({
    tenantId: input.tenantId,
    epost: input.epost,
    invitedBy: input.invitedBy,
  });
  const base = authEnv.baseUrl;
  const lenke = `${base.replace(/\/$/, '')}/invitasjon/${token}`;
  let sendt = true;
  try {
    await sendInvitation({
      to: invitasjon.epost,
      lenke,
      forhandler: input.forhandler,
      funksjon: 'eier',
      utloper: invitasjon.utloper,
      kind: 'owner',
    });
  } catch (error) {
    sendt = false;
    console.error(`[eier-invitasjon] e-post feilet: ${(error as Error).message}`);
  }
  return { id: invitasjon.id, epost: invitasjon.epost, utloper: invitasjon.utloper, sendt };
}

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
  list: endwiseSupportProcedure.query(async ({ ctx }) => {
    const rader = await withPlatformAdmin(ctx.db, (tx) =>
      tx
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          kind: schema.tenants.kind,
          plan: schema.tenants.plan,
          createdAt: schema.tenants.createdAt,
        })
        .from(schema.tenants)
        .orderBy(desc(schema.tenants.createdAt)),
    );
    return Promise.all(
      rader
        .filter((t) => !erPlattformTenant(t))
        .map(async (t) => {
          const eier = await eierInfo(ctx.db, t.id).catch(() => ({
            eierEpost: null as string | null,
            eierInviteUbrukt: false,
          }));
          return {
            ...t,
            plan: erTierKey(t.plan) ? t.plan : null,
            erEndwise: erEndwiseSlug(t.slug),
            eierEpost: eier.eierEpost,
            eierInviteUbrukt: eier.eierInviteUbrukt,
          };
        }),
    );
  }),

  /**
   * F1-07 — Live plattformtall. Ingen Stripe, ingen mock.
   *
   *  · `tenants` via `withPlatformAdmin` (den ene lovlige kryss-tenant-lesningen)
   *  · `user` og `member` har bevisst ingen RLS (Better-Auth, ADR-002)
   *
   * Bookinger telles IKKE: `withPlatformAdmin` åpner bare `tenants`, og en
   * runde `withTenant` per forhandler er ikke billig. Tom telling er ærlig.
   */
  census: endwiseSupportProcedure.query(async ({ ctx }) => {
    const [tenants] = await withPlatformAdmin(ctx.db, (tx) =>
      tx
        .select({
          totalt: sql<number>`count(*) filter (where ${schema.tenants.kind} <> 'platform' and ${schema.tenants.slug} <> 'endwise')::int`,
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
   * F1-07 / F0-04 — entitlements per forhandler (lesing).
   *
   * `tenant_modules` har RLS. `withPlatformAdmin` åpner den ikke. Vi lister
   * tenants via platform-admin, og leser modulene i hver tenants egen
   * `withTenant`. Skriving er `setModules` (endwise_admin).
   */
  listModules: endwiseAdminProcedure.query(async ({ ctx }) => {
    const tenants = await withPlatformAdmin(ctx.db, (tx) =>
      tx
        .select({
          id: schema.tenants.id,
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          kind: schema.tenants.kind,
          plan: schema.tenants.plan,
        })
        .from(schema.tenants)
        .orderBy(asc(schema.tenants.name)),
    );

    const rader: Array<{
      id: string;
      name: string;
      slug: string;
      kind: (typeof tenants)[number]['kind'];
      plan: 'start' | 'pro' | 'enterprise' | null;
      erEndwise: boolean;
      modules: Array<{
        moduleKey: string;
        enabled: boolean;
        plan: string | null;
        source: string;
      }>;
    }> = [];

    for (const t of tenants.filter((rad) => !erPlattformTenant(rad))) {
      const modules = await withTenant(ctx.db, t.id, (tx) =>
        tx
          .select({
            moduleKey: schema.tenantModules.moduleKey,
            enabled: schema.tenantModules.enabled,
            plan: schema.tenantModules.plan,
            source: schema.tenantModules.source,
          })
          .from(schema.tenantModules)
          .where(eq(schema.tenantModules.tenantId, t.id)),
      ).catch(
        () =>
          [] as Array<{
            moduleKey: string;
            enabled: boolean;
            plan: string | null;
            source: string;
          }>,
      );
      rader.push({
        ...t,
        plan: erTierKey(t.plan) ? t.plan : null,
        erEndwise: erEndwiseSlug(t.slug),
        modules,
      });
    }

    return rader;
  }),

  /** Tillegg Endwise-admin kan krysse av. Basis er ikke med. */
  addonKatalog: endwiseAdminProcedure.query(() => addonKatalog()),

  /** Nivå + TILLEGG. TIERS/TILLEGG er kilden — ingen hardkodede nøkler. */
  pakkeKatalog: endwiseAdminProcedure.query(() => pakkeKatalog()),

  /**
   * Opprett en forhandler + eier-invitasjon.
   *
   * Admin setter aldri passord. Finnes e-posten, blir brukeren `dealer_admin`
   * med en gang og får likevel en sett/bytt-passord-lenke. Finnes den ikke,
   * opprettes tenanten uten eier, og invitee lager kontoen selv.
   *
   * Admin setter pakken (`included`) og hva eieren *kan* legge til
   * i veiviseren (`optional`). `START_MODULER` er tom; shop avvises.
   */
  create: endwiseAdminProcedure
    .input(
      z.object({
        name: z.string().min(2).max(120),
        slug: slugSchema,
        ownerEmail: z.email(),
        kind: z.enum(['live', 'demo']).default('live'),
        tier: z.enum(TIER_KEYS).default('start'),
        included: ekstraTilleggSchema.default([]),
        optional: ekstraTilleggSchema.default([]),
        /** @deprecated Bruk `included` (TILLEGG-nøkler) + `tier`. */
        modules: tildelbareModulerSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (erEndwiseSlug(input.slug)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Slug «${ENDWISE_SLUG}» er reservert for plattformen.`,
        });
      }
      const extraIncluded = avvisEkstraTillegg(input.included, input.tier);
      const extraOptional = avvisEkstraTillegg(input.optional, input.tier);
      const pakke = utvidPakke(input.tier, extraIncluded, extraOptional);
      const included = pakke.included;
      const optional = pakke.optional;
      const epost = input.ownerEmail.trim().toLowerCase();

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

      const [orgSlug] = await ctx.db
        .select({ id: schema.organization.id })
        .from(schema.organization)
        .where(eq(schema.organization.slug, input.slug));
      if (orgSlug) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: `Slug «${input.slug}» er allerede i bruk`,
        });
      }

      const [eier] = await ctx.db
        .select({ id: schema.user.id })
        .from(schema.user)
        .where(sql`lower(${schema.user.email}) = ${epost}`);

      const moduler = included.length ? included : START_MODULER;
      let tenantId: string;
      if (eier) {
        const auth = createAuth(ctx.db);
        ({ tenantId } = await createTenant(auth, ctx.db, {
          name: input.name,
          slug: input.slug,
          ownerUserId: eier.id,
          modules: moduler,
          optionalModules: optional,
          plan: input.tier,
          kind: input.kind,
          onboardingCompleted: false,
        }));
      } else {
        ({ tenantId } = await createTenantShell(ctx.db, {
          name: input.name,
          slug: input.slug,
          modules: moduler,
          optionalModules: optional,
          plan: input.tier,
          kind: input.kind,
        }));
      }

      await withTenant(ctx.db, tenantId, async (tx) => {
        await skrivEntitlementAudit(tx, {
          tenantId,
          actor: ctx.userId,
          action: 'tenant.created',
          subjectId: tenantId,
          metadata: {
            slug: input.slug,
            kind: input.kind,
            plan: input.tier,
            modules: moduler,
            optional,
            ownerEmail: epost,
          },
        });
        for (const key of moduler) {
          await skrivEntitlementAudit(tx, {
            tenantId,
            actor: ctx.userId,
            action: 'entitlement.granted',
            subjectId: key,
            metadata: { moduleKey: key, plan: input.tier, at: 'create' },
          });
        }
      });

      const invite = await sendEierLenke({
        db: ctx.db,
        tenantId,
        epost,
        invitedBy: ctx.userId,
        forhandler: input.name,
      });

      return {
        tenantId,
        name: input.name,
        slug: input.slug,
        kind: input.kind,
        plan: input.tier,
        existingUser: Boolean(eier),
        invite,
      };
    }),

  /**
   * F0-04 / F5-26 — Endwise-admin skriver `tenant_modules`.
   *
   * Mikael overstyrer «Stripe-only write» for tildeling. `moduleProcedure`
   * håndhever fortsatt nøklene. `dealer_admin` får FORBIDDEN (denne ruta er
   * `endwiseAdminProcedure`). Hver endring logges (CWE-778).
   */
  setModules: endwiseAdminProcedure
    .input(
      z.object({
        tenantId: z.uuid(),
        tier: z.enum(TIER_KEYS).default('start'),
        included: ekstraTilleggSchema.default([]),
        optional: ekstraTilleggSchema.default([]),
        /** @deprecated Bruk `included` + `tier`. Beholdt så gamle kall feiler pent. */
        modules: tildelbareModulerSchema.optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const extraIncluded = avvisEkstraTillegg(input.included, input.tier);
      const extraOptional = avvisEkstraTillegg(input.optional, input.tier);
      const pakke = utvidPakke(input.tier, extraIncluded, extraOptional);
      const included = new Set(pakke.included);
      const optional = new Set(pakke.optional);

      const tenant = await lesTenant(ctx.db, input.tenantId);
      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
      }
      krevIkkeEndwise(tenant, 'endre pakken til');

      const result = await withTenant(ctx.db, input.tenantId, async (tx) => {
        const eksisterende = await tx
          .select({
            moduleKey: schema.tenantModules.moduleKey,
            enabled: schema.tenantModules.enabled,
            source: schema.tenantModules.source,
          })
          .from(schema.tenantModules)
          .where(eq(schema.tenantModules.tenantId, input.tenantId));

        const granted: string[] = [];
        const revoked: string[] = [];

        for (const key of included) {
          const rad = eksisterende.find((r) => r.moduleKey === key);
          if (!rad) {
            await tx.insert(schema.tenantModules).values({
              tenantId: input.tenantId,
              moduleKey: key,
              enabled: true,
              source: 'included',
              plan: input.tier,
            });
            granted.push(key);
          } else if (!rad.enabled || rad.source !== 'included') {
            await tx
              .update(schema.tenantModules)
              .set({
                enabled: true,
                source: 'included',
                plan: input.tier,
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.tenantModules.tenantId, input.tenantId),
                  eq(schema.tenantModules.moduleKey, key),
                ),
              );
            if (!rad.enabled) granted.push(key);
          }
        }

        for (const key of optional) {
          const rad = eksisterende.find((r) => r.moduleKey === key);
          if (!rad) {
            await tx.insert(schema.tenantModules).values({
              tenantId: input.tenantId,
              moduleKey: key,
              enabled: false,
              source: 'optional',
              plan: input.tier,
            });
          } else if (rad.source === 'included') {
            await tx
              .update(schema.tenantModules)
              .set({
                enabled: rad.enabled,
                source: rad.enabled ? 'dealer' : 'optional',
                updatedAt: new Date(),
              })
              .where(
                and(
                  eq(schema.tenantModules.tenantId, input.tenantId),
                  eq(schema.tenantModules.moduleKey, key),
                ),
              );
          }
        }

        await tx
          .update(schema.tenants)
          .set({ plan: input.tier, updatedAt: new Date() })
          .where(eq(schema.tenants.id, input.tenantId));

        for (const rad of eksisterende) {
          if (rad.source === 'stripe') continue;
          if (rad.moduleKey === 'shop') continue;
          if (included.has(rad.moduleKey)) continue;
          if (optional.has(rad.moduleKey)) continue;
          if (!rad.enabled) {
            if (rad.source === 'optional') {
              await tx
                .delete(schema.tenantModules)
                .where(
                  and(
                    eq(schema.tenantModules.tenantId, input.tenantId),
                    eq(schema.tenantModules.moduleKey, rad.moduleKey),
                  ),
                );
            }
            continue;
          }
          await tx
            .update(schema.tenantModules)
            .set({ enabled: false, updatedAt: new Date() })
            .where(
              and(
                eq(schema.tenantModules.tenantId, input.tenantId),
                eq(schema.tenantModules.moduleKey, rad.moduleKey),
              ),
            );
          revoked.push(rad.moduleKey);
        }

        for (const key of granted) {
          await skrivEntitlementAudit(tx, {
            tenantId: input.tenantId,
            actor: ctx.userId,
            action: 'entitlement.granted',
            subjectId: key,
            metadata: { moduleKey: key, plan: input.tier, at: 'setModules', source: 'included' },
          });
        }
        for (const key of revoked) {
          await skrivEntitlementAudit(tx, {
            tenantId: input.tenantId,
            actor: ctx.userId,
            action: 'entitlement.revoked',
            subjectId: key,
            metadata: { moduleKey: key, at: 'setModules' },
          });
        }

        return {
          tenantId: input.tenantId,
          granted,
          revoked,
          plan: input.tier,
          modules: [...included],
          optional: [...optional],
        };
      });

      await publishEvent(ctx.db, {
        tenantId: input.tenantId,
        type: 'tenant.modules.changed',
        subjectId: input.tenantId,
        audienceId: null,
        payload: {
          tenantId: result.tenantId,
          plan: result.plan,
          granted: result.granted,
          revoked: result.revoked,
          modules: result.modules,
        },
      });

      return result;
    }),

  /** Send eier-invitasjonen på nytt. Nytt token, gammelt åpent token dør. */
  resendOwnerInvite: endwiseAdminProcedure
    .input(z.object({ tenantId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await lesTenant(ctx.db, input.tenantId);
      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
      }
      krevIkkeEndwise(tenant, 'sende invitasjon på nytt til');

      const eier = await eierInfo(ctx.db, input.tenantId);
      if (!eier.eierInviteUbrukt) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Invitasjonen er allerede brukt. Du sender den aldri på nytt da.',
        });
      }
      if (!eier.eierEpost) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Fant ingen eier-e-post å sende til. Opprett forhandleren på nytt.',
        });
      }

      return sendEierLenke({
        db: ctx.db,
        tenantId: input.tenantId,
        epost: eier.eierEpost,
        invitedBy: ctx.userId,
        forhandler: tenant.name,
      });
    }),

  /**
   * Endre navn, slug og demo-merke. Eier-e-post vises / sendes på nytt —
   * den byttes aldri stille her.
   */
  update: endwiseAdminProcedure
    .input(
      z.object({
        tenantId: z.uuid(),
        name: z.string().min(2).max(120),
        slug: slugSchema,
        kind: z.enum(['live', 'demo']).default('live'),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await lesTenant(ctx.db, input.tenantId);
      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
      }
      krevIkkeEndwise(tenant, 'endre');
      if (erEndwiseSlug(input.slug)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: `Slug «${ENDWISE_SLUG}» er reservert for plattformen.`,
        });
      }

      if (input.slug !== tenant.slug) {
        const [slugOpptatt] = await ctx.db
          .select({ id: schema.tenants.id })
          .from(schema.tenants)
          .where(eq(schema.tenants.slug, input.slug));
        if (slugOpptatt) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Slug «${input.slug}» er allerede i bruk`,
          });
        }
        const [orgSlug] = await ctx.db
          .select({ id: schema.organization.id })
          .from(schema.organization)
          .where(eq(schema.organization.slug, input.slug));
        if (orgSlug && orgSlug.id !== input.tenantId) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: `Slug «${input.slug}» er allerede i bruk`,
          });
        }
      }

      await withTenant(ctx.db, input.tenantId, async (tx) => {
        await tx
          .update(schema.tenants)
          .set({
            name: input.name,
            slug: input.slug,
            kind: input.kind,
            updatedAt: new Date(),
          })
          .where(eq(schema.tenants.id, input.tenantId));
        await tx
          .update(schema.organization)
          .set({ name: input.name, slug: input.slug })
          .where(eq(schema.organization.id, input.tenantId));
        await skrivEntitlementAudit(tx, {
          tenantId: input.tenantId,
          actor: ctx.userId,
          action: 'tenant.updated',
          subjectId: input.tenantId,
          metadata: {
            name: input.name,
            slug: input.slug,
            kind: input.kind,
            forrigeSlug: tenant.slug,
          },
        });
      });

      return {
        tenantId: input.tenantId,
        name: input.name,
        slug: input.slug,
        kind: input.kind,
      };
    }),

  /** Engangskode til innlogget admin. Backend avviser slett uten gyldig kode. */
  sendSlettKode: endwiseAdminProcedure
    .input(z.object({ tenantId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      const tenant = await lesTenant(ctx.db, input.tenantId);
      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
      }
      krevIkkeEndwise(tenant, 'slette');
      if (input.tenantId === ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Du kan ikke slette tenanten du er logget inn i.',
        });
      }

      const epost = await adminEpost(ctx.db, ctx.userId);
      const kode = lagSlettKode();
      const utloper = new Date(Date.now() + 5 * 60 * 1000);
      await ctx.db
        .delete(schema.tenantDeleteChallenges)
        .where(
          and(
            eq(schema.tenantDeleteChallenges.tenantId, input.tenantId),
            eq(schema.tenantDeleteChallenges.requestedBy, ctx.userId),
          ),
        );
      await ctx.db.insert(schema.tenantDeleteChallenges).values({
        tenantId: input.tenantId,
        requestedBy: ctx.userId,
        codeHash: hashSlettKode(kode),
        expiresAt: utloper,
      });
      await sendTwoFactorOtp(epost, kode);
      return { epost, utloper };
    }),

  /**
   * GDPR-slett. Krever slug (eksakt, trimmet) + gyldig 6-sifret kode.
   * Aldri Endwise-tenanten. Aldri tenanten du selv er i.
   */
  slett: endwiseAdminProcedure
    .input(
      z.object({
        tenantId: z.uuid(),
        slug: z.string().min(1).max(48),
        kode: z.string().min(1).max(16),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const tenant = await lesTenant(ctx.db, input.tenantId);
      if (!tenant) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Fant ikke forhandleren' });
      }
      krevIkkeEndwise(tenant, 'slette');
      if (input.tenantId === ctx.tenantId) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message: 'Du kan ikke slette tenanten du er logget inn i.',
        });
      }
      if (input.slug.trim() !== tenant.slug) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: `Slug stemmer ikke. Du sletter ikke ${tenant.name}.`,
        });
      }
      if (!/^\d{6}$/.test(input.kode.trim())) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Koden må være seks siffer.',
        });
      }

      const [utfordring] = await ctx.db
        .select({
          id: schema.tenantDeleteChallenges.id,
          codeHash: schema.tenantDeleteChallenges.codeHash,
          expiresAt: schema.tenantDeleteChallenges.expiresAt,
        })
        .from(schema.tenantDeleteChallenges)
        .where(
          and(
            eq(schema.tenantDeleteChallenges.tenantId, input.tenantId),
            eq(schema.tenantDeleteChallenges.requestedBy, ctx.userId),
          ),
        )
        .limit(1);
      if (!utfordring || utfordring.expiresAt.getTime() <= Date.now()) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Koden er ugyldig eller utløpt. Send en ny kode.',
        });
      }
      if (!slettKodeErGyldig(input.kode, utfordring.codeHash)) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: 'Koden er ugyldig eller utløpt. Send en ny kode.',
        });
      }

      await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        await skrivEntitlementAudit(tx, {
          tenantId: ctx.tenantId,
          actor: ctx.userId,
          action: 'tenant.deleted',
          subjectId: input.tenantId,
          metadata: { slug: tenant.slug, name: tenant.name },
        });
      });

      try {
        await withPlatformAdmin(ctx.db, async (tx) => {
          await tx.execute(sql`select slett_forhandler(${input.tenantId}::uuid)`);
        });
      } catch (error) {
        loggSlettPostgresFeil(input.tenantId, error);
        throw mapSlettPostgresFeil(error);
      }

      await ctx.db
        .delete(schema.tenantDeleteChallenges)
        .where(eq(schema.tenantDeleteChallenges.tenantId, input.tenantId))
        .catch(() => undefined);

      return { tenantId: input.tenantId, name: tenant.name, slug: tenant.slug };
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
