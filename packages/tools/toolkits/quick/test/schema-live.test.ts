import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createQuickClient,
  mapQuickCustomer,
  mapQuickItem,
  mapQuickStockEntry,
} from '../src/index.ts';
import {
  describeQuickJsonKeys,
  foldQuickJsonKeys,
  parseQuickCustomerBatch,
  parseQuickItemBatch,
  parseQuickStockEntryBatch,
  quickCustomerBatch,
  quickEntitySnapshot,
  quickItemBatch,
  quickStockEntryBatch,
} from '../src/schema.ts';

/**
 * Live symptom: setConfig (client/info → z.object({}).loose) can succeed
 * while pullNow throws «Uventet svarformat fra Quick» because customer/item/
 * stockentry batch schemas require camelCase `guid` on every result.
 * Evidence in-repo (not invented):
 * Yamaha envelope `{ totalCount, limit, offset, results }` (batch.ts).
 * Quick3 release notes: item sort fields `ItemCode`, `ItemName` (PascalCase).
 * Tests only feed camelCase `{ guid }`.
 * `.loose` keeps extra keys; it does not alias `Guid` → `guid`.
 * This file locks the parse of those shapes. It is not a live Yamaha pull.
 */

const cfg = { baseUrl: 'https://q3.quick.no/Test_Public', token: 'tkn' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.restoreAllMocks());

const PASCAL_CUSTOMER_PAGE = {
  totalCount: 1,
  limit: 100,
  offset: 0,
  results: [
    {
      Guid: 'cust-1',
      Company: 'Yamaha Bergen',
      ContactPersons: [
        { FirstName: 'Kari', LastName: 'Nordmann', Email: 'kari@x.no', Mobile: '999' },
      ],
    },
  ],
};

const PASCAL_ITEM_PAGE = {
  totalCount: 1,
  limit: 100,
  offset: 0,
  results: [
    {
      Guid: 'item-1',
      ItemCode: 'YAM-001',
      ItemName: 'Tennplugg',
      CostPrice: 149.5,
      Unit: 'stk',
    },
  ],
};

const PASCAL_STOCK_PAGE = {
  totalCount: 1,
  limit: 100,
  offset: 0,
  results: [
    {
      Guid: 'se-1',
      ItemGuid: 'item-1',
      Quantity: 4,
      StockLocationCode: 'A-01',
      StockLocationName: 'Hylle A',
    },
  ],
};

describe('nåværende Zod uten fold — verifisert parse-feil', () => {
  it('customer/batch med Guid/Company avvises (det er pullNow-feilen)', () => {
    expect(() => quickCustomerBatch.parse(PASCAL_CUSTOMER_PAGE)).toThrow();
  });

  it('item/batch med Guid/ItemCode/ItemName avvises', () => {
    expect(() => quickItemBatch.parse(PASCAL_ITEM_PAGE)).toThrow();
  });

  it('stockentry/batch med Guid/ItemGuid avvises', () => {
    expect(() => quickStockEntryBatch.parse(PASCAL_STOCK_PAGE)).toThrow();
  });

  it('camelCase Yamaha-form (eksisterende tester) passerer fortsatt rå-skjema', () => {
    expect(
      quickCustomerBatch.parse({
        totalCount: 1,
        limit: 1,
        offset: 0,
        results: [{ guid: 'a', company: 'X' }],
      }).results[0]?.guid,
    ).toBe('a');
  });
});

describe('foldQuickJsonKeys — første bokstav, ingen oppdiktede felt', () => {
  it('Guid→guid, ItemCode→itemCode, ContactPersons→contactPersons', () => {
    expect(foldQuickJsonKeys(PASCAL_CUSTOMER_PAGE)).toEqual({
      totalCount: 1,
      limit: 100,
      offset: 0,
      results: [
        {
          guid: 'cust-1',
          company: 'Yamaha Bergen',
          contactPersons: [
            { firstName: 'Kari', lastName: 'Nordmann', email: 'kari@x.no', mobile: '999' },
          ],
        },
      ],
    });
    expect(foldQuickJsonKeys({ ItemCode: 'YAM-001', ItemName: 'Tennplugg' })).toEqual({
      itemCode: 'YAM-001',
      itemName: 'Tennplugg',
    });
  });

  it('camelCase er identitet — Yamaha-envelope endres ikke', () => {
    const page = { totalCount: 2, limit: 1, offset: 0, results: [{ guid: 'a' }] };
    expect(foldQuickJsonKeys(page)).toEqual(page);
  });
});

