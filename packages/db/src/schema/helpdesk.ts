import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { user } from './auth.ts';

/**
 * Helpdesk: Endwise sine egne hjelpeartikler.
 * Globale tabeller, uten RLS — og det er et valg, ikke en forglemmelse
 * En hjelpeartikkel er Endwise sitt innhold, ikke forhandlerens. Den er
 * Nøyaktig den samme for alle 250 verksteder, og det finnes ingen «min
 * artikkel». Ga vi den `tenant_id` og en tenant-policy, ville vi enten måttet
 * kopiere hver artikkel per forhandler (og holde 250 kopier i synk), eller
 * skrevet en policy som slipper alle gjennom — altså RLS som ikke isolerer noe.
 * Samme resonnement som `user_preferences` (se `profiles.ts`): raden inneholder
 * ingen tenant-data.
 * Fordi RLS ikke beskytter disse, ligger beskyttelsen i ruta:
 * skriving → `endwiseAdminProcedure` (kun Endwise-ansatte, ikke forhandlere)
 * lesing → `protectedProcedure`, og kun `published = true`
 * lest-av → `ctx.userId` er eneste kilde, aldri en ID fra input
 * Ser du en spørring her med en bruker-ID fra klienten, er det en feil.
 */

/**
 * Bildene en artikkel kan bruke, **inntil videre**.
 * Dette er en midlertidig allowlist, ikke en designbeslutning. Ekte
 * opplasting krever et lagringssted, og repoet har tre ulike svar på hvilket:
 * techstack §4 sier Vercel Blob via signerte URL-er, F2-03 sier R2, og F13-03
 * flyttet topologien til Vercel + Scaleway. Det er en §2-avklaring som må tas
 * av eier, ikke gjettes her.
 * Til den er tatt, velger admin blant bildene som allerede ligger i
 * `apps/web/public/images/`. Kolonnen er `text` og tar imot en URL like godt
 * som en filsti, så dagen opplasting kommer, faller allowlisten bort uten at
 * datamodellen endres.
 */
export const HELPDESK_BILDER = [
  '/images/hero.jpg',
  '/images/img_1.jpg',
  '/images/img_2.jpg',
  '/images/img_3.jpg',
] as const;

/**
 * Faste kategorier. Forhandlerens språk, ikke fasene våre.
 * Eksisterende (roadmap): booking · kunder · lager · integrasjoner · fakturering.
 * Lagt til (Slack #endwise-v1): Brukerguide · Oppdateringer.
 * Ikke fritekst — en ny nøkkel her er en produktbeslutning.
 */
export const HELPDESK_KATEGORIER = [
  'brukerguide',
  'oppdateringer',
  'booking',
  'kunder',
  'lager',
  'integrasjoner',
  'fakturering',
] as const;

export type HelpdeskKategori = (typeof HELPDESK_KATEGORIER)[number];

export const HELPDESK_KATEGORI_LABEL: Record<HelpdeskKategori, string> = {
  brukerguide: 'Brukerguide',
  oppdateringer: 'Oppdateringer',
  booking: 'Booking',
  kunder: 'Kunder',
  lager: 'Lager',
  integrasjoner: 'Integrasjoner',
  fakturering: 'Fakturering',
};

export const HELPDESK_KATEGORI_DEFAULT: HelpdeskKategori = 'brukerguide';

export const helpdeskArticles = pgTable(
  'helpdesk_articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Stabil, lesbar URL-del. Endres aldri etter publisering — lenker råtner. */
    slug: text('slug').notNull().unique(),
    /** Vises både i helpdesken og i sidebar-slideren. Én tittel, ett sted. */
    title: text('title').notNull(),
    /** Kort ingress. Brukes i lista og i slideren — derfor kort, ikke valgfri. */
    summary: text('summary').notNull(),
    /**
     * Fast enum (HELPDESK_KATEGORIER). Default brukerguide så gamle rader
     * lander i en ekte kategori, ikke i «ukjent».
     */
    category: text('category').notNull().default('brukerguide'),
    body: text('body').notNull(),
    /** Sti eller URL. Null = artikkelen vises uten bilde, ikke med et tomt felt. */
    image: text('image'),
    /**
     * Upublisert = kladd. Leseruta filtrerer på denne, så en halvskrevet
     * artikkel aldri kan telle som ulest hos 250 forhandlere.
     */
    published: boolean('published').notNull().default(true),
    /**
     * Sorteringsnøkkelen for «de 4 nyeste». Egen kolonne og ikke `created_at`,
     * fordi en artikkel kan skrives i dag og publiseres neste uke — og det er
     * publiseringen leseren forholder seg til.
     */
    publishedAt: timestamp('published_at', { withTimezone: true }).notNull().default(sql`now()`),
    /** Rekkefølge når to artikler deler tidspunkt (seeden gjør nettopp det). */
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [index('helpdesk_articles_published_idx').on(t.published, t.publishedAt)],
);

/**
 * Hvem har lest hva. Global per bruker — som `user_preferences`.
 * «Ulest» er fraværet av en rad, ikke et flagg som må vedlikeholdes. En ny
 * artikkel er dermed automatisk ulest for alle, uten at publiseringen må skrive
 * 250 rader — og en slettet bruker etterlater ingen tellefeil.
 */
export const helpdeskReads = pgTable(
  'helpdesk_reads',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => helpdeskArticles.id, { onDelete: 'cascade' }),
    readAt: timestamp('read_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.articleId] }),
    index('helpdesk_reads_user_idx').on(t.userId),
  ],
);

export type HelpdeskArticle = typeof helpdeskArticles.$inferSelect;
export type NewHelpdeskArticle = typeof helpdeskArticles.$inferInsert;
