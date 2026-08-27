import { z } from 'zod';
import { QuickError } from './errors.ts';

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
 * aliaser det ikke. `client/info` krever ingen felt (tomt objekt passerer)
 * men folder PascalCase før forhandler-profil.
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
const nullishString = z.string().nullish();
const nullishNumber = z.number().nullish();
const nullishBool = z.boolean().nullish();

export const quickContactPerson = z
  .object({
    guid: nullishString,
    // Usikker — navn kan komme som ett felt eller delt fornavn/etternavn.
    name: nullishString,
    firstName: nullishString,
    lastName: nullishString,
    // Usikker — e-post/telefon-feltnavn ikke bekreftet.
    email: nullishString,
    phone: nullishString,
    mobile: nullishString,
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
    /** Bekreftet — firmanavn (kan være tomt for privatkunder). C# sender ofte null. */
    company: nullishString,
    /** Bekreftet — liste med kontaktpersoner. */
    contactPersons: z.array(quickContactPerson).nullish(),
    // Usikre toppnivåfelt — vanlige i kunderegistre; verifiseres mot ekte respons.
    email: nullishString,
    phone: nullishString,
    customerTypeGuid: nullishString,
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
 * `client/info` — tilkoblingstest + forhandler-profil.
 * Ingen påkrevde felt: tomt objekt (dagens probe-suksess) passerer.
 * Bekreftet firmanavn: name / company (samme som customer/batch).
 * Øvrige nøkler bevares via .loose og mappes bare når de finnes etter fold.
 */
export const quickClientInfo = z
  .object({
    name: z.string().optional(),
    company: z.string().optional(),
  })
  .loose();
export type QuickClientInfo = z.infer<typeof quickClientInfo>;

/** Quick-nøkkel etter fold → Endwise-kolonne. Tom verdi = ikke overskriv. */
export const QUICK_CLIENT_FIELD_MAP = [
  { quick: 'name', columns: ['tenants.name', 'organization.name'] },
  {
    quick: 'company',
    columns: ['tenants.name', 'organization.name'],
    when: 'hvis name mangler',
  },
  { quick: 'organizationNumber', columns: ['dealer_profiles.orgnr'] },
  { quick: 'orgNo', columns: ['dealer_profiles.orgnr'], when: 'hvis organizationNumber mangler' },
  { quick: 'address', columns: ['dealer_profiles.address'] },
  { quick: 'zipCode', columns: ['dealer_profiles.postal_code'] },
  { quick: 'postalCode', columns: ['dealer_profiles.postal_code'], when: 'hvis zipCode mangler' },
  { quick: 'city', columns: ['dealer_profiles.city'] },
  { quick: 'phone', columns: ['dealer_profiles.phone'] },
  { quick: 'email', columns: ['dealer_profiles.email'] },
  { quick: 'website', columns: ['dealer_profiles.website'] },
  { quick: 'homepage', columns: ['dealer_profiles.website'], when: 'hvis website mangler' },
] as const;

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
    itemCode: nullishString,
    code: nullishString,
    number: nullishString,
    name: nullishString,
    itemName: nullishString,
    unit: nullishString,
    unitCode: nullishString,
    costPrice: nullishNumber,
    cost: nullishNumber,
    inStock: nullishNumber,
    stock: nullishNumber,
    isInactive: nullishBool,
    inactive: nullishBool,
    discontinued: nullishBool,
    active: nullishBool,
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
    itemGuid: nullishString,
    item: z.object({ guid: nullishString }).loose().nullish(),
    quantity: nullishNumber,
    inStock: nullishNumber,
    stock: nullishNumber,
    amount: nullishNumber,
    stockLocationGuid: nullishString,
    warehouseGuid: nullishString,
    locationGuid: nullishString,
    stockLocationCode: nullishString,
    warehouseCode: nullishString,
    locationCode: nullishString,
    stockLocationName: nullishString,
    warehouseName: nullishString,
    locationName: nullishString,
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

export type QuickSnapshotType = 'customer' | 'item' | 'stock';

const ENTITY_NB: Record<QuickSnapshotType, string> = {
  customer: 'kunder',
  item: 'varer',
  stock: 'lager',
};

/** Envelope uten rad-skjema — C# kan sende null/utelate limit. */
export const quickBatchEnvelope = z
  .object({
    totalCount: z.coerce.number(),
    limit: z.coerce.number().optional().default(0),
    offset: z.coerce.number().optional().default(0),
    results: z.array(z.unknown()).nullish().default([]),
  })
  .loose();

export function describeQuickJsonKeys(value: unknown): string[] {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.keys(value);
}

/** CWE-532: kun nøkler, aldri verdier (kan være PII). */
export function logQuickSchemaReject(entity: QuickSnapshotType, value: unknown): void {
  console.info(
    JSON.stringify({
      msg: 'quick.batch.schema_reject',
      entity,
      keys: describeQuickJsonKeys(value),
    }),
  );
}

function nonemptyQuickKey(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Persist-identitet: type + ekstern id + jsonb av nøkler Quick faktisk sendte. */
export function quickEntitySnapshot(
  type: QuickSnapshotType,
  row: Record<string, unknown>,
): { type: QuickSnapshotType; externalId: string; payload: Record<string, unknown> } | null {
  const externalId = nonemptyQuickKey(row.guid) ?? nonemptyQuickKey(row.id);
  if (!externalId) return null;
  return { type, externalId, payload: row };
}

function aliasRowGuid(row: Record<string, unknown>): Record<string, unknown> {
  if (nonemptyQuickKey(row.guid)) return row;
  const id = nonemptyQuickKey(row.id);
  return id ? { ...row, guid: id } : row;
}

function parseQuickBatch<T>(
  json: unknown,
  entity: QuickSnapshotType,
  parseRow: (row: Record<string, unknown>) => T | null,
): { totalCount: number; limit: number; offset: number; results: T[] } {
  const folded = foldQuickJsonKeys(json);
  const envelope = quickBatchEnvelope.safeParse(folded);
  if (!envelope.success) {
    logQuickSchemaReject(entity, folded);
    throw new QuickError(`Uventet svarformat fra Quick for ${ENTITY_NB[entity]}.`);
  }
  const results: T[] = [];
  let loggedSkip = false;
  for (const raw of envelope.data.results ?? []) {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const row = parseRow(aliasRowGuid(raw as Record<string, unknown>));
    if (row) {
      results.push(row);
      continue;
    }
    if (!loggedSkip) {
      logQuickSchemaReject(entity, raw);
      loggedSkip = true;
    }
  }
  return {
    totalCount: envelope.data.totalCount,
    limit: envelope.data.limit,
    offset: envelope.data.offset,
    results,
  };
}

export function parseQuickCustomerBatch(json: unknown): QuickCustomerBatch {
  return parseQuickBatch(json, 'customer', (row) => {
    const parsed = quickCustomer.safeParse(row);
    return parsed.success ? parsed.data : null;
  });
}

export function parseQuickItemBatch(json: unknown): QuickItemBatch {
  return parseQuickBatch(json, 'item', (row) => {
    const parsed = quickItem.safeParse(row);
    return parsed.success ? parsed.data : null;
  });
}

export function parseQuickStockEntryBatch(json: unknown): QuickStockEntryBatch {
  return parseQuickBatch(json, 'stock', (row) => {
    const parsed = quickStockEntry.safeParse(row);
    return parsed.success ? parsed.data : null;
  });
}

export function parseQuickClientInfo(json: unknown): QuickClientInfo {
  return quickClientInfo.parse(foldQuickJsonKeys(json));
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