describe('parseQuick*Batch — ekte Quick-casing uten å finne opp felt', () => {
  it('parser PascalCase-kunde og mapper til speilet', () => {
    const page = parseQuickCustomerBatch(PASCAL_CUSTOMER_PAGE);
    const customer = page.results[0];
    if (!customer) throw new Error('forventet en kunde');
    expect(page.totalCount).toBe(1);
    expect(customer.guid).toBe('cust-1');
    expect(mapQuickCustomer(customer)).toEqual({
      quickGuid: 'cust-1',
      name: 'Yamaha Bergen',
      email: 'kari@x.no',
      phone: '999',
    });
  });

  it('parser ItemCode/ItemName (release notes) og mapper sku/navn/kost — ikke utsalg', () => {
    const page = parseQuickItemBatch(PASCAL_ITEM_PAGE);
    const item = page.results[0];
    if (!item) throw new Error('forventet en vare');
    const mapped = mapQuickItem(item);
    expect(mapped).toEqual({
      quickGuid: 'item-1',
      sku: 'YAM-001',
      name: 'Tennplugg',
      unit: 'stk',
      costMinor: 14950,
      active: true,
      onHand: null,
    });
    expect(mapped).not.toHaveProperty('sellPriceMinor');
  });

  it('parser stockentry PascalCase og mapper beholdning', () => {
    const page = parseQuickStockEntryBatch(PASCAL_STOCK_PAGE);
    const row = page.results[0];
    if (!row) throw new Error('forventet en lagerlinje');
    expect(mapQuickStockEntry(row)).toEqual({
      quickGuid: 'se-1',
      itemQuickGuid: 'item-1',
      onHand: 4,
      locationQuickGuid: null,
      locationCode: 'A-01',
      locationName: 'Hylle A',
    });
  });

  it('ukjente ekstra felt velter ikke siden', () => {
    const page = parseQuickCustomerBatch({
      totalCount: 1,
      limit: 1,
      offset: 0,
      results: [{ Guid: 'x', ExtraUnknown: { foo: 1 } }],
    });
    expect(page.results[0]?.guid).toBe('x');
  });
});

/**
 * Produksjonsform (C# JSON): PascalCase + null på valgfrie felt.
 * #59-fold aliaser Guid→guid, men Zod `.optional()` avviser `null`.
 * Ett null-felt velter hele siden → pullNow 500 etter at Quick svarte.
 */
const LIVE_NULL_CUSTOMER_PAGE = {
  TotalCount: 2,
  Limit: 100,
  Offset: 0,
  Results: [
    {
      Guid: 'cust-1',
      Company: null,
      Email: null,
      Phone: null,
      ContactPersons: null,
      CustomerTypeGuid: null,
    },
    {
      Guid: 'cust-2',
      Company: 'Yamaha Bergen',
      ContactPersons: [{ FirstName: 'Kari', LastName: null, Email: 'kari@x.no', Mobile: null }],
    },
  ],
};

const LIVE_NULL_ITEM_PAGE = {
  TotalCount: 1,
  Limit: 100,
  Offset: 0,
  Results: [
    {
      Guid: 'item-1',
      ItemCode: 'YAM-001',
      ItemName: 'Tennplugg',
      CostPrice: null,
      Unit: null,
      ItemGroup: { Guid: 'grp-1', Name: 'Yamaha Motor' },
      Groups: [{ Name: 'Reservedeler' }],
    },
  ],
};

const LIVE_NULL_STOCK_PAGE = {
  TotalCount: 1,
  Limit: 100,
  Offset: 0,
  Results: [
    {
      Guid: 'se-1',
      ItemGuid: 'item-1',
      Quantity: 4,
      StockLocationGuid: null,
      StockLocationCode: 'A-01',
      StockLocationName: null,
    },
  ],
};

