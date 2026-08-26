import {
  and,
  asc,
  desc,
  eq,
  HELPDESK_BILDER,
  HELPDESK_KATEGORI_DEFAULT,
  HELPDESK_KATEGORIER,
  isNull,
  schema,
  sql,
} from '@endwise/db';
import { z } from 'zod';
import { endwiseAdminProcedure, protectedProcedure, router } from '../init.ts';

/**
 * Helpdesk: hjelpeartikler fra Endwise til forhandlerne.
 * To roller, to helt ulike rettigheter
 * Endwise-admin skriver. Alle andre leser. Skrivestien er
 * `endwiseAdminProcedure`, som er strengere enn `adminProcedure`: den slipper
 * Kun `endwise_admin` inn, ikke `dealer_admin`. Det er hele poenget — en
 * forhandler skal aldri kunne publisere noe som dukker opp i 249 andre
 * verksteders sidebar. `adminProcedure` ville sluppet dem inn.
 * Tabellene har ingen RLS
 * Med vilje (se skjemaet: artikkelen er den samme for alle). Da er ruta hele
 * beskyttelsen, og den har to sider:
 * 1. Ingen leserute returnerer upubliserte artikler.
 * 2. Ingen rute tar en bruker-ID fra input — `ctx.userId` er eneste kilde,
 * så «marker som lest» ikke kan bli «marker som lest for en annen».
 */

/** Felt som er felles for opprett og oppdater. Én definisjon, to kallsteder. */
function erTestHelpdeskTittel(title: string): boolean {
  const t = title.trim().toLowerCase();
  return t.includes('mikael testing') || t.includes('halla balla');
}

const artikkelFelter = {
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(10).max(240),
  body: z.string().trim().min(10).max(20_000),
  /**
   * Bildet valideres mot allowlisten, ikke bare som «en streng».
   * Uten den kunne en admin skrevet inn hvilken som helst URL, og da ville
   * artikkelsiden lastet et bilde fra en tredjepart — en referrer-lekkasje og
   * en avhengighet til noen andres oppetid, innført ved et tekstfelt.
   * Allowlisten forsvinner den dagen ekte opplasting finnes; da er kilden vår
   * egen lagring, og valideringen blir «hører denne filen til oss».
   */
  image: z.enum(HELPDESK_BILDER).nullable(),
  published: z.boolean(),
  category: z.enum(HELPDESK_KATEGORIER).default(HELPDESK_KATEGORI_DEFAULT),
};

