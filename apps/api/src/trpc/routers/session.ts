import { sessionMeTwoFactorRequired } from '@endwise/auth';
import { and, eq, schema, withTenant } from '@endwise/db';
import { erPlattformTenant, landingForPlatform } from '@endwise/modules/plattform';
import {
  type Jobbfunksjon,
  landingForJobbfunksjon,
  resolveJobbfunksjon,
  visningsnavn,
} from '@endwise/modules/profil';
import { resolveDevMode } from '../dev-mode.ts';
import { protectedProcedure, router } from '../init.ts';
import { loggManglendeTenantRad } from '../manglende-tenant.ts';
import { resolveShopFlag } from '../shop-flag.ts';

/**
 * Eier-veiviseren krever en tenants-rad. Uten rad er det ingenting å
 * onboarde — ikke fordi oppstarten lyktes. `!tenant?.onboardingCompletedAt`
 * var true og sendte dealer_admin til /oppstart, der fullfor 404-et.
 * Reparer organization uten speilet tenants-rad (leftover etter slett,
 * eller createTenant som bare skrev org).
 */
export function dealerNeedsOnboarding(input: {
  role: string | null | undefined;
  tenant: { onboardingCompletedAt: Date | null } | null | undefined;
  erPlattform: boolean;
}): boolean {
  if (input.erPlattform) return false;
  if (!input.tenant) return false;
  return input.role === 'dealer_admin' && !input.tenant.onboardingCompletedAt;
}

export function landingEtterSesjon(input: {
  erPlattform: boolean;
  needsOnboarding: boolean;
  manglerTenant: boolean;
  harPlattformMedlemskap: boolean;
  role: string | null | undefined;
  jobbfunksjon: Jobbfunksjon;
}): string {
  if (input.erPlattform) return landingForPlatform(input.role) ?? '/endwise';
  if (input.manglerTenant && input.harPlattformMedlemskap) return '/endwise';
  if (input.needsOnboarding) return '/oppstart';
  return landingForJobbfunksjon(input.jobbfunksjon);
}

/**
 * F1 — «hvem er jeg?» for klient-side rollegating. Rollen kommer fra
 * organization-medlemskapet (assertMember i context). `isMechanic` = brukeren
 * har en mekaniker-profil i tenanten (mechanics.userId) → skal se «Min dag».
 * (Det finnes ingen egen «mekaniker»-rolle; en mekaniker er dealer_staff med
 * en mekaniker-profil.)
 * Utvidet (F5-26/F5-27)
 * Ruta returnerer nå også tenantens navn og kind, samt dev-mode-status.
 * Navnet fjerner «Endwise-forhandler»-placeholderen som har stått hardkodet i
 * sidebaren siden 04.08 — ikke fordi den var stygg, men fordi den var en løgn
 * om hvilken forhandler du er logget inn hos.
 * `devMode` her er kosmetikk for UI-et: den bestemmer hva som vises.
 * Sperren er `resolveDevMode` på hver skrivesti som faktisk gjør noe.
 */
