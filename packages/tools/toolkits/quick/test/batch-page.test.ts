import { afterEach, describe, expect, it, vi } from 'vitest';
import { nextBatchOffset, quickBatchPage } from '../src/batch.ts';
import { createQuickClient, mapQuickItem, mapQuickStockEntry } from '../src/index.ts';

/**
 * Yamaha-størrelse: customer/batch (og item/stockentry/batch) svarer
 * `{ totalCount, limit, offset, results }`. Paginering er
 * offset += results.length til offset >= totalCount — aldri POST.
 */
const cfg = { baseUrl: 'https://q3.quick.no/Test_Public', token: 'fake-apiv2-ikke-ekte' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('results-JSON { totalCount, limit, offset, results }', () => {
  it('parser Yamaha-formen med results-array', () => {
    const page = quickBatchPage.parse({
      totalCount: 20466,
      limit: 100,
      offset: 0,
      results: [{ guid: 'a' }, { guid: 'b' }],
    });
    expect(page.totalCount).toBe(20466);
    expect(page.limit).toBe(100);
    expect(page.offset).toBe(0);
    expect(page.results).toHaveLength(2);
  });

  it('avviser kropp uten results / totalCount', () => {
    expect(() => quickBatchPage.parse({ items: [] })).toThrow();
    expect(() => quickBatchPage.parse({ totalCount: 1, offset: 0 })).toThrow();
  });
});

describe('nextBatchOffset — offset += results.length til offset >= totalCount', () => {
  it('går videre med faktisk antall rader, ikke limit', () => {
    expect(nextBatchOffset({ totalCount: 5, limit: 2, offset: 0, results: [{}, {}] })).toBe(2);
    expect(nextBatchOffset({ totalCount: 5, limit: 2, offset: 2, results: [{}, {}] })).toBe(4);
  });

  it('stopper når offset + length >= totalCount (siste side kortere enn limit)', () => {
    expect(nextBatchOffset({ totalCount: 5, limit: 2, offset: 4, results: [{}] })).toBeNull();
  });

  it('stopper på tom side og når totalCount er 0', () => {
    expect(nextBatchOffset({ totalCount: 0, limit: 100, offset: 0, results: [] })).toBeNull();
    expect(nextBatchOffset({ totalCount: 10, limit: 100, offset: 0, results: [] })).toBeNull();
  });
});

describe('iterateCustomers bruker results-JSON og offset+=length', () => {
  it('henter tre sider til offset >= totalCount (Yamaha-form)', async () => {
    const pages: Record<number, unknown> = {
      0: { totalCount: 5, limit: 2, offset: 0, results: [{ guid: 'a' }, { guid: 'b' }] },
      2: { totalCount: 5, limit: 2, offset: 2, results: [{ guid: 'c' }, { guid: 'd' }] },
      4: { totalCount: 5, limit: 2, offset: 4, results: [{ guid: 'e' }] },
    };
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const parsed = new URL(url as string);
      expect(parsed.pathname.endsWith('/api/v2/customer/batch')).toBe(true);
      const offset = Number(parsed.searchParams.get('offset'));
      return Promise.resolve(jsonResponse(pages[offset]));
    });

    const seen: string[] = [];
    for await (const c of createQuickClient(cfg).iterateCustomers({ pageSize: 2 })) {
      seen.push(c.guid);
    }
    expect(seen).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(spy).toHaveBeenCalledTimes(3);
    const last = spy.mock.calls[2];
    if (!last) throw new Error('forventet tredje fetch');
    expect(String(last[0])).toContain('offset=4');
    const first = spy.mock.calls[0];
    if (!first) throw new Error('forventet første fetch');
    expect((first[1] as RequestInit).method).toBe('GET');
  });
});

