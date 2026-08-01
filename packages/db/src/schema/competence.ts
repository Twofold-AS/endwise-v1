import { sql } from 'drizzle-orm';
import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { mechanics } from './mechanics.ts';
import { tenants } from './tenants.ts';

/**
 * F3-12 — Kompetanseregister.
 *
 * ── HVORFOR GRADERT OG IKKE BINÆRT ──────────────────────────────────────────
 *
 * Binært («har / har ikke») hadde vært nok til å svare på det HARDE kravet i
 * F3-02: kan denne mekanikeren ta jobben? Men matcheren gjør to ting, ikke én.
 * Den andre er **spesialist-vernet**: når flere kan ta jobben, skal ikke
 * båtmotor-eksperten bruke dagen på EU-kontroll av en moped.
 *
 * Spesialist-vernet trengte et MÅL. Til nå telte det bare antall ferdigheter —
 * en grov proxy: «mange ferdigheter = spesialist». Det er feil. En mekaniker med
 * fem ferdigheter på nybegynnernivå er en generalist, ikke en spesialist.
 * Nivået er det som faktisk skiller dem.
 *
 * Og så er det sertifiseringen, som avgjorde saken: **EU-kontroll krever en
 * sertifisering som UTLØPER.** En boolean kan ikke utløpe. Et felt som ikke kan
 * utløpe, vil før eller siden la en usertifisert mekaniker ta en jobb han ikke
 * har lov til å ta — og det er ikke en UX-bug, det er et tilsynsavvik.
 *
 * Derfor: nivå 1–5 + valgfri sertifisering med utløpsdato.
 */

/** Ferdighetskatalogen — per tenant. Én forhandler kaller det «MC-EU», en annen «EU MC». */
export const skills = pgTable(
  'skills',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Maskinnøkkelen. Denne er det `service_versions.skills` peker på. */
    key: text('key').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    /** Krever denne ferdigheten en gyldig sertifisering for å kunne brukes? */
    requiresCertification: boolean('requires_certification').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [primaryKey({ columns: [t.tenantId, t.key] }), tenantPolicy('skills', t.tenantId)],
).enableRLS();

/**
 * Kompetansen til én mekaniker på én ferdighet.
 *
 * `level`: 1 = under opplæring · 3 = selvstendig · 5 = spesialist.
 * `certificationExpiresAt`: null = ingen sertifisering registrert. Er ferdigheten
 * merket `requiresCertification`, teller mekanikeren som IKKE kvalifisert uten en
 * gyldig dato — se `qualifiedMechanicSkills`.
 */
export const mechanicSkills = pgTable(
  'mechanic_skills',
  {
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    mechanicId: uuid('mechanic_id')
      .notNull()
      .references(() => mechanics.id, { onDelete: 'cascade' }),
    skillKey: text('skill_key').notNull(),

    level: integer('level').notNull().default(3),

    certifiedAt: date('certified_at'),
    certificationExpiresAt: date('certification_expires_at'),
    /** Erfaring i år. Informativt for forhandleren; matcheren rangerer på `level`. */
    yearsExperience: integer('years_experience'),
    notes: text('notes'),

    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    primaryKey({ columns: [t.mechanicId, t.skillKey] }),
    index('mechanic_skills_tenant_skill_idx').on(t.tenantId, t.skillKey),
    tenantPolicy('mechanic_skills', t.tenantId),
  ],
).enableRLS();

export type Skill = typeof skills.$inferSelect;
export type NewSkill = typeof skills.$inferInsert;
export type MechanicSkill = typeof mechanicSkills.$inferSelect;
export type NewMechanicSkill = typeof mechanicSkills.$inferInsert;

/** Nivåskalaen, i klartekst. UI-et (F3-08) skal vise disse ordene, ikke tall. */
export const SKILL_LEVELS = {
  1: 'Under opplæring',
  2: 'Trenger veiledning',
  3: 'Selvstendig',
  4: 'Erfaren',
  5: 'Spesialist',
} as const;

export type SkillLevel = keyof typeof SKILL_LEVELS;
