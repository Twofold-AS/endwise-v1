import type { IntegrationHealth, IntegrationProvider } from '@endwise/modules';
import { nextBatchOffset } from './batch.ts';
import { QuickAuthError, QuickError } from './errors.ts';
import { QUICK_CURL_USER_AGENT, quickFetch } from './https-proxy.ts';
import {
  normalizeQuickBaseUrl,
  normalizeQuickToken,
  stripTrailingApiV2,
  stripTrailingSlashes,
} from './normalize.ts';
import { probeQuickReadOnly } from './probe.ts';
import {
  foldQuickJsonKeys,
  parseQuickCustomerBatch,
  parseQuickItemBatch,
  parseQuickStockEntryBatch,
  type QuickClientInfo,
  type QuickCustomer,
  type QuickCustomerBatch,
  type QuickCustomerRecord,
  type QuickItem,
  type QuickItemBatch,
  type QuickItemRecord,
  type QuickStockEntry,
  type QuickStockEntryBatch,
  type QuickStockRecord,
} from './schema.ts';
import { assertAllowedQuickUrl } from './url-guard.ts';

const API_PREFIX = '/api/v2';
/** Konservativ side-størrelse. Vi hamrer aldri Quick — moderat batch + delta-synk. */
const DEFAULT_PAGE_SIZE = 100;
/** CWE-400: HTTP-timeout per kall — en hengende Quick skal ikke blokkere oss. */
const DEFAULT_TIMEOUT_MS = 15_000;
/** CWE-770: tak på responsstørrelse (Content-Length) — hindrer oom fra fiendtlig svar. */
const MAX_RESPONSE_BYTES = 25_000_000;
/** CWE-770: hardt tak på rader per synk + sider (uendelig/oppblåst Quick). */
const MAX_ROWS_PER_SYNC = 500_000;
const MAX_PAGES = 10_000;

export interface QuickConfig {
  /**
   * Per-instans baseUrl uten `/api/v2`, f.eks.
   * prod: https://q3.quick.no/ProdShared008
   * test: https://q3.quick.no/Test_Public
   */
  baseUrl: string;
  /**
   * Forhandlerens ApiV2-token. Sendes som `Authorization: Token token=<token>`.
   * Lages av admin i Quick3 (Client Configuration → Security → Access Token,
   * type ApiV2). Per forhandler. Krever «Confirma API»-modulen.
   */
  token: string;
  /** HTTP-timeout per kall (ms). Default 15 s. */
  timeoutMs?: number;
}

export interface CustomerBatchParams {
  limit?: number;
  offset?: number;
  /**
   * Delta-synk: kun kunder endret etter dette tidspunktet. Formatet er ikke
   * fullt bekreftet mot en ekte respons — vi sender ISO-8601 (UTC). Verifiser
   * mot Test_Public. Utelates ved full første synk.
   */
  changedAfterDate?: string;
  customerTypeGuid?: string;
  /** Utvidelser (f.eks. contactPersons). Kommaseparert i query. */
  expansions?: string[];
}

/**
 * Quick3 Web API-klient (v2, beta).
 * QuickLite-tanken: vi speiler Quick-data lokalt så verkstedet jobber i Endwise
 * (mobil-først), og dytter endringer tilbake til Quick. Denne klienten dekker
 * Pull-siden for kunder, deler (item/batch) og beholdning (stockentry/batch).
 * GET-only. Booking/salg + push er TODO.
 */