/** «Slik fungerer innboksen» → «slik-fungerer-innboksen». */
function lagSlug(tittel: string): string {
  return tittel
    .toLowerCase()
    .replace(/[æ]/g, 'ae')
    .replace(/[ø]/g, 'o')
    .replace(/[å]/g, 'a')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export const helpdeskRouter = router({
  /**
   * Publiserte artikler, nyeste først, med om du har lest dem.
   * `body` er utelatt med vilje. Lista og sidebar-slideren viser tittel,
   * ingress og bilde; å sende hele brødteksten til begge ville betydd at
   * sidebaren — som ligger på hver side — drar med seg alle artiklene i sin
   * helhet ved hver navigasjon.
   */
  list: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const rader = await ctx.db
        .select({
          id: schema.helpdeskArticles.id,
          slug: schema.helpdeskArticles.slug,
          title: schema.helpdeskArticles.title,
          summary: schema.helpdeskArticles.summary,
          category: schema.helpdeskArticles.category,
          image: schema.helpdeskArticles.image,
          publishedAt: schema.helpdeskArticles.publishedAt,
          /**
           * Ulest = det finnes ingen lest-rad for deg. Venstre join mot en
           * `user_id`-filtrert side, så en annens lesning aldri kan skjule en
           * artikkel for deg.
           */
          ulest: sql<boolean>`${schema.helpdeskReads.articleId} is null`,
        })
        .from(schema.helpdeskArticles)
        .leftJoin(
          schema.helpdeskReads,
          and(
            eq(schema.helpdeskReads.articleId, schema.helpdeskArticles.id),
            eq(schema.helpdeskReads.userId, ctx.userId),
          ),
        )
        .where(eq(schema.helpdeskArticles.published, true))
        .orderBy(desc(schema.helpdeskArticles.publishedAt), desc(schema.helpdeskArticles.sortOrder))
        .limit(input?.limit ?? 50);
      return rader.filter((r) => !erTestHelpdeskTittel(r.title));
    }),

  /**
   * Antall uleste. Egen rute, ikke utledet av `list`.
   * Badgen står på nav-raden, som rendres på hver eneste side — også de som
   * aldri laster artikkellista. Å hente 50 artikler for å telle dem ville vært
   * å laste innholdet for å vise et tall.
   */
  ulesteAntall: protectedProcedure.query(async ({ ctx }) => {
    const rader = await ctx.db
      .select({ title: schema.helpdeskArticles.title })
      .from(schema.helpdeskArticles)
      .leftJoin(
        schema.helpdeskReads,
        and(
          eq(schema.helpdeskReads.articleId, schema.helpdeskArticles.id),
          eq(schema.helpdeskReads.userId, ctx.userId),
        ),
      )
      .where(
        and(eq(schema.helpdeskArticles.published, true), isNull(schema.helpdeskReads.articleId)),
      );
    return rader.filter((r) => !erTestHelpdeskTittel(r.title)).length;
  }),

  /** Én artikkel i sin helhet. Upubliserte finnes ikke for en leser. */
  bySlug: protectedProcedure
    .input(z.object({ slug: z.string().min(1).max(80) }))
    .query(async ({ ctx, input }) => {
      const [artikkel] = await ctx.db
        .select()
        .from(schema.helpdeskArticles)
        .where(
          and(
            eq(schema.helpdeskArticles.slug, input.slug),
            eq(schema.helpdeskArticles.published, true),
          ),
        );
      return artikkel ?? null;
    }),

  /**
   * Marker som lest.
   * Ingen `userId` i input — `ctx.userId` er eneste kilde. Samme regel som
   * hele `profile.ts`, og av samme grunn: «marker som lest» skal ikke kunne bli
   * «marker som lest for hvem som helst» ved å bytte ut én streng (CWE-639).
   * `onConflictDoNothing`: å lese noe to ganger er ikke en feil, og skal ikke
   * flytte tidspunktet for første lesning.
   */
  markerLest: protectedProcedure
    .input(z.object({ articleId: z.uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(schema.helpdeskReads)
        .values({ userId: ctx.userId, articleId: input.articleId })
        .onConflictDoNothing();
      return { ok: true };
    }),

  /* Endwise-admin: skriving */

  /** Alle artikler, ogsÅ kladder. Kun Endwise-admin. */
  alle: endwiseAdminProcedure.query(({ ctx }) =>
    ctx.db
      .select()
      .from(schema.helpdeskArticles)
      .orderBy(desc(schema.helpdeskArticles.publishedAt), asc(schema.helpdeskArticles.title)),
  ),

  opprett: endwiseAdminProcedure
    .input(z.object(artikkelFelter))
    .mutation(async ({ ctx, input }) => {
      /**
       * Slug utledes av tittelen, men gjøres unik med et suffiks ved
       * kollisjon i stedet for å feile. To artikler kan hete det samme uten at
       * det er en brukerfeil — «Kom i gang» finnes i to omganger — og en
       * unique-violation midt i et skjema er en dårlig måte å si det på.
       */
      const base = lagSlug(input.title) || 'artikkel';
      const eksisterende = await ctx.db
        .select({ slug: schema.helpdeskArticles.slug })
        .from(schema.helpdeskArticles);
      const tatt = new Set(eksisterende.map((r) => r.slug));
      let slug = base;
      for (let n = 2; tatt.has(slug); n++) slug = `${base}-${n}`;

      const [rad] = await ctx.db
        .insert(schema.helpdeskArticles)
        .values({
          slug,
          title: input.title,
          summary: input.summary,
          body: input.body,
          image: input.image,
          published: input.published,
          category: input.category,
        })
        .returning();
      return rad;
    }),

  /**
   * Oppdater en artikkel.
   * Slug endres aldri her. Den er lenka: en forhandler kan ha bokmerket
   * artikkelen, og en tittelretting skal ikke gjøre bokmerket til en 404.
   */
  oppdater: endwiseAdminProcedure
    .input(z.object({ id: z.uuid(), ...artikkelFelter }))
    .mutation(async ({ ctx, input }) => {
      const [rad] = await ctx.db
        .update(schema.helpdeskArticles)
        .set({
          title: input.title,
          summary: input.summary,
          body: input.body,
          image: input.image,
          published: input.published,
          category: input.category,
          updatedAt: new Date(),
        })
        .where(eq(schema.helpdeskArticles.id, input.id))
        .returning();
      return rad ?? null;
    }),
});