describe('GET /api/v2/item/batch — deler (GET-only)', () => {
  it('paginerer results til offset >= totalCount', async () => {
    const pages: Record<number, unknown> = {
      0: {
        totalCount: 3,
        limit: 2,
        offset: 0,
        results: [
          { guid: 'i1', itemCode: 'OLJE-1', name: 'Motorolje' },
          { guid: 'i2', itemCode: 'FLT-2', itemName: 'Olje filter' },
        ],
      },
      2: {
        totalCount: 3,
        limit: 2,
        offset: 2,
        results: [{ guid: 'i3', itemCode: 'BRK-3', name: 'Bremsekloss' }],
      },
    };
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const parsed = new URL(url as string);
      expect(parsed.pathname.endsWith('/api/v2/item/batch')).toBe(true);
      const offset = Number(parsed.searchParams.get('offset'));
      return Promise.resolve(jsonResponse(pages[offset]));
    });

    const seen: string[] = [];
    for await (const item of createQuickClient(cfg).iterateItems({ pageSize: 2 })) {
      seen.push(item.guid);
    }
    expect(seen).toEqual(['i1', 'i2', 'i3']);
    expect(spy).toHaveBeenCalledTimes(2);
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('forventet fetch');
    const init = kall[1] as RequestInit;
    expect(init.method).toBe('GET');
    expect(['POST', 'PUT', 'PATCH', 'DELETE']).not.toContain(init.method);
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Token token=fake-apiv2-ikke-ekte');
    expect(headers.Accept).toBe('application/json');
  });
});

describe('GET /api/v2/stockentry/batch — beholdning (GET-only)', () => {
  it('paginerer results til offset >= totalCount', async () => {
    const pages: Record<number, unknown> = {
      0: {
        totalCount: 2,
        limit: 1,
        offset: 0,
        results: [{ guid: 's1', itemGuid: 'i1', quantity: 4, stockLocationCode: 'A-01' }],
      },
      1: {
        totalCount: 2,
        limit: 1,
        offset: 1,
        results: [{ guid: 's2', itemGuid: 'i2', inStock: 9, warehouseCode: 'B-02' }],
      },
    };
    const spy = vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const parsed = new URL(url as string);
      expect(parsed.pathname.endsWith('/api/v2/stockentry/batch')).toBe(true);
      const offset = Number(parsed.searchParams.get('offset'));
      return Promise.resolve(jsonResponse(pages[offset]));
    });

    const seen: string[] = [];
    for await (const row of createQuickClient(cfg).iterateStockEntries({ pageSize: 1 })) {
      seen.push(row.guid);
    }
    expect(seen).toEqual(['s1', 's2']);
    expect(spy).toHaveBeenCalledTimes(2);
    const kall = spy.mock.calls[0];
    if (!kall) throw new Error('forventet fetch');
    expect((kall[1] as RequestInit).method).toBe('GET');
  });
});

describe('mapQuickItem / mapQuickStockEntry', () => {
  it('SKU fra itemCode, navn fra name eller itemName, kost i øre', () => {
    expect(
      mapQuickItem({
        guid: 'g1',
        itemCode: 'YAM-001',
        name: 'Tennplugg',
        costPrice: 149.5,
        unit: 'stk',
      }),
    ).toEqual({
      quickGuid: 'g1',
      sku: 'YAM-001',
      name: 'Tennplugg',
      unit: 'stk',
      costMinor: 14950,
      active: true,
      onHand: null,
    });
  });

  it('itemName og inStock som fallback', () => {
    const r = mapQuickItem({
      guid: 'g2',
      itemCode: 'FLT',
      itemName: 'Filter',
      inStock: 7,
      isInactive: true,
    });
    expect(r.name).toBe('Filter');
    expect(r.active).toBe(false);
    expect(r.onHand).toBe(7);
  });

  it('stockentry mapper itemGuid, lokasjon og antall', () => {
    expect(
      mapQuickStockEntry({
        guid: 'se1',
        itemGuid: 'g1',
        quantity: 4,
        stockLocationGuid: 'loc-1',
        stockLocationCode: 'A-01',
        stockLocationName: 'Hylle A',
      }),
    ).toEqual({
      quickGuid: 'se1',
      itemQuickGuid: 'g1',
      onHand: 4,
      locationQuickGuid: 'loc-1',
      locationCode: 'A-01',
      locationName: 'Hylle A',
    });
  });
});
