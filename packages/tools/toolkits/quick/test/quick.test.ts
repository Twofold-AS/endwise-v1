import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQuickClient, mapQuickCustomer, QuickAuthError } from '../src/index.ts';

const cfg = { baseUrl: 'https://q3.quick.no/Test_Public', token: 'tkn' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

afterEach(() => vi.restoreAllMocks());

describe('mapQuickCustomer', () => {
  it('firmanavn vinner som navn; kontaktperson gir e-post/telefon', () => {
    const r = mapQuickCustomer({
      guid: 'g1',
      company: 'Bilverksted AS',
      contactPersons: [
        { firstName: 'Kari', lastName: 'Nordmann', email: 'kari@x.no', mobile: '999' },
      ],
    });
    expect(r).toEqual({
      quickGuid: 'g1',
      name: 'Bilverksted AS',
      email: 'kari@x.no',
      phone: '999',
    });
  });

  it('uten firma faller navn tilbake til kontaktperson', () => {
    const r = mapQuickCustomer({
      guid: 'g2',
      contactPersons: [{ name: 'Ola Hansen', phone: '123' }],
    });
    expect(r.name).toBe('Ola Hansen');
    expect(r.phone).toBe('123');
  });

  it('helt tom kunde får en trygg default', () => {
    expect(mapQuickCustomer({ guid: 'g3' }).name).toBe('Ukjent kunde');
  });
});

describe('customer/batch auth', () => {
  it('401 → QuickAuthError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}, 401));
    await expect(createQuickClient(cfg).clientInfo()).rejects.toBeInstanceOf(QuickAuthError);
  });

  it('token sendes som Authorization: Token token=<token>', async () => {
    const spy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({}));
    await createQuickClient(cfg).clientInfo();
    // Sjekk før dereferering. `spy.mock.calls[0]?.[1]` kan være undefined,
    // og et cast skjuler det bare til det smeller med «cannot read headers of
    // undefined» — en feilmelding som ikke sier at kallet aldri skjedde.
    const kall = spy.mock.calls[0];
    // `throw`, ikke `expect(...).toBeDefined`: en assertion smalner ikke
    // typen, så neste linje ville fortsatt vært et usikkert oppslag.
    if (!kall) throw new Error('fetch ble aldri kalt');
    const headers = (kall[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Token token=tkn');
    expect(headers['User-Agent']).toBe('curl/8.5.0');
    expect(spy.mock.calls[0]?.[0]).toBe('https://q3.quick.no/Test_Public/api/v2/client/info');
  });
});

describe('iterateCustomers paginering', () => {
  it('går side for side til offset >= totalCount', async () => {
    const pages: Record<number, unknown> = {
      0: { totalCount: 5, limit: 2, offset: 0, results: [{ guid: 'a' }, { guid: 'b' }] },
      2: { totalCount: 5, limit: 2, offset: 2, results: [{ guid: 'c' }, { guid: 'd' }] },
      4: { totalCount: 5, limit: 2, offset: 4, results: [{ guid: 'e' }] },
    };
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      const offset = Number(new URL(url as string).searchParams.get('offset'));
      return Promise.resolve(jsonResponse(pages[offset]));
    });

    const seen: string[] = [];
    for await (const c of createQuickClient(cfg).iterateCustomers({ pageSize: 2 })) {
      seen.push(c.guid);
    }
    expect(seen).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('tom første side stopper umiddelbart', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      jsonResponse({ totalCount: 0, limit: 100, offset: 0, results: [] }),
    );
    const seen: unknown[] = [];
    for await (const c of createQuickClient(cfg).iterateCustomers()) seen.push(c);
    expect(seen).toHaveLength(0);
  });
});
