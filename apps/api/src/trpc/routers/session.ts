import { and, eq, schema, withTenant } from '@endwise/db';
import { landingForJobbfunksjon, resolveJobbfunksjon, visningsnavn } from '@endwise/modules/profil';
import { resolveDevMode } from '../dev-mode.ts';
import { protectedProcedure, router } from '../init.ts';

/**
 * F1 — «hvem er jeg?» for klient-side rollegating. Rollen kommer fra
 * organization-medlemskapet (assertMember i context). `isMechanic` = brukeren
 * har en mekaniker-profil i tenanten (mechanics.userId) → skal se «Min dag».
 * (Det finnes ingen egen «mekaniker»-rolle; en mekaniker er dealer_staff med
 * en mekaniker-profil.)
 *
 * ── Utvidet 07.08.2026 (F5-26/F5-27) ───────────────────────────────────────
 * Ruta returnerer nå også tenantens NAVN og KIND, samt dev-mode-status.
 *
 * Navnet fjerner «Endwise-forhandler»-placeholderen som har stått hardkodet i
 * sidebaren siden 04.08 — ikke fordi den var stygg, men fordi den var en løgn
 * om hvilken forhandler du er logget inn hos.
 *
 * ⚠️ `devMode` her er KOSMETIKK for UI-et: den bestemmer hva som VISES.
 * Sperren er `resolveDevMode` på hver skrivesti som faktisk gjør noe.
 */
export const sessionRouter = router({
  me: protectedProcedure.query(async ({ ctx }) => {
    const devMode = await resolveDevMode(ctx);

    return withTenant(ctx.db, ctx.tenantId, async (tx) => {
      const [mech] = await tx
        .select({ id: schema.mechanics.id, name: schema.mechanics.name })
        .from(schema.mechanics)
        .where(eq(schema.mechanics.userId, ctx.userId));

      const [tenant] = await tx
        .select({ name: schema.tenants.name, kind: schema.tenants.kind })
        .from(schema.tenants)
        .where(eq(schema.tenants.id, ctx.tenantId));

      /**
       * F7-06 — Eget kallenavn. Mekanikervisningen er per definisjon INTERN,
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
       * Varslingslyder (F5-19). Leses UTENFOR `withTenant`-transaksjonen ville
       * vært like riktig — tabellen er global — men å ta den her sparer en
       * rundtur, og `user_preferences` har ingen tenant-kolonne å bryte mot.
       */
      const [pref] = await tx
        .select({ notificationSounds: schema.userPreferences.notificationSounds })
        .from(schema.userPreferences)
        .where(eq(schema.userPreferences.userId, ctx.userId));

      /**
       * F1-14 — JOBBFUNKSJON + hvor brukeren skal lande.
       *
       * ⚠️ Utledes på SERVEREN, ikke i klienten. Klienten kjenner ikke
       * mekanikerprofilen sikkert, og en landingsregel som regnes ut to steder
       * blir før eller siden to ulike regler. `landing` er svaret, ikke
       * ingrediensene.
       */
      const jobbfunksjon = resolveJobbfunksjon({
        rolle: ctx.role,
        lagret: profil?.jobFunction ?? null,
        harMekanikerprofil: Boolean(mech),
      });

      /**
       * ⚠️ RETTET 20.08.2026 — brukerens EGET navn.
       *
       * Sidebaren leste tidligere navnet fra Better-Auth sin klientsesjon,
       * mens `profile.setName` skriver til `user.name` i basen. To hjem for
       * samme opplysning: lagring virket, men sidebaren viste det gamle navnet
       * til neste fulle sidelast, fordi ingenting oppdaterte Better-Auth-cachen.
       *
       * Løsningen er å fjerne det ene hjemmet, ikke å legge til enda en
       * oppfriskning som noen glemmer neste gang. Navnet kommer nå herfra, og
       * `profile.setName` invaliderer allerede denne ruta.
       */
      const [bruker] = await ctx.db
        .select({ name: schema.user.name })
        .from(schema.user)
        .where(eq(schema.user.id, ctx.userId));

      return {
        userId: ctx.userId,
        tenantId: ctx.tenantId,
        /** Ditt eget visningsnavn. ⛔ Ikke kallenavn — se `internNavn`. */
        navn: bruker?.name ?? '',
        jobbfunksjon,
        landing: landingForJobbfunksjon(jobbfunksjon),
        tenantName: tenant?.name ?? null,
        tenantKind: tenant?.kind ?? 'live',
        role: ctx.role,
        isMechanic: Boolean(mech),
        mechanicId: mech?.id ?? null,
        mechanicName: mech?.name ?? null,
        /** Ekte navn på mekanikerprofilen. Aldri kallenavn. */
        kallenavn: profil?.nickname ?? null,
        /** Internt visningsnavn = kallenavn hvis satt, ellers ekte navn. */
        internNavn: visningsnavn(
          { navn: mech?.name ?? '', kallenavn: profil?.nickname ?? null },
          'intern',
        ),
        /** Ingen rad = aldri rørt = standard PÅ. */
        varslingslyder: pref?.notificationSounds ?? true,
        devMode,
      };
    });
  }),
});
