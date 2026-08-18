import { and, eq, inArray, schema, withTenant } from '@endwise/db';
import { visningsnavn } from '@endwise/modules/profil';
import { z } from 'zod';
import { protectedProcedure, router } from '../init.ts';

/**
 * F6-01 — NAVNEOPPSLAG for meldingsdeltakere.
 *
 * Innboksen viste rå UUID-er som avsender, fordi ingen rute kunne oversette en
 * `participant_id` til et navn. Denne gjør det — og den er den mest følsomme
 * ruten i hele meldingsflaten, fordi den per definisjon slår opp **personer**.
 *
 * ── ⛔ Hvorfor den ikke bare leser `user`-tabellen ────────────────────────
 * Better-Auth sine tabeller har **ingen RLS** (ADR-002: de er globale
 * identiteter). En rute som tok en liste med IDer og returnerte navn fra `user`
 * ville vært et **navneorakel for hele plattformen**: en forhandler kunne prøvd
 * seg fram med IDer og lest ut navnene på andre forhandleres ansatte og kunder.
 *
 * Derfor er oppslaget snudd: vi finner først ut hvem som HØRER TIL denne
 * tenanten, og krysser de forespurte IDene mot den lista. En ID vi ikke kjenner
 * får `null` — ikke en feil, og ikke et navn.
 *
 * Tre lovlige kilder til et navn, alle tenant-skopet:
 *   1. `member`  — ansatte i tenanten (via Better-Auth organization)
 *   2. `mechanics.user_id` — mekanikere (kan være samme personer som 1)
 *   3. `customers.user_id` — sluttkunder som har logget inn på «Min side»
 *
 * Er ingen av dem, finnes ikke personen for oss.
 */
export const directoryRouter = router({
  /**
   * Slå opp navn for et sett deltaker-IDer.
   *
   * Returnerer et oppslag `{ [id]: { navn, rolle } }`. IDer uten treff mangler
   * fra svaret — klienten viser da en anonym plassholder, ikke en UUID.
   *
   * ── ⛔ KALLENAVN (08.08.2026) ────────────────────────────────────────────
   * `navn` er **allerede løst** av `visningsnavn()` før det forlater serveren.
   * Kallenavnet returneres aldri rått, så en klient kan ikke velge å vise det
   * et sted den ikke skulle.
   *
   * `visning` defaulter til `offisiell` = ekte navn. Glemmer en fremtidig
   * flate å be om intern visning, får den ekte navn — feilen går mot det
   * trygge. Se `packages/modules/src/profil/index.ts`.
   */
  participants: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string().min(1)).max(200),
        visning: z.enum(['intern', 'offisiell']).default('offisiell'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const unike = [...new Set(input.ids)].filter(Boolean);
      if (unike.length === 0) return {};

      const ut: Record<string, { navn: string; rolle: 'ansatt' | 'mekaniker' | 'kunde' }> = {};

      /**
       * Kallenavn hentes KUN når intern visning er eksplisitt bedt om. Ikke
       * bare fordi det er unødvendig ellers, men fordi en rad vi aldri leser
       * heller ikke kan lekke ved en senere refaktorering.
       */
      const kallenavn = new Map<string, string>();
      if (input.visning === 'intern') {
        const rader = await withTenant(ctx.db, ctx.tenantId, (tx) =>
          tx
            .select({
              userId: schema.memberProfiles.userId,
              nickname: schema.memberProfiles.nickname,
            })
            .from(schema.memberProfiles)
            .where(
              and(
                eq(schema.memberProfiles.tenantId, ctx.tenantId),
                inArray(schema.memberProfiles.userId, unike),
              ),
            ),
        ).catch(() => []);
        for (const r of rader) if (r.nickname) kallenavn.set(r.userId, r.nickname);
      }

      /**
       * Ett sted navnet avgjøres. Brukes KUN for kollegaer (mekanikere og
       * ansatte) — kundenavn går rett inn urørt lenger nede, fordi en kunde
       * verken har eller skal ha et kallenavn hos oss.
       */
      const vis = (userId: string, navn: string) =>
        visningsnavn({ navn, kallenavn: kallenavn.get(userId) ?? null }, input.visning);

      // ── 1. Mekanikere og kunder: tenant-skopet av RLS. ────────────────
      const { mekanikere, kunder } = await withTenant(ctx.db, ctx.tenantId, async (tx) => {
        const mekanikere = await tx
          .select({ userId: schema.mechanics.userId, name: schema.mechanics.name })
          .from(schema.mechanics)
          .where(
            and(
              eq(schema.mechanics.tenantId, ctx.tenantId),
              inArray(schema.mechanics.userId, unike),
            ),
          );
        const kunder = await tx
          .select({ userId: schema.customers.userId, name: schema.customers.name })
          .from(schema.customers)
          .where(
            and(
              eq(schema.customers.tenantId, ctx.tenantId),
              inArray(schema.customers.userId, unike),
            ),
          );
        return { mekanikere, kunder };
      }).catch(() => ({ mekanikere: [], kunder: [] }));

      // ⛔ Kunder får ALLTID ekte navn — `vis(..., true)`. En kunde er ikke en
      // kollega, og har uansett ikke noe kallenavn hos oss.
      for (const k of kunder) if (k.userId) ut[k.userId] = { navn: k.name, rolle: 'kunde' };
      // Mekaniker vinner over kunde: er du begge deler i samme verksted, er det
      // som ansatt du skriver i innboksen.
      for (const m of mekanikere) {
        if (m.userId) ut[m.userId] = { navn: vis(m.userId, m.name), rolle: 'mekaniker' };
      }

      /**
       * ── 2. Ansatte via organization-medlemskap ────────────────────────
       * `member` og `user` har ingen RLS, så isolasjonen må komme fra spørringen
       * selv: vi filtrerer på `organization_id = ctx.tenantId` (ADR-002:
       * organization.id ER tenant_id) OG på de forespurte IDene. Uten det
       * første filteret ville dette vært navneorakelet beskrevet over.
       */
      const ansatte = await ctx.db
        .select({ id: schema.user.id, name: schema.user.name })
        .from(schema.user)
        .innerJoin(schema.member, eq(schema.member.userId, schema.user.id))
        .where(and(eq(schema.member.organizationId, ctx.tenantId), inArray(schema.user.id, unike)));

      for (const a of ansatte) {
        // Mekaniker-navnet er mer presist i verkstedssammenheng; ikke overskriv.
        if (!ut[a.id]) ut[a.id] = { navn: vis(a.id, a.name), rolle: 'ansatt' };
      }

      return ut;
    }),
});