export const sessionRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const devMode = await resolveDevMode(ctx);
    const shopEnabled = await resolveShopFlag(ctx);

    /**
     * Én tenant-tx, så slipp den. Nestede withTenant / ctx.db-select inne i
     * åpen transaksjon stjal ekstra pool-slotter (max 5) og kunne dødlåse
     * first-paint-batchen mot PgBouncer.
     */
    const kjerne = await withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [mech] = await tx
        .select({ id: schema.mechanics.id, name: schema.mechanics.name })
        .from(schema.mechanics)
        .where(eq(schema.mechanics.userId, ctx.userId));

      const [tenant] = await tx
        .select({
          name: schema.tenants.name,
          slug: schema.tenants.slug,
          kind: schema.tenants.kind,
          onboardingCompletedAt: schema.tenants.onboardingCompletedAt,
        })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, ctx.tenantId));

      if (!tenant) loggManglendeTenantRad('session.me', ctx.tenantId);

      /**
       * Eget kallenavn. Mekanikervisningen er per definisjon intern,
       * så her er `visningsnavn(..., 'intern')` riktig. Ruta returnerer også
       * det ekte navnet, slik at kundevendte flater aldri må gjette.
       */
      const [profil] = await tx
        .select({
          nickname: schema.memberProfiles.nickname,
          jobFunction: schema.memberProfiles.jobFunction,
        })
        .from(schema.memberProfiles)
        .where(
          and(
            eq(schema.memberProfiles.tenantId, ctx.tenantId),
            eq(schema.memberProfiles.userId, ctx.userId),
          ),
        );

      /**
       * Varslingslyder (F5-19). Leses utenfor `withTenant`-transaksjonen ville
       * vært like riktig — tabellen er global — men å ta den her sparer en
       * rundtur, og `user_preferences` har ingen tenant-kolonne å bryte mot.
       */
      const [pref] = await tx
        .select({ notificationSounds: schema.userPreferences.notificationSounds })
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.userId, ctx.userId));

      const moduler = await tx
        .select({ key: schema.tenantModules.moduleKey })
        .from(schema.tenantModules)
        .where(eq(schema.tenantModules.enabled, true));

      /**
       * Jobbfunksjon + hvor brukeren skal lande.
       * Utledes på serveren, ikke i klienten. Klienten kjenner ikke
       * mekanikerprofilen sikkert, og en landingsregel som regnes ut to steder
       * blir før eller siden to ulike regler. `landing` er svaret, ikke
       * ingrediensene.
       */
      const jobbfunksjon = resolveJobbfunksjon({
        rolle: ctx.role,
        lagret: profil?.jobFunction ?? null,
        harMekanikerprofil: Boolean(mech),
      });

      return { mech, tenant, profil, pref, moduler, jobbfunksjon };
    });

    /**
     * brukerens eget navn.
     * Sidebaren leste tidligere navnet fra Better-Auth sin klientsesjon,
     * mens `profile.setName` skriver til `user.name` i basen. To hjem for
     * samme opplysning: lagring virket, men sidebaren viste det gamle navnet
     * til neste fulle sidelast, fordi ingenting oppdaterte Better-Auth-cachen.
     * Løsningen er å fjerne det ene hjemmet, ikke å legge til enda en
     * oppfriskning som noen glemmer neste gang. Navnet kommer nå herfra, og
     * `profile.setName` invaliderer allerede denne ruta.
     */
    const [bruker] = await ctx.db
      .select({ name: schema.user.name, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.userId));

    const medlemskap = await ctx.db
      .select({
        id: schema.organization.id,
        name: schema.organization.name,
        slug: schema.organization.slug,
        role: schema.member.role,
      })
      .from(schema.member)
      .innerJoin(schema.organization, eq(schema.organization.id, schema.member.organizationId))
      .where(eq(schema.member.userId, ctx.userId));

    const aktivOrg = medlemskap.find((m) => m.id === ctx.tenantId);
    const plattformOrg = medlemskap.find((m) => erPlattformTenant({ slug: m.slug }));
    const verkstederRaa = medlemskap.filter((m) => !erPlattformTenant({ slug: m.slug }));
    const verksteder: Array<{
      id: string;
      name: string;
      slug: string;
      role: string;
      isMechanic: boolean;
    }> = [];
    for (const v of verkstederRaa) {
      if (v.id === ctx.tenantId) {
        verksteder.push({
          id: v.id,
          name: v.name,
          slug: v.slug,
          role: v.role,
          isMechanic: Boolean(kjerne.mech),
        });
        continue;
      }
      const [mek] = await withTenant(ctx.db, v.id, (tx) =>
        tx
          .select({ id: schema.mechanics.id })
          .from(schema.mechanics)
          .where(eq(schema.mechanics.userId, ctx.userId))
          .limit(1),
      ).catch(() => [null]);
      verksteder.push({
        id: v.id,
        name: v.name,
        slug: v.slug,
        role: v.role,
        isMechanic: Boolean(mek),
      });
    }

    const { mech, tenant, profil, pref, moduler, jobbfunksjon } = kjerne;

    const erPlattform = erPlattformTenant({
      slug: tenant?.slug ?? aktivOrg?.slug,
      kind: tenant?.kind,
    });
    const needsOnboarding = dealerNeedsOnboarding({
      role: ctx.role,
      tenant,
      erPlattform,
    });
    const landing = landingEtterSesjon({
      erPlattform,
      needsOnboarding,
      manglerTenant: !tenant,
      harPlattformMedlemskap: Boolean(plattformOrg),
      role: ctx.role,
      jobbfunksjon,
    });

    return {
      userId: ctx.userId,
      tenantId: ctx.tenantId,
      /** Ditt eget visningsnavn. Ikke kallenavn — se `internNavn`. */
      navn: bruker?.name ?? '',
      epost: bruker?.email ?? '',
      jobbfunksjon,
      landing,
      needsOnboarding,
      tenantName: tenant?.name ?? aktivOrg?.name ?? null,
      tenantSlug: tenant?.slug ?? aktivOrg?.slug ?? null,
      tenantKind: tenant?.kind ?? 'live',
      aktivOrgSlug: aktivOrg?.slug ?? null,
      erPlattform,
      plattformTenantId: plattformOrg?.id ?? null,
      verksteder,
      role: ctx.role,
      isMechanic: Boolean(mech),
      mechanicId: mech?.id ?? null,
      mechanicName: mech?.name ?? null,
      /** Tenant-lokalt kallenavn (`member_profiles.nickname`). */
      kallenavn: profil?.nickname ?? null,
      /**
       * Kort navn i chrome: kallenavn hvis satt, ellers visningsnavn.
       * Ikke mekanikernavn — chrome er personen, ikke profilraden.
       */
      internNavn: visningsnavn(
        { navn: bruker?.name ?? '', kallenavn: profil?.nickname ?? null },
        'intern',
      ),
      /** Ingen rad = aldri rørt = standard PÅ. */
      varslingslyder: pref?.notificationSounds ?? true,
      /** Aktive tillegg (`tenant_modules.enabled`). Basis-moduler står ikke her. */
      moduler: moduler.map((m) => m.key),
      devMode,
      /** Kosmetikk. Sperren er shopProcedure. Fail-safe av. */
      shopEnabled,
      /** Alltid false etter innlogging — sidene lastes uten godkjent 2FA. */
      twoFactorRequired: sessionMeTwoFactorRequired({
        twoFactorEnabled: undefined,
      }),
    };
  }),
});
