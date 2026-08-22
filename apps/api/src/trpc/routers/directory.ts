import { and, eq, inArray, schema, withTenant } from '@endwise/db';
import { type AvatarValg, lesAvatar, TOM_AVATAR, visningsnavn } from '@endwise/modules/profil';
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

      /**
       * F6-19 — `seed` og `avatar` er med fra 20.08.2026.
       *
       * ⛔ **`seed` er ikke det samme som nøkkelen.** Nøkkelen er deltaker-IDen
       * meldingen bærer (en Better-Auth-bruker); seeden er personens STABILE
       * identitet i denne tenanten — `customers.id`, `mechanics.id` eller
       * `user.id`. Forskjellen betyr noe: kundekortet (F5-02) kjenner bare
       * `customers.id`, og hadde innboksen seedet på bruker-IDen ville samme
       * menneske hatt to ansikter på to flater. Serveren bestemmer seeden ett
       * sted, så flatene ikke kan bli uenige.
       */
      const ut: Record<
        string,
        {
          navn: string;
          rolle: 'ansatt' | 'mekaniker' | 'kunde';
          seed: string;
          avatar: AvatarValg;
        }
      > = {};

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
          .select({
            userId: schema.mechanics.userId,
            id: schema.mechanics.id,
            name: schema.mechanics.name,
          })
          .from(schema.mechanics)
          .where(
            and(
              eq(schema.mechanics.tenantId, ctx.tenantId),
              inArray(schema.mechanics.userId, unike),
            ),
          );
        const kunder = await tx
          .select({
            userId: schema.customers.userId,
            id: schema.customers.id,
            name: schema.customers.name,
          })
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
      for (const k of kunder) {
        if (k.userId) {
          ut[k.userId] = { navn: k.name, rolle: 'kunde', seed: k.id, avatar: TOM_AVATAR };
        }
      }
      // Mekaniker vinner over kunde: er du begge deler i samme verksted, er det
      // som ansatt du skriver i innboksen.
      for (const m of mekanikere) {
        if (m.userId) {
          ut[m.userId] = {
            navn: vis(m.userId, m.name),
            rolle: 'mekaniker',
            seed: m.id,
            avatar: TOM_AVATAR,
          };
        }
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
        if (!ut[a.id]) {
          ut[a.id] = { navn: vis(a.id, a.name), rolle: 'ansatt', seed: a.id, avatar: TOM_AVATAR };
        }
      }

      /**
       * ── 3. Avatarvalg ────────────────────────────────────────────────
       *
       * ⛔ `user_preferences` har **ingen RLS** (global tabell, se skjemaet), så
       * isolasjonen må komme fra spørringen. Den kommer den fra her: vi slår opp
       * KUN IDer som allerede står i `ut`, altså IDer stegene over har bekreftet
       * hører til denne tenanten. En ID vi ikke klarte å navngi, spør vi heller
       * ikke om et ansikt for.
       *
       * ⚠️ Kunder får sjelden eller aldri en rad her — de fleste har ingen
       * innlogging å sette et valg fra. Da står `TOM_AVATAR`, og ansiktet
       * kommer i sin helhet fra seeden. Det er riktig, ikke en mangel.
       */
      const kjente = Object.keys(ut);
      if (kjente.length > 0) {
        const valg = await ctx.db
          .select({
            userId: schema.userPreferences.userId,
            avatarShape: schema.userPreferences.avatarShape,
            avatarHumor: schema.userPreferences.avatarHumor,
            avatarHue: schema.userPreferences.avatarHue,
            avatarTone: schema.userPreferences.avatarTone,
          })
          .from(schema.userPreferences)
          .where(inArray(schema.userPreferences.userId, kjente))
          .catch(() => []);
        for (const v of valg) {
          const rad = ut[v.userId];
          if (rad) rad.avatar = lesAvatar(v);
        }
      }

      return ut;
    }),
});