describe('live C#-form med null — må ikke velte batch', () => {
  it('customer/batch med Company/ContactPersons=null parser og mapper', () => {
    const page = parseQuickCustomerBatch(LIVE_NULL_CUSTOMER_PAGE);
    expect(page.results).toHaveLength(2);
    const first = page.results[0];
    const second = page.results[1];
    if (!first || !second) throw new Error('forventet to kunder');
    expect(first.guid).toBe('cust-1');
    expect(mapQuickCustomer(first)).toEqual({
      quickGuid: 'cust-1',
      name: 'Ukjent kunde',
      email: null,
      phone: null,
    });
    expect(mapQuickCustomer(second).name).toBe('Yamaha Bergen');
  });

  it('item/batch med CostPrice=null og Quick-grupper parser uten å finne opp utsalg', () => {
    const page = parseQuickItemBatch(LIVE_NULL_ITEM_PAGE);
    const item = page.results[0];
    if (!item) throw new Error('forventet en vare');
    const mapped = mapQuickItem(item);
    expect(mapped).toEqual({
      quickGuid: 'item-1',
      sku: 'YAM-001',
      name: 'Tennplugg',
      unit: 'stk',
      costMinor: null,
      active: true,
      onHand: null,
    });
    expect(mapped).not.toHaveProperty('sellPriceMinor');
    expect(mapped).not.toHaveProperty('group');
    expect(mapped).not.toHaveProperty('itemGroup');
  });

  it('stockentry/batch med null lokasjonsnavn parser', () => {
    const page = parseQuickStockEntryBatch(LIVE_NULL_STOCK_PAGE);
    const row = page.results[0];
    if (!row) throw new Error('forventet en lagerlinje');
    expect(mapQuickStockEntry(row)).toEqual({
      quickGuid: 'se-1',
      itemQuickGuid: 'item-1',
      onHand: 4,
      locationQuickGuid: null,
      locationCode: 'A-01',
      locationName: 'A-01',
    });
  });

  it('rad uten identitet hoppes over — resten av siden beholdes', () => {
    const page = parseQuickCustomerBatch({
      totalCount: 2,
      limit: 2,
      offset: 0,
      results: [{ Company: 'Uten id' }, { Guid: 'ok-1', Company: 'Med id' }],
    });
    expect(page.results.map((r) => r.guid)).toEqual(['ok-1']);
  });

  it('avvist envelope logger kun nøkler — ikke verdier', () => {
    const spy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(() => parseQuickCustomerBatch({ Foo: 'hemmelig', Bar: 1 })).toThrow(
      /Uventet svarformat fra Quick for kunder/,
    );
    const logged = spy.mock.calls.map((c) => c.join(' ')).join('\n');
    expect(logged).toMatch(/customer/);
    expect(logged).toMatch(/foo|Foo|bar|Bar/);
    expect(logged).not.toContain('hemmelig');
  });

  it('snapshot er type + external id + jsonb av nøkler Quick faktisk sendte', () => {
    const folded = foldQuickJsonKeys(LIVE_NULL_ITEM_PAGE.Results[0]) as Record<string, unknown>;
    const snap = quickEntitySnapshot('item', folded);
    expect(snap).toEqual({
      type: 'item',
      externalId: 'item-1',
      payload: folded,
    });
    expect(snap?.payload).toHaveProperty('itemGroup');
    expect(snap?.payload).not.toHaveProperty('sellPriceMinor');
  });

  it('describeQuickJsonKeys lister toppnivå uten verdier', () => {
    expect(describeQuickJsonKeys({ Guid: 'x', Company: 'Y' }).sort()).toEqual(['Company', 'Guid']);
  });
});

describe('createQuickClient.customerBatch — fold før parse (live sti)', () => {
  it('200 med PascalCase-results er ikke lenger «Uventet svarformat fra Quick»', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse(PASCAL_CUSTOMER_PAGE));
    const batch = await createQuickClient(cfg).customerBatch({ limit: 100, offset: 0 });
    const customer = batch.results[0];
    if (!customer) throw new Error('forventet en kunde');
    expect(batch.results).toHaveLength(1);
    expect(customer.guid).toBe('cust-1');
    expect(mapQuickCustomer(customer).name).toBe('Yamaha Bergen');
  });

  it('item + stockentry samme sti', async () => {
    const spy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(jsonResponse(PASCAL_ITEM_PAGE))
      .mockResolvedValueOnce(jsonResponse(PASCAL_STOCK_PAGE));
    const items = await createQuickClient(cfg).itemBatch();
    const stock = await createQuickClient(cfg).stockEntryBatch();
    const item = items.results[0];
    const stockRow = stock.results[0];
    if (!item || !stockRow) throw new Error('forventet item og stock');
    expect(mapQuickItem(item).sku).toBe('YAM-001');
    expect(mapQuickStockEntry(stockRow).onHand).toBe(4);
    expect(spy).toHaveBeenCalledTimes(2);
  });
});
