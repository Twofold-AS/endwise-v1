import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  index,
  integer,
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
 * F5-19 / F7-06 — profil og preferanser.
 * To tabeller, og det er ikke overbygging. De to opplysningene her har
 * Ulik rekkevidde, og å slå dem sammen ville gjort én av dem feil:
 * `user_preferences` — global per bruker. Om varslingslyder er på er en
 * egenskap ved mennesket, ikke ved arbeidsplassen. En som jobber i to
 * forhandlere skal skru av lyden én gang, ikke to.
 * `member_profiles` — tenant-skopet. Et kallenavn er intern sjargong på ÉN
 * arbeidsplass. Det skal ikke følge deg til neste forhandler, og
 * forhandler B skal ikke kunne lese forhandler A sine.
 * Derfor har den andre RLS og den første ikke.
 */

/**
 * Per-bruker-preferanser. Global, uten RLS — samme begrunnelse som ADR-002 for
 * Better-Auth-tabellene: raden inneholder ingen tenant-data, bare en bryter som
 * hører til identiteten.
 * Fordi RLS ikke beskytter denne, er beskyttelsen at ingen rute noen gang
 * tar en bruker-ID fra input — `ctx.userId` er eneste kilde. Se
 * `routers/profile.ts`. Ser du en spørring her med en ID fra klienten, er det
 * en feil, ikke en variant.
 */
/**
 * Avatar-formene. Blobatars egen ti-form-vokabular (`styles/blob.ts`).
 * Vi lagrer **navnet**, aldri 0–1-tallet biblioteket leser. Tallbåndene er
 * frosset per major i blobatar, men et band kan flytte seg i neste major — og
 * da ville en lagret `0.95` stille blitt en annen form på alle ansikter. Et
 * navn kan remappes; et tall kan bare være feil.
 * Lista finnes tre steder med vilje: her (check i basen), i
 * `@endwise/modules/profil/avatar` (zod) og i `@endwise/ui` (navn → tallbånd).
 * apps/web har ikke @endwise/modules som avhengighet — det er server-laget
 * så speilingen følger samme mønster som booking-statusene i `_status.ts`.
 * Check-en er tredjeparten: driver de fra hverandre, blir det en hard feil ved
 * skriving, ikke et ansikt som stille ble feil.
 */
/**
 * Humørene. Blobatars egne `expression`-navn (`blobatar/expression`).
 * Et kuratert utvalg, ikke alle fjorten. Biblioteket har også `sad`,
 * `mad`, `sick` og `scared` — utelatt med vilje. Et humør du setter én gang
 * og glemmer, er noe annet enn et humør du føler: et ansikt som ser sint eller
 * sykt ut ved siden av navnet ditt i kollegaens innboks hver dag, sier noe du
 * sannsynligvis ikke mente å si.
 * `idle` er standard og emitterer nøyaktig samme markup som å ikke sette noe.
 */
export const AVATAR_HUMOR = [
  'idle',
  'happy',
  'wink',
  'smug',
  'sleepy',
  'thinking',
  'surprised',
  'unsure',
  'love',
  'shy',
] as const;

export const AVATAR_FORMER = [
  'round',
  'organic',
  'boxy',
  'capsule',
  'nub',
  'cloud',
  'droplet',
  'hexagon',
  'sun',
  'triangle',
] as const;

