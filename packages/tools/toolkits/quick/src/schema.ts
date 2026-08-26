import { z } from 'zod';

/**
 * Quick3 Web API (v2, beta).
 * Usikkerhet: Swaggeren (…/swagger/docs/v2) er token-gated og returnerte tomt
 * uten en gyldig ApiV2-token. Feltene under er derfor modellert mot det som er
 * Bekreftet i oppgavespesifikasjonen — ikke mot en fullstendig API-kontrakt.
 * Alt er `.loose` slik at ukjente/uventede felt passerer i stedet for å velte
 * synken. Felt merket «usikker» er gjettede navn og må verifiseres mot en ekte
 * respons (helst mot Test_Public) før vi stoler på dem.
 * Verifisert (parse-feil, ikke live Yamaha-body):
 * `quickCustomer` krever camelCase `guid`. `.loose` bevarer `Guid` men
 * aliaser det ikke. `client/info` er `z.object({}).loose` — derfor kan
 * setConfig lykkes mens pullNow kaster «Uventet svarformat fra Quick».
 * Yamaha-envelope `{ totalCount, limit, offset, results }` er bekreftet.
 * Quick3 release notes bruker PascalCase `ItemCode` / `ItemName`.
 * `foldQuickJsonKeys` senker bare første bokstav (Guid→guid). Ingen nye
 * feltnavn. Ingen utsalgspris — `syncQuickParts` skriver ikke sellPriceMinor.
 * Bekreftede endepunkt:
 * GET /api/v2/customer/batch (limit, offset, changedAfterDate, customerTypeGuid, expansions)
 * GET /api/v2/client/info
 * Kjente, ikke kartlagte: /client/bankaccounts, /client/feesettings,
 * /common/language|country|paymentterm.
 * Delelager (GET-only): Quick3-release notes lister *item*-endepunkt
 * (sortering ItemCode/ItemName) og GET stock entry by guid, pluss «batch of X»
 * som standard. Samme batch-JSON som customer. Stier:
 * GET /api/v2/item/batch
 * GET /api/v2/stockentry/batch
 * Ingen POST/PUT/PATCH/DELETE mot Quick i pull.
 */

/**
 * En kontaktperson på en Quick-kunde. Kun `contactPersons: [...]` er bekreftet å
 * finnes; de indre feltnavnene er usikre (flere vanlige varianter forsøkes ved
 * mapping). `.loose` bevarer alt vi ikke kjenner.
 */
export const quickContactPerson = z
  .object({
    guid: z.string().optional(),
    // Usikker — navn kan komme som ett felt eller delt fornavn/etternavn.
    name: z.string().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    // Usikker — e-post/telefon-feltnavn ikke bekreftet.
    email: z.string().optional(),
    phone: z.string().optional(),
    mobile: z.string().optional(),
  })
  .loose();

/**
 * En kunde slik den kommer fra `customer/batch`. Bekreftet: `guid`, `company`,
 * `contactPersons`. Resten er usikker og bevares via `.loose`.
 */
export const quickCustomer = z
  .object({
    /** Bekreftet — entitetens GUID. Bærer identiteten mellom synk-kjøringer. */
    guid: z.string(),
    /** Bekreftet — firmanavn (kan være tomt for privatkunder). */
    company: z.string().optional(),
    /** Bekreftet — liste med kontaktpersoner. */
    contactPersons: z.array(quickContactPerson).optional(),
    // Usikre toppnivåfelt — vanlige i kunderegistre; verifiseres mot ekte respons.
    email: z.string().optional(),
    phone: z.string().optional(),
    customerTypeGuid: z.string().optional(),
  })
  .loose();

export type QuickCustomer = z.infer<typeof quickCustomer>;

/** Bekreftet responsform for de paginerte batch-endepunktene. */
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
 * så vi validerer bare at det er et objekt (.loose); selve 200-svaret er
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
 * En vare/del fra `item/batch`. Bekreftet fra Quick-release notes: ItemCode,
 * ItemName. `guid` følger customer-mønsteret. Resten er `.loose`.
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
 * En lagerlinje fra `stockentry/batch`. Feltnavn er usikre (flere varianter
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

/**
 * Quick3 C# JSON er ofte PascalCase (release notes: ItemCode, ItemName).
 * Våre skjema er camelCase (tester). Senk kun første bokstav — finner ikke
 * opp nøkler, mapper Guid→guid og ItemCode→itemCode. camelCase er identitet.
 */
export function foldQuickJsonKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(foldQuickJsonKeys);
  if (value !== null && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
      const first = key.charAt(0);
      const folded = first === '' ? key : first.toLowerCase() + key.slice(1);
      out[folded] = foldQuickJsonKeys(nested);
    }
    return out;
  }
  return value;
}

export function parseQuickCustomerBatch(json: unknown): QuickCustomerBatch {
  return quickCustomerBatch.parse(foldQuickJsonKeys(json));
}

export function parseQuickItemBatch(json: unknown): QuickItemBatch {
  return quickItemBatch.parse(foldQuickJsonKeys(json));
}

export function parseQuickStockEntryBatch(json: unknown): QuickStockEntryBatch {
  return quickStockEntryBatch.parse(foldQuickJsonKeys(json));
}

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