export function createQuickClient(config: QuickConfig) {
  // CWE-918: valider baseUrl mot ssrf-vernet allerede her (før noe kall) — kaster
  // QuickSsrfError hvis den peker et ulovlig sted. Normaliserer samtidig.
  const validated = assertAllowedQuickUrl(normalizeQuickBaseUrl(config.baseUrl));
  const token = normalizeQuickToken(config.token);
  const base = stripTrailingApiV2(stripTrailingSlashes(`${validated.origin}${validated.pathname}`));
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(
    path: string,
    schema: { parse: (v: unknown) => T },
    entityNb: 'kunder' | 'varer' | 'lager',
  ): Promise<T> {
    let response: Response;
    try {
      response = await quickFetch(`${base}${API_PREFIX}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Token token=${token}`,
          Accept: 'application/json',
          'User-Agent': QUICK_CURL_USER_AGENT,
        },
        // CWE-918: ikke følg 3xx til en ny host (redirect-ssrf-bypass).
        redirect: 'error',
        // CWE-400: hard timeout — en hengende Quick skal ikke blokkere oss.
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      // CWE-209/532: aldri reflekter rå cause (kan bære intern host/IP) til klient.
      const timedOut = (cause as Error)?.name === 'TimeoutError';
      throw new QuickError(
        timedOut ? `Tidsavbrudd mot Quick for ${entityNb}.` : `Nådde ikke Quick for ${entityNb}.`,
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new QuickAuthError('Quick avviste token (401/403)', response.status);
    }
    if (!response.ok) {
      throw new QuickError(`Quick svarte ${response.status}`, response.status);
    }

    // CWE-770: avvis absurd store svar før vi leser dem i minnet.
    const contentLength = Number(response.headers.get('content-length') ?? '0');
    if (contentLength > MAX_RESPONSE_BYTES) {
      throw new QuickError('Quick-svar for stort');
    }

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      throw new QuickError('Uventet svar fra Quick (ikke JSON)');
    }
    try {
      return schema.parse(foldQuickJsonKeys(json));
    } catch (error) {
      if (error instanceof QuickError) throw error;
      throw new QuickError(`Uventet svarformat fra Quick for ${entityNb}.`);
    }
  }

  async function* iteratePaged<T>(
    fetchPage: (offset: number) => Promise<{ totalCount: number; offset: number; results: T[] }>,
  ): AsyncGenerator<T> {
    let offset = 0;
    let yielded = 0;
    for (let page = 0; page < MAX_PAGES; page++) {
      const batch = await fetchPage(offset);
      for (const row of batch.results) {
        if (yielded >= MAX_ROWS_PER_SYNC) {
          throw new QuickError('Quick returnerte flere rader enn taket tillater');
        }
        yielded += 1;
        yield row;
      }
      const next = nextBatchOffset(batch);
      if (next === null) break;
      offset = next;
    }
  }

  return {
    /**
     * `client/info` — GET-only tilkoblingstest (F1-07-proben). Et 200 beviser
     * at baseUrl + token virker. Kaster QuickAuthError ved 401/403.
     */
    async clientInfo(): Promise<QuickClientInfo> {
      return probeQuickReadOnly({
        baseUrl: config.baseUrl,
        token: config.token,
        timeoutMs,
      });
    },

    /** Én side kunder fra `customer/batch`. */
    async customerBatch(params: CustomerBatchParams = {}): Promise<QuickCustomerBatch> {
      const q = new URLSearchParams();
      q.set('limit', String(params.limit ?? DEFAULT_PAGE_SIZE));
      q.set('offset', String(params.offset ?? 0));
      if (params.changedAfterDate) q.set('changedAfterDate', params.changedAfterDate);
      if (params.customerTypeGuid) q.set('customerTypeGuid', params.customerTypeGuid);
      if (params.expansions?.length) q.set('expansions', params.expansions.join(','));
      return request(`/customer/batch?${q}`, { parse: parseQuickCustomerBatch }, 'kunder');
    },

    /** Én side varer fra `item/batch` (GET-only). */
    async itemBatch(
      params: { limit?: number; offset?: number; changedAfterDate?: string } = {},
    ): Promise<QuickItemBatch> {
      const q = new URLSearchParams();
      q.set('limit', String(params.limit ?? DEFAULT_PAGE_SIZE));
      q.set('offset', String(params.offset ?? 0));
      if (params.changedAfterDate) q.set('changedAfterDate', params.changedAfterDate);
      return request(`/item/batch?${q}`, { parse: parseQuickItemBatch }, 'varer');
    },

    /** Én side lagerlinjer fra `stockentry/batch` (GET-only). */
    async stockEntryBatch(
      params: { limit?: number; offset?: number; changedAfterDate?: string } = {},
    ): Promise<QuickStockEntryBatch> {
      const q = new URLSearchParams();
      q.set('limit', String(params.limit ?? DEFAULT_PAGE_SIZE));
      q.set('offset', String(params.offset ?? 0));
      if (params.changedAfterDate) q.set('changedAfterDate', params.changedAfterDate);
      return request(`/stockentry/batch?${q}`, { parse: parseQuickStockEntryBatch }, 'lager');
    },

    /**
     * Inkrementell, paginert henting: går side for side
     * (`offset += results.length`) til `offset >= totalCount`.
     * CWE-770: harde tak (`MAX_PAGES`, `MAX_ROWS_PER_SYNC`) hindrer at en
     * uendelig/fiendtlig `totalCount` eller en Quick som aldri paginerer ferdig
     * kan henge eller tømme minnet vårt.
     */
    async *iterateCustomers(
      params: Omit<CustomerBatchParams, 'offset'> & { pageSize?: number } = {},
    ): AsyncGenerator<QuickCustomer> {
      const limit = params.pageSize ?? params.limit ?? DEFAULT_PAGE_SIZE;
      yield* iteratePaged((offset) =>
        this.customerBatch({
          limit,
          offset,
          changedAfterDate: params.changedAfterDate,
          customerTypeGuid: params.customerTypeGuid,
          expansions: params.expansions,
        }),
      );
    },

    async *iterateItems(
      params: { pageSize?: number; changedAfterDate?: string } = {},
    ): AsyncGenerator<QuickItem> {
      const limit = params.pageSize ?? DEFAULT_PAGE_SIZE;
      yield* iteratePaged((offset) =>
        this.itemBatch({ limit, offset, changedAfterDate: params.changedAfterDate }),
      );
    },

    async *iterateStockEntries(
      params: { pageSize?: number; changedAfterDate?: string } = {},
    ): AsyncGenerator<QuickStockEntry> {
      const limit = params.pageSize ?? DEFAULT_PAGE_SIZE;
      yield* iteratePaged((offset) =>
        this.stockEntryBatch({ limit, offset, changedAfterDate: params.changedAfterDate }),
      );
    },
  };
}

