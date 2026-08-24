import { z } from 'zod';

/**
 * F8-01 — Quick3 Web API (v2, BETA).
 *
 * ⚠️ USIKKERHET: Swaggeren (…/swagger/docs/v2) er TOKEN-GATED og returnerte tomt
 * uten en gyldig ApiV2-token. Feltene under er derfor modellert mot det som er
 * BEKREFTET i oppgavespesifikasjonen — ikke mot en fullstendig API-kontrakt.
 * ALT er `.loose()` slik at ukjente/uventede felt PASSERER i stedet for å velte
 * synken. Felt merket «USIKKER» er gjettede navn og må verifiseres mot en ekte
 * respons (helst mot Test_Public) før vi stoler på dem.
 *
 * Bekreftede endepunkt:
 *   GET /api/v2/customer/batch  (limit, offset, changedAfterDate, customerTypeGuid, expansions)
 *   GET /api/v2/client/info
 * Kjente, ikke kartlagte: /client/bankaccounts, /client/feesettings,
 *   /common/language|country|paymentterm.
 * Delelager (GET-only, 24.08.2026): Quick3-release notes lister *item*-endepunkt
 * (sortering ItemCode/ItemName) og GET stock entry by guid, pluss «batch of X»
 * som standard. Samme batch-JSON som customer. Stier:
 *   GET /api/v2/item/batch
 *   GET /api/v2/stockentry/batch
 * Ingen POST/PUT/PATCH/DELETE mot Quick i pull.
 */

/**
 * En kontaktperson på en Quick-kunde. Kun `contactPersons: [...]` er bekreftet å
 * finnes; de indre feltnavnene er USIKRE (flere vanlige varianter forsøkes ved
 * mapping). `.loose()` bevarer alt vi ikke kjenner.
 */
export const quickContactPerson = z
  .object({
    guid: z.string().optional(),
    // USIKKER — navn kan komme som ett felt eller delt fornavn/etternavn.
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    // USIKKER — e-post/telefon-feltnavn ikke bekreftet.
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
  })
  .loose();

/**
 * En kunde slik den kommer fra `customer/batch`. BEKREFTET: `guid`, `company`,
 * `contactPersons`. Resten er USIKKER og bevares via `.loose()`.
 */
export const quickCustomer = z
  .object({
    /** BEKREFTET — entitetens GUID. Bærer identiteten mellom synk-kjøringer. */
    guid: z.string(),
    /** BEKREFTET — firmanavn (kan være tomt for privatkunder). */
    company: z.string().optional(),
    /** BEKREFTET — liste med kontaktpersoner. */
    contactPersons: z.array(quickContactPerson).optional(),
    // USIKRE toppnivåfelt — vanlige i kunderegistre; verifiseres mot ekte respons.
    email: z.string().optional(),
    phone: z.string().optional(),
    customerTypeGuid: z.string().optional(),
  })
  .loose();

export type QuickCustomer = z.infer<typeof quickCustomer>;

/** BEKREFTET responsform for de paginerte batch-endepunktene. */
export const quickCustomerBatch = z
  .object({
    totalCount: z.number(),
    limit: z.number(),
    offset: z.number(),
    results: z.array(quickCustomer),
  })
  .loose();

export type QuickCustomerBatch = z.infer<typeof quickCustomerBatch>;

/**
 * `client/info` — brukes som «test tilkobling». Innholdet er ikke fullt kjent,
 * så vi validerer bare at det ER et objekt (.loose()); selve 200-svaret er
 * beviset på at token + baseUrl virker.
 */
export const quickClientInfo = z.object({}).loose();
export type QuickClientInfo = z.infer<typeof quickClientInfo>;

/** Det flate resultatet resten av Endwise forholder seg til (mappet fra QuickCustomer). */
export interface QuickCustomerRecord {
  /** Quick-GUID → customers.quickGuid (externalRef). */
  quickGuid: string;
  name: string;
  email: string | null;
  phone: string | null;
}

/**
 * En vare/del fra `item/batch`. BEKREFTET fra Quick-release notes: ItemCode,
 * ItemName. `guid` følger customer-mønsteret. Resten er `.loose()`.
 */
export const quickItem = z
  .object({
    guid: z.string(),
    itemCode: z.string().optional(),
    code: z.string().optional(),
    number: z.string().optional(),
    name: z.string().optional(),
    itemName: z.string().optional(),
    unit: z.string().optional(),
    unitCode: z.string().optional(),
    costPrice: z.number().optional(),
    cost: z.number().optional(),
    inStock: z.number().optional(),
    stock: z.number().optional(),
    isInactive: z.boolean().optional(),
    inactive: z.boolean().optional(),
    discontinued: z.boolean().optional(),
    active: z.boolean().optional(),
  })
  .loose();

export type QuickItem = z.infer<typeof quickItem>;

export const quickItemBatch = z
  .object({
    totalCount: z.number(),
    limit: z.number(),
    offset: z.number(),
    results: z.array(quickItem),
  })
  .loose();

export type QuickItemBatch = z.infer<typeof quickItemBatch>;

/**
 * En lagerlinje fra `stockentry/batch`. Feltnavn er USIKRE (flere varianter
 * forsøkes i mapping) — samme strategi som contactPersons på kunde.
 */
export const quickStockEntry = z
  .object({
    guid: z.string(),
    itemGuid: z.string().optional(),
    item: z.object({ guid: z.string().optional() }).loose().optional(),
    quantity: z.number().optional(),
    inStock: z.number().optional(),
    stock: z.number().optional(),
    amount: z.number().optional(),
    stockLocationGuid: z.string().optional(),
    warehouseGuid: z.string().optional(),
    locationGuid: z.string().optional(),
    stockLocationCode: z.string().optional(),
    warehouseCode: z.string().optional(),
    locationCode: z.string().optional(),
    stockLocationName: z.string().optional(),
    warehouseName: z.string().optional(),
    locationName: z.string().optional(),
  })
  .loose();

export type QuickStockEntry = z.infer<typeof quickStockEntry>;

export const quickStockEntryBatch = z
  .object({
    totalCount: z.number(),
    limit: z.number(),
    offset: z.number(),
    results: z.array(quickStockEntry),
  })
  .loose();

export type QuickStockEntryBatch = z.infer<typeof quickStockEntryBatch>;

export interface QuickItemRecord {
  quickGuid: string;
  sku: string;
  name: string;
  unit: string;
  costMinor: number | null;
  active: boolean;
  /** Fallback når stockentry mangler. Null = ikke oppgitt på varen. */
  onHand: number | null;
}

export interface QuickStockRecord {
  quickGuid: string;
  itemQuickGuid: string;
  onHand: number;
  locationQuickGuid: string | null;
  locationCode: string;
  locationName: string;
}
