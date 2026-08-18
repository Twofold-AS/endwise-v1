import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { user } from './auth.ts';
import { tenants } from './tenants.ts';

/**
 * F5-19 / F7-06 — PROFIL OG PREFERANSER (08.08.2026).
 *
 * ⚠️ **To tabeller, og det er ikke overbygging.** De to opplysningene her har
 * ULIK rekkevidde, og å slå dem sammen ville gjort én av dem feil:
 *
 *   `user_preferences` — GLOBAL per bruker. Om varslingslyder er på er en
 *      egenskap ved MENNESKET, ikke ved arbeidsplassen. En som jobber i to
 *      forhandlere skal skru av lyden én gang, ikke to.
 *
 *   `member_profiles`  — TENANT-SKOPET. Et kallenavn er intern sjargong på ÉN
 *      arbeidsplass. Det skal ikke følge deg til neste forhandler, og
 *      forhandler B skal ikke kunne lese forhandler A sine.
 *
 * Derfor har den andre RLS og den første ikke.
 */

/**
 * Per-bruker-preferanser. GLOBAL, uten RLS — samme begrunnelse som ADR-002 for
 * Better-Auth-tabellene: raden inneholder ingen tenant-data, bare en bryter som
 * hører til identiteten.
 *
 * ⚠️ Fordi RLS ikke beskytter denne, er beskyttelsen at **ingen rute noen gang
 * tar en bruker-ID fra input** — `ctx.userId` er eneste kilde. Se
 * `routers/profile.ts`. Ser du en spørring her med en ID fra klienten, er det
 * en feil, ikke en variant.
 */
export const userPreferences = pgTable('user_preferences', {
  userId: text('user_id')
    .primaryKey()
    .references(() => user.id, { onDelete: 'cascade' }),
  /**
   * Varslingslyder (cuelume). **Standard PÅ** — en lyd du ikke visste fantes er
   * mindre irriterende enn en varsling du aldri hørte. Av-knappen er derfor
   * tydelig, ikke gjemt.
   */
  notificationSounds: boolean('notification_sounds').notNull().default(true),
  /**
   * F6-17 — Er «Detaljer»-panelet i innboksen åpent? **Standard PÅ.**
   *
   * Ligger her og ikke i `localStorage` fordi det er en arbeidsvane, ikke en
   * nettleserinnstilling: åpner du innboksen på verkstedets maskin i dag og på
   * din egen i morgen, skal panelet stå som du forlot det. En preferanse som
   * bare finnes på én maskin er en preferanse man må sette to ganger.
   */
  inboxDetailsOpen: boolean('inbox_details_open').notNull().default(true),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
});

/**
 * F1-14 — JOBBFUNKSJON. Den ANDRE dimensjonen.
 *
 * ⚠️ **Dette er ikke en rolle, og skal aldri bli det.** Endwise har to akser som
 * er bevisst uavhengige:
 *
 *   TILGANGSNIVÅ (`member.role`) — hva du har LOV til. `dealer_admin` styrer
 *      innstillinger, abonnement og team; `dealer_staff` er alle andre. Uendret.
 *
 *   JOBBFUNKSJON (denne)          — hva du GJØR til daglig. Styrer hvor du
 *      lander etter innlogging og hvordan navet vektlegges. Ingen rettigheter.
 *
 * Grunnen til at de er skilt: `selger` og `support` har **nøyaktig samme
 * tilgang** — begge er `dealer_staff`. Forskjellen er at den ene starter dagen i
 * kalenderen og den andre i innboksen. Hadde vi laget dem som RBAC-roller,
 * måtte hver eneste `adminProcedure` og RLS-policy tatt stilling til to nye
 * verdier som ikke betyr noe for tilgang — og da hadde en «funksjon» før eller
 * siden blitt brukt som en rettighet ved et uhell.
 *
 *   leder     — implisitt for dealer_admin. Styrer alt.
 *   selger    — dealer_staff i forhandlerkonteksten: booking, kunder, salg.
 *   support   — dealer_staff dedikert til kundeinnboksen.
 *   mekaniker — dealer_staff med mekanikerprofil → mobil-shell.
 */
export const jobFunctionEnum = pgEnum('job_function', ['leder', 'selger', 'support', 'mekaniker']);

/**
 * Medlemsprofil i ÉN tenant. Kallenavn og jobbfunksjon.
 *
 * ── ⛔ KALLENAVN VISES ALDRI UTAD ─────────────────────────────────────────
 * Kallenavnet er intern moro mellom mekanikere og forhandler. I enhver
 * kundevendt sammenheng vises det EKTE navnet (eller forhandlerens navn).
 *
 * Grensen håndheves i `visningsnavn()` (`packages/modules/src/profil/`), som er
 * eneste sted et kallenavn kan bli til et visningsnavn — og den defaulter til
 * `offisiell`. Glemmer man å be om intern visning, får man ekte navn. Feilen
 * skal gå mot det trygge.
 *
 * ⛔ Og: en `dealer_admin` skal ikke HA kallenavn. Forhandlerkontoen er den
 * offisielle stemmen ut mot kunden; et kallenavn der er en ulykke som venter.
 * Håndheves i mutasjonen, ikke bare ved å skjule feltet.
 */
export const memberProfiles = pgTable(
  'member_profiles',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Better-Auth-bruker. Tekst, som `member.user_id`. */
    userId: text('user_id').notNull(),
    /** Kallenavn. Null = bruk ekte navn. Kun for private/ansatt-profiler. */
    nickname: text('nickname'),
    /**
     * Jobbfunksjon. **Nullable med vilje.**
     *
     * ⚠️ De aller fleste ansatte har ingen rad i denne tabellen — den opprettes
     * først når noen setter et kallenavn eller en funksjon. En `NOT NULL` her
     * ville krevd en rad per medlem, som måtte holdes i synk med `member` for
     * alltid, og som ville gått ut av synk første gang noen ble lagt til
     * gjennom Better-Auth uten å innom oss.
     *
     * Null = «ikke satt eksplisitt» → `resolveJobbfunksjon()` utleder den fra
     * rolle + mekanikerprofil. Se `packages/modules/src/profil/`.
     */
    jobFunction: jobFunctionEnum('job_function'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.tenantId, t.userId] }),
    index('member_profiles_user_idx').on(t.userId),
    tenantPolicy('member_profiles', t.tenantId),
  ],
).enableRLS();

export type UserPreferences = typeof userPreferences.$inferSelect;
export type MemberProfile = typeof memberProfiles.$inferSelect;
