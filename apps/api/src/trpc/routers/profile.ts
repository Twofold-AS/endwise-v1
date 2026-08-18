import { and, eq, schema, withTenant } from '@endwise/db';
import { kanHaKallenavn } from '@endwise/modules/profil';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * F5-19 / F7-06 — EGEN PROFIL: navn, kallenavn og varslingslyder.
 *
 * ── ⚠️ Den gjennomgående regelen ──────────────────────────────────────────
 * **Ingen rute her tar en bruker-ID fra input.** Alt skrives for `ctx.userId`.
 * Det er ikke en forglemmelse at det mangler et `userId`-felt — det er hele
 * sikkerhetsmodellen: «endre egen profil» skal ikke kunne bli «endre hvem som
 * helst sin profil» ved å bytte ut én streng i en forespørsel (CWE-639,
 * OWASP A01 Broken Access Control).
 *
 * `user_preferences` har ingen RLS (global tabell, se skjemaet), så her ER
 * `ctx.userId` hele beskyttelsen. `member_profiles` har RLS i tillegg.
 */
export const profileRouter = router({
  /** Egen profil: visningsnavn, kallenavn og lydinnstilling. */
  meg: protectedProcedure.query(async ({ ctx }) => {
    const [bruker] = await ctx.db
      .select({ name: schema.user.name, email: schema.user.email })
      .from(schema.user)
      .where(eq(schema.user.id, ctx.userId));

    const [pref] = await ctx.db
      .select({
        notificationSounds: schema.userPreferences.notificationSounds,
        inboxDetailsOpen: schema.userPreferences.inboxDetailsOpen,
      })
      .from(schema.userPreferences)
      .where(eq(schema.userPreferences.userId, ctx.userId));

    const [profil] = await withTenant(ctx.db, ctx.tenantId, (tx) =>
      tx
        .select({ nickname: schema.memberProfiles.nickname })
        .from(schema.memberProfiles)
        .where(
          and(
            eq(schema.memberProfiles.tenantId, ctx.tenantId),
            eq(schema.memberProfiles.userId, ctx.userId),
          ),
        ),
    ).catch(() => []);

    return {
      navn: bruker?.name ?? '',
      epost: bruker?.email ?? '',
      kallenavn: profil?.nickname ?? null,
      /** Ingen rad = aldri rørt = standard PÅ. */
      varslingslyder: pref?.notificationSounds ?? true,
      /** F6-17 — «Detaljer»-panelet i innboksen. Standard PÅ. */
      detaljpanel: pref?.inboxDetailsOpen ?? true,
      /** Skal kallenavn-feltet i det hele tatt vises? Serveren bestemmer. */
      kanHaKallenavn: kanHaKallenavn(ctx.role),
    };
  }),

  /**
   * Endre EGET visningsnavn.
   *
   * Navnet ligger på `user` (Better-Auth) og er dermed globalt: bytter du navn,
   * bytter du det overalt. Det er riktig — det er ditt navn, ikke en rolle du
   * har hos én forhandler. Kallenavnet er det tenant-lokale.
   */
  setName: protectedProcedure
    .input(z.object({ navn: z.string().trim().min(2).max(80) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(schema.user)
        .set({ name: input.navn, updatedAt: new Date() })
        .where(eq(schema.user.id, ctx.userId));
      return { navn: input.navn };
    }),

  /**
   * Sett eller fjern eget kallenavn (tom streng = fjern).
   *
   * ⛔ Avvises for `dealer_admin`/`endwise_admin`/`owner`. Å skjule feltet i
   * UI-et er en anbefaling; denne sjekken er regelen. Rollen leses fra
   * konteksten (`assertMember`), aldri fra input.
   */
  setNickname: protectedProcedure
    .input(z.object({ kallenavn: z.string().trim().max(24) }))
    .mutation(async ({ ctx, input }) => {
      if (!kanHaKallenavn(ctx.role)) {
        throw new TRPCError({
          code: 'FORBIDDEN',
          message:
            'Forhandler- og Endwise-kontoer kan ikke ha kallenavn. Kontoen er den offisielle stemmen ut mot kunden.',
        });
      }

      const kallenavn = input.kallenavn.trim() || null;
      await withTenant(ctx.db, ctx.tenantId, (tx) =>
        tx
          .insert(schema.memberProfiles)
          .values({ tenantId: ctx.tenantId, userId: ctx.userId, nickname: kallenavn })
          .onConflictDoUpdate({
            target: [schema.memberProfiles.tenantId, schema.memberProfiles.userId],
            set: { nickname: kallenavn, updatedAt: new Date() },
          }),
      );
      return { kallenavn };
    }),

  /**
   * F6-17 — «Detaljer»-panelet åpent/lukket.
   *
   * Egen mutasjon, ikke en generisk `setPreference(key, value)`. En generisk
   * setter ville betydd at klienten bestemmer hvilke kolonner som finnes — og
   * første gang noen sender en nøkkel vi ikke kjenner, må serveren enten
   * ignorere den stille eller feile på noe den burde avvist i typen.
   */
  setInboxDetails: protectedProcedure
    .input(z.object({ apen: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(schema.userPreferences)
        .values({ userId: ctx.userId, inboxDetailsOpen: input.apen })
        .onConflictDoUpdate({
          target: schema.userPreferences.userId,
          set: { inboxDetailsOpen: input.apen, updatedAt: new Date() },
        });
      return { apen: input.apen };
    }),

  /** Varslingslyder av/på. Global for brukeren — ikke per forhandler. */
  setNotificationSounds: protectedProcedure
    .input(z.object({ pa: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(schema.userPreferences)
        .values({ userId: ctx.userId, notificationSounds: input.pa })
        .onConflictDoUpdate({
          target: schema.userPreferences.userId,
          set: { notificationSounds: input.pa, updatedAt: new Date() },
        });
      return { pa: input.pa };
    }),
});