export type QuickClient = ReturnType<typeof createQuickClient>;

export interface QuickDealerProfile {
  name: string | null;
  orgnr: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  leftover: Record<string, unknown>;
  mappedKeys: readonly string[];
}

function nonemptyQuickString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstPresent(
  raw: Record<string, unknown>,
  keys: readonly string[],
): { value: string; key: string } | null {
  for (const key of keys) {
    const value = nonemptyQuickString(raw[key]);
    if (value) return { value, key };
  }
  return null;
}

/**
 * Mapper `client/info` til forhandler-felt.
 * Bekreftet: name / company → firmanavn.
 * Øvrige kolonner bare når nøkkelen finnes etter fold. Tom verdi skriver ikke.
 * slug mappes aldri. leftover = nøkler uten kolonne.
 */
export function mapQuickClientInfo(raw: QuickClientInfo): QuickDealerProfile {
  const rec = raw as Record<string, unknown>;
  const mappedKeys: string[] = [];
  const consumed = new Set<string>();

  const fromName = firstPresent(rec, ['name']);
  const fromCompany = fromName ? null : firstPresent(rec, ['company']);
  const nameHit = fromName ?? fromCompany;
  if (nameHit) {
    mappedKeys.push(nameHit.key);
    consumed.add(nameHit.key);
  }

  const orgnr = firstPresent(rec, ['organizationNumber', 'orgNo']);
  if (orgnr) {
    mappedKeys.push(orgnr.key);
    consumed.add(orgnr.key);
  }
  const address = firstPresent(rec, ['address']);
  if (address) {
    mappedKeys.push(address.key);
    consumed.add(address.key);
  }
  const postalCode = firstPresent(rec, ['zipCode', 'postalCode']);
  if (postalCode) {
    mappedKeys.push(postalCode.key);
    consumed.add(postalCode.key);
  }
  const city = firstPresent(rec, ['city']);
  if (city) {
    mappedKeys.push(city.key);
    consumed.add(city.key);
  }
  const phone = firstPresent(rec, ['phone']);
  if (phone) {
    mappedKeys.push(phone.key);
    consumed.add(phone.key);
  }
  const email = firstPresent(rec, ['email']);
  if (email) {
    mappedKeys.push(email.key);
    consumed.add(email.key);
  }
  const website = firstPresent(rec, ['website', 'homepage']);
  if (website) {
    mappedKeys.push(website.key);
    consumed.add(website.key);
  }

  const leftover: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(rec)) {
    if (consumed.has(key)) continue;
    if (value === undefined || value === null) continue;
    if (typeof value === 'string' && value.trim() === '') continue;
    leftover[key] = value;
  }

  return {
    name: nameHit?.value ?? null,
    orgnr: orgnr?.value ?? null,
    address: address?.value ?? null,
    postalCode: postalCode?.value ?? null,
    city: city?.value ?? null,
    phone: phone?.value ?? null,
    email: email?.value ?? null,
    website: website?.value ?? null,
    leftover,
    mappedKeys,
  };
}

