import { sql } from 'drizzle-orm';
import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { tenantPolicy } from '../rls.ts';
import { mechanics } from './mechanics.ts';
import { tenants } from './tenants.ts';

/**
 * F2-09 — LAGER. Driftslageret til verkstedet. **KJERNE, ikke betalt modul.**
 *
 * Skillet som må holdes rent gjennom hele modellen:
 * **Lager er fysisk beholdning. Butikk er salg.** Blander vi dem, får vi to
 * steder som begge tror de eier lagernivået — og da er «hvor mange har vi?»
 * ikke lenger et spørsmål med ett svar. Lager er sannheten; Butikk (F10-03)
 * spør, og reserverer.
 *
 * ⚠️ `costMinor` er innkjøpspris og er en FORRETNINGSHEMMELIGHET — se
 * felt-allowlisten i lager-verktøyet for AI-agenten (F6-15/LLM06).
 * `sellPriceMinor` er Butikk-utsalg på SAMME rad (F10-03) — ikke en
 * annen katalog. Null = ikke til salg.
 */

/**
 * Hvorfor en bevegelse skjedde. Enum og ikke fritekst: dette er feltet man
 * senere summerer på, og «justering»/«Justering»/«korr» ville gjort det umulig.
 */
export const stockMovementKindEnum = pgEnum('stock_movement_kind', [
  /** Varemottak — beholdningen øker. */
  'in',
  /** Uttak til en jobb — beholdningen synker. */
  'out',
  /** Opptelling/korreksjon — settes til et absolutt tall. */
  'adjust',
  /** Reservert til en kommende jobb eller ordre. Beholdningen står, men er bundet. */
  'reserve',
  /** Reservasjon frigitt uten uttak (avlyst jobb). */
  'release',
]);

/* ══ Deler ═══════════════════════════════════════════════════════════════ */

/**
 * En artikkel på delelageret.
 *
 * ⚠️ **CWE-639/IDOR:** `sku` er menneskelesbar og GJETTBAR — det er hele
 * poenget med et delenummer. Et oppslag på `sku` alene er derfor en IDOR som
 * ser ut som et oppslag. Unik-indeksen er `(tenant_id, sku)`, aldri `sku`
 * alene, og hver spørring må ha tenant i WHERE i tillegg til RLS som nett.
 */
export const parts = pgTable(
  'parts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Delenummer/SKU. Unikt PER TENANT — to verksteder kan ha samme nummer. */
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    /** Fri gruppering: «Bremser», «Filter», «Olje». Ingen enum — dette er verkstedets eget språk. */
    category: text('category'),
    /** Enhet: stk, liter, meter. */
    unit: text('unit').notNull().default('stk'),
    /**
     * Innkjøpspris i ØRE. Flyttall og penger hører ikke sammen.
     * ⛔ FORRETNINGSHEMMELIGHET — aldri ut til en kundevendt agent (LLM06).
     */
    costMinor: integer('cost_minor'),
    /**
     * F10-03 — Utsalgspris i ØRE. **Ikke en annen katalog.** Butikk leser
     * `parts` + `stock_levels`. Null = ikke til salg i Butikk. Kostpris
     * (`costMinor`) er innkjøp og forblir forretningshemmelighet.
     */
    sellPriceMinor: integer('sell_price_minor'),
    /** Varsle når samlet beholdning faller under dette. Null = ikke varsle. */
    minStock: integer('min_stock'),
    active: boolean('active').notNull().default(true),
    /**
     * F8-01 / F1-07 — Hvor delen kom fra: 'endwise' (opprettet her) eller 'quick'
     * (speilet fra forhandlerens Quick). Default 'endwise'.
     */
    source: text('source').notNull().default('endwise'),
    /**
     * F8-01 — Quick sin vare-GUID. Idempotent upsert. Null for deler født i Endwise.
     */
    quickGuid: text('quick_guid'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('parts_tenant_sku_uq').on(t.tenantId, t.sku),
    uniqueIndex('parts_tenant_quick_guid_uidx').on(t.tenantId, t.quickGuid),
    index('parts_tenant_active_idx').on(t.tenantId, t.active),
    tenantPolicy('parts', t.tenantId),
  ],
).enableRLS();

/* ══ Lokasjoner ══════════════════════════════════════════════════════════ */