export const userPreferences = pgTable(
  'user_preferences',
  {
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
     * Er «Detaljer»-panelet i innboksen åpent? **Standard PÅ.**
     * Ligger her og ikke i `localStorage` fordi det er en arbeidsvane, ikke en
     * nettleserinnstilling: åpner du innboksen på verkstedets maskin i dag og på
     * din egen i morgen, skal panelet stå som du forlot det. En preferanse som
     * bare finnes på én maskin er en preferanse man må sette to ganger.
     */
    inboxDetailsOpen: boolean('inbox_details_open').notNull().default(true),

    /**
     * Avatar (blobatar). Alle tre er NULL = «utled alt fra seeden».
     * Avataren er en egenskap ved mennesket, ikke ved arbeidsplassen — samme
     * begrunnelse som varslingslyder rett over. Bytter du forhandler, tar du
     * ansiktet ditt med deg. Derfor her og ikke i `member_profiles`.
     * Tre navngitte kolonner, ikke en `jsonb` med blobatars `TraitOverrides`.
     * En rå trait-map ville latt klienten pinne hvilken som helst nøkkel
     * `motion.*`, `gaze.*`, `freckles.size` — og da bestemmer klienten
     * vokabularet. Her bestemmer serveren det, og alt vi ikke navngir kommer
     * fortsatt fra seeden.
     */
    /** Silhuett. Null = per seed. Se `AVATAR_FORMER`. */
    avatarShape: text('avatar_shape'),
    /** Fargetone i grader, 0–359. Null = per seed. */
    avatarHue: integer('avatar_hue'),
    /** Indeks i blobatars seks forfattede svatsjer, 0–5. Null = per seed. */
    avatarTone: integer('avatar_tone'),
    /**
     * Humør — en positur avataren holder. Null = `idle`.
     * I motsetning til form, farge og tone utledes dette aldri av seeden. Et
     * ansikt får ikke et tilfeldig humør fordi IDen tilsier det; enten har du
     * valgt et, eller så er det nøytralt.
     */
    avatarHumor: text('avatar_humor'),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    /**
     * Det tredje laget. Ruta validerer med zod, men en check i basen er det
     * eneste som overlever at noen senere skriver en rute som glemmer regelen
     * samme mønster som invitasjonenes rolle-check (F1-10).
     */
    check(
      'user_preferences_avatar_shape_check',
      sql`${t.avatarShape} is null or ${t.avatarShape} in ('round','organic','boxy','capsule','nub','cloud','droplet','hexagon','sun','triangle')`,
    ),
    check(
      'user_preferences_avatar_hue_check',
      sql`${t.avatarHue} is null or (${t.avatarHue} >= 0 and ${t.avatarHue} <= 359)`,
    ),
    check(
      'user_preferences_avatar_humor_check',
      sql`${t.avatarHumor} is null or ${t.avatarHumor} in ('idle','happy','wink','smug','sleepy','thinking','surprised','unsure','love','shy')`,
    ),
    check(
      'user_preferences_avatar_tone_check',
      sql`${t.avatarTone} is null or (${t.avatarTone} >= 0 and ${t.avatarTone} <= 5)`,
    ),
  ],
);

/**
 * Jobbfunksjon. Den andre dimensjonen.
 * Dette er ikke en rolle, og skal aldri bli det. Endwise har to akser som
 * er bevisst uavhengige:
 * TilgangsnivÅ (`member.role`) — hva du har lov til. `dealer_admin` styrer
 * innstillinger, abonnement og team; `dealer_staff` er alle andre. Uendret.
 * Jobbfunksjon (denne) — hva du gjør til daglig. Styrer hvor du
 * lander etter innlogging og hvordan navet vektlegges. Ingen rettigheter.
 * Grunnen til at de er skilt: `selger` og `support` har nøyaktig samme
 * tilgang — begge er `dealer_staff`. Forskjellen er at den ene starter dagen i
 * kalenderen og den andre i innboksen. Hadde vi laget dem som RBAC-roller,
 * måtte hver eneste `adminProcedure` og RLS-policy tatt stilling til to nye
 * verdier som ikke betyr noe for tilgang — og da hadde en «funksjon» før eller
 * siden blitt brukt som en rettighet ved et uhell.
 * leder — implisitt for dealer_admin. Styrer alt.
 * selger — dealer_staff i forhandlerkonteksten: booking, kunder, salg.
 * support — dealer_staff dedikert til kundeinnboksen.
 * mekaniker — dealer_staff med mekanikerprofil → mobil-shell.
 */
export const jobFunctionEnum = pgEnum('job_function', ['leder', 'selger', 'support', 'mekaniker']);

/**
 * Medlemsprofil i ÉN tenant. Kallenavn og jobbfunksjon.
 * Kallenavn vises aldri utad
 * Kallenavnet er intern moro mellom mekanikere og forhandler. I enhver
 * kundevendt sammenheng vises det ekte navnet (eller forhandlerens navn).
 * Grensen håndheves i `visningsnavn` (`packages/modules/src/profil/`), som er
 * eneste sted et kallenavn kan bli til et visningsnavn — og den defaulter til
 * `offisiell`. Glemmer man å be om intern visning, får man ekte navn. Feilen
 * skal gå mot det trygge.
 * kallenavn er åpent for alle innloggede roller, også
 * `dealer_admin`. Det vises bare internt (`visningsnavn(..., 'intern')`).
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
     * De aller fleste ansatte har ingen rad i denne tabellen — den opprettes
     * først når noen setter et kallenavn eller en funksjon. En `NOT NULL` her
     * ville krevd en rad per medlem, som måtte holdes i synk med `member` for
     * alltid, og som ville gått ut av synk første gang noen ble lagt til
     * gjennom Better-Auth uten å innom oss.
     * Null = «ikke satt eksplisitt» → `resolveJobbfunksjon` utleder den fra
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