/**
 * Mapper en rå Quick-kunde til det flate speilet Endwise lagrer.
 * Usikker feltutledning: kun `guid`, `company`, `contactPersons` er bekreftet.
 * Navn/e-post/telefon-utledningen prøver flere sannsynlige feltnavn. Verifiser
 * mot en ekte respons (Test_Public) og stram inn deretter.
 */
export function mapQuickCustomer(raw: QuickCustomer): QuickCustomerRecord {
  const contact = raw.contactPersons?.[0];
  const contactName = contact
    ? (contact.name ?? [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim())
    : '';
  const name = (raw.company?.trim() || contactName || 'Ukjent kunde').trim();
  const email = raw.email ?? contact?.email ?? null;
  const phone = raw.phone ?? contact?.mobile ?? contact?.phone ?? null;
  return {
    quickGuid: raw.guid,
    name,
    email: email || null,
    phone: phone || null,
  };
}

function nokToMinor(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.round(n * 100);
}

function nonNegInt(n: number | null | undefined): number | null {
  if (n == null || !Number.isFinite(n)) return null;
  return Math.max(0, Math.round(n));
}

/** Mapper en Quick-vare til lager-raden (parts). */
export function mapQuickItem(raw: QuickItem): QuickItemRecord {
  const sku = (raw.itemCode ?? raw.code ?? raw.number ?? raw.guid).trim() || raw.guid;
  const name = ((raw.name ?? raw.itemName ?? sku) || 'Ukjent del').trim();
  const unit = ((raw.unit ?? raw.unitCode) || 'stk').trim() || 'stk';
  const inactive =
    raw.isInactive === true ||
    raw.inactive === true ||
    raw.discontinued === true ||
    raw.active === false;
  return {
    quickGuid: raw.guid,
    sku,
    name,
    unit,
    costMinor: nokToMinor(raw.costPrice ?? raw.cost),
    active: !inactive,
    onHand: nonNegInt(raw.inStock ?? raw.stock),
  };
}

/** Mapper en Quick-lagerlinje til stock_levels (+ lokasjon). */
export function mapQuickStockEntry(raw: QuickStockEntry): QuickStockRecord {
  const itemQuickGuid = (raw.itemGuid ?? raw.item?.guid ?? '').trim();
  const locationCode =
    (raw.stockLocationCode ?? raw.warehouseCode ?? raw.locationCode)?.trim() || 'QUICK';
  const locationName =
    (raw.stockLocationName ?? raw.warehouseName ?? raw.locationName)?.trim() || locationCode;
  const locationQuickGuid = raw.stockLocationGuid ?? raw.warehouseGuid ?? raw.locationGuid ?? null;
  return {
    quickGuid: raw.guid,
    itemQuickGuid,
    onHand: nonNegInt(raw.quantity ?? raw.inStock ?? raw.stock ?? raw.amount) ?? 0,
    locationQuickGuid: locationQuickGuid || null,
    locationCode,
    locationName,
  };
}

/**
 * IntegrationProvider for Quick. `validate` gjør et ekte `client/info`-
 * kall: en token/baseUrl som ikke virker skal avvises ved onboarding, ikke
 * første gang en synk kjøres.
 */
export function quickProvider(
  configFor: (tenantId: string) => QuickConfig,
): IntegrationProvider<QuickConfig> {
  async function probe(config: QuickConfig): Promise<IntegrationHealth> {
    const checkedAt = new Date().toISOString();
    try {
      await createQuickClient(config).clientInfo();
      return { ok: true, checkedAt };
    } catch (error) {
      return { ok: false, checkedAt, detail: (error as Error).message };
    }
  }

  return {
    id: 'quick',
    validate: (_tenantId, config) => probe(config),
    health: (tenantId) => probe(configFor(tenantId)),
  };
}