/** Hylle, rom, servicebil — hvor delen fysisk ligger. */
export const stockLocations = pgTable(
  'stock_locations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    /** Kort kode brukt i hverdagen: «A-03», «BIL-1». */
    code: text('code').notNull(),
    name: text('name').notNull(),
    /** Quick sin lokasjons-GUID. Null for lokasjoner født i Endwise. */
    quickGuid: text('quick_guid'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('stock_locations_tenant_code_uq').on(t.tenantId, t.code),
    uniqueIndex('stock_locations_tenant_quick_guid_uidx').on(t.tenantId, t.quickGuid),
    tenantPolicy('stock_locations', t.tenantId),
  ],
).enableRLS();

/* ══ Lagernivå ═══════════════════════════════════════════════════════════ */

/**
 * Beholdning per del per lokasjon.
 *
 * ⛔ **`reserved` er ikke valgfri, og den er ikke pynt.**
 *
 * Sikkerhetsgjennomgangen (OWASP A08) slo fast at nedtelling alene gir
 * dobbeltsalg: mekanikeren tar den siste bremseklossen fra hylla, og ti
 * minutter senere selger butikken den samme klossen — fordi ingen av dem så
 * den andres hensikt før uttaket var et faktum.
 *
 * Derfor: **tilgjengelig = onHand − reserved.** Et salg eller en planlagt jobb
 * RESERVERER; uttaket bekreftes når delen faktisk forlater hylla. Feltet må
 * finnes fra dag én, ellers må hele Butikk-synken (F8-10) bygges om senere.
 */
export const stockLevels = pgTable(
  'stock_levels',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    partId: uuid('part_id')
      .notNull()
      .references(() => parts.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => stockLocations.id, { onDelete: 'cascade' }),
    /** Fysisk på hylla. */
    onHand: integer('on_hand').notNull().default(0),
    /** Bundet til en jobb eller ordre. Står fysisk, men er lovet bort. */
    reserved: integer('reserved').notNull().default(0),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    uniqueIndex('stock_levels_part_location_uq').on(t.tenantId, t.partId, t.locationId),
    index('stock_levels_tenant_part_idx').on(t.tenantId, t.partId),
    tenantPolicy('stock_levels', t.tenantId),
  ],
).enableRLS();

/* ══ Bevegelser ══════════════════════════════════════════════════════════ */

/**
 * Append-only bevegelseslogg. **Dette er fasiten.**
 *
 * `stock_levels` er en materialisering man kan bygge opp igjen fra denne — ikke
 * omvendt. Derfor har den ingen `updatedAt`: en rad her endres aldri. Er tallet
 * feil, legger man til en `adjust`, man retter ikke historien.
 *
 * `actorUserId` og `mechanicId` svarer på HVEM: den første er alltid satt (en
 * innlogget bruker gjorde dette), den andre kun når uttaket hører til en
 * mekanikers jobb.
 */
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id')
      .notNull()
      .references(() => tenants.id, { onDelete: 'cascade' }),
    partId: uuid('part_id')
      .notNull()
      .references(() => parts.id, { onDelete: 'cascade' }),
    locationId: uuid('location_id')
      .notNull()
      .references(() => stockLocations.id, { onDelete: 'cascade' }),
    kind: stockMovementKindEnum('kind').notNull(),
    /**
     * Antall. Alltid POSITIVT — retningen ligger i `kind`, ikke i fortegnet.
     * Et negativt tall på en `in` ville vært to måter å si det samme på.
     */
    quantity: integer('quantity').notNull(),
    /** Better-Auth-bruker som utførte handlingen. Fra sesjonen, aldri fra input. */
    actorUserId: text('actor_user_id'),
    /** Satt når bevegelsen hører til en mekanikers jobb. */
    mechanicId: uuid('mechanic_id').references(() => mechanics.id, { onDelete: 'set null' }),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().default(sql`now()`),
  },
  (t) => [
    index('stock_movements_tenant_created_idx').on(t.tenantId, t.createdAt),
    index('stock_movements_tenant_part_idx').on(t.tenantId, t.partId),
    tenantPolicy('stock_movements', t.tenantId),
  ],
).enableRLS();

export type Part = typeof parts.$inferSelect;
export type NewPart = typeof parts.$inferInsert;
export type StockLocation = typeof stockLocations.$inferSelect;
export type NewStockLocation = typeof stockLocations.$inferInsert;
export type StockLevel = typeof stockLevels.$inferSelect;
export type NewStockLevel = typeof stockLevels.$inferInsert;
export type StockMovement = typeof stockMovements.$inferSelect;
export type NewStockMovement = typeof stockMovements.$inferInsert;
export type StockMovementKind = (typeof stockMovementKindEnum.enumValues)[number];
