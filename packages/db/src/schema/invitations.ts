import { sql } from 'drizzle-orm';
import { check, index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { jobFunctionEnum } from './profiles.ts';
import { tenants } from './tenants.ts';

/**
 * Invitasjoner. Lederen inviterer, den ansatte fullfører selv.
 * Vi lagrer hashen, aldri tokenet
 * `tokenHash` er SHA-256 av det tilfeldige tokenet. Rå-tokenet finnes ett
 * eneste sted: i lenka som sendes på e-post. Får noen lesetilgang til denne
 * tabellen — en database-dump, en feilkonfigurert backup, en logget spørring
 * kan de fortsatt ikke godta en eneste invitasjon.
 * SHA-256 uten salt er riktig her, i motsetning til for passord: tokenet er
 * 256 bit kryptografisk tilfeldig, så det finnes ingen ordbok å angripe det
 * med. Bcrypt-runder ville bare gjort oppslaget tregt uten å gjøre det tryggere.
 * To spor, to CHECKer
 * `kind = staff` er låst til `dealer_staff` + tildelbar funksjon (ikke `leder`).
 * `kind = owner` er det bevisste unntaket: `dealer_admin` + `leder`, brukt av
 * Endwise-admins forhandler-onboarding. Staff-ruten kan ikke velge owner.
 * `kind = platform` er Endwise-team (administrator | support). Aldri F1-10-
 * funksjoner, aldri «eier». `endwise_support` er en annen rolle enn dealer support.
 * Offentlig oppslag
 * Tenant-policyen over holder lederens liste. Den som åpner lenka har ingen
 * tenant. Unntaket er `lookup_open_invitation` / `invitations_open_by_hash`
 * i `sql/functions.sql` + `sql/grants.sql` — ikke en Drizzle-policy her,
 * fordi den må gjelde DEFINER-eieren (to public), ikke bare `authenticated`.
 * Livssyklus
 * Åpen = `accepted_at IS NULL AND revoked_at IS NULL AND expires_at > now`
 * Brukt = `accepted_at` satt. **Engangs**: godta-stien skriver den i samme
 * transaksjon som medlemskapet opprettes, med en WHERE som krever at
 * den fortsatt er åpen. To samtidige forsøk gir derfor én vinner.
 * Trukket = `revoked_at` satt av lederen.
 * Utløpt = `expires_at` passert. Ingen jobb må kjøre for at den skal dø.
 */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),

    /** E-posten invitasjonen ble sendt til. Normalisert til småbokstaver. */
    email: text('email').notNull(),

    /** SHA-256 av tokenet. Aldri tokenet selv. Unikt på tvers av alle tenants. */
    tokenHash: text('token_hash').notNull(),

    /**
     * `staff` (F1-10), `owner` (F5-26 eier-invite) eller `platform`
     * (Endwise-team). Default staff så gamle rader holder staff-CHECken.
     */
    kind: text('kind').notNull().default('staff'),

    /**
     * Jobbfunksjonen. Staff: selger/support/mekaniker. Owner: `leder`.
     * Platform: NULL — F1-10-funksjoner brukes aldri på plattform-org.
     */
    jobFunction: jobFunctionEnum('job_function'),

    /**
     * Bare `kind = platform`. Administrator eller support — aldri eier.
     */
    platformLevel: text('platform_level'),

    /** Låst av check mot `kind`. Se filhodet. */
    role: text('role').notNull().default('dealer_staff'),

    /** Hvem som inviterte. Til sporbarhet i lista og i revisjon. */
    invitedBy: text('invited_by').notNull(),

    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    /**
     * Unik på hash alene, ikke per tenant. Tokenet slås opp før vi vet
     * hvilken tenant det gjelder — det er hele poenget med en invitasjonslenke.
     * Var den unik per tenant, kunne to tenants i teorien hatt samme hash, og
     * oppslaget ville returnert to rader uten noen måte å velge riktig.
     */
    uniqueIndex('invitations_token_hash_uidx').on(t.tokenHash),
    index('invitations_tenant_email_idx').on(t.tenantId, t.email),
    tenantPolicy('invitations', t.tenantId),
    check(
      'invitations_role_by_kind',
      sql`(${t.kind} = 'staff' AND ${t.role} = 'dealer_staff') OR (${t.kind} = 'owner' AND ${t.role} = 'dealer_admin') OR (${t.kind} = 'platform' AND ${t.role} IN ('endwise_admin', 'endwise_support'))`,
    ),
    check(
      'invitations_function_by_kind',
      sql`(${t.kind} = 'staff' AND ${t.jobFunction} IN ('selger', 'support', 'mekaniker')) OR (${t.kind} = 'owner' AND ${t.jobFunction} = 'leder') OR (${t.kind} = 'platform' AND ${t.jobFunction} IS NULL AND ${t.platformLevel} IN ('administrator', 'support'))`,
    ),
    check(
      'invitations_platform_level_role',
      sql`(${t.kind} <> 'platform') OR ((${t.role} = 'endwise_admin' AND ${t.platformLevel} = 'administrator') OR (${t.role} = 'endwise_support' AND ${t.platformLevel} = 'support'))`,
    ),
  ],
).enableRLS();

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
