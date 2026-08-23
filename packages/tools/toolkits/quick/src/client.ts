import type { IntegrationHealth, IntegrationProvider } from '@endwise/modules';
import { QuickAuthError, QuickError } from './errors.ts';
import { normalizeQuickBaseUrl, normalizeQuickToken } from './normalize.ts';
import { probeQuickReadOnly } from './probe.ts';
import {
  type QuickCustomer,
  type QuickCustomerBatch,
  type QuickCustomerRecord,
  quickCustomerBatch,
} from './schema.ts';
import { assertAllowedQuickUrl } from './url-guard.ts';

const API_PREFIX = '/api/v2';
/** Konservativ side-størrelse. Vi hamrer ALDRI Quick — moderat batch + delta-synk. */
const DEFAULT_PAGE_SIZE = 100;
/** CWE-400: HTTP-timeout per kall — en hengende Quick skal ikke blokkere oss. */
const DEFAULT_TIMEOUT_MS = 15_000;
/** CWE-770: tak på responsstørrelse (Content-Length) — hindrer OOM fra fiendtlig svar. */
const MAX_RESPONSE_BYTES = 25_000_000;
/** CWE-770: hardt tak på rader per synk + sider (uendelig/oppblåst Quick). */
const MAX_ROWS_PER_SYNC = 500_000;
const MAX_PAGES = 10_000;

export interface QuickConfig {
  /**
   * Per-instans baseUrl UTEN `/api/v2`, f.eks.
   *   prod:  https://q3.quick.no/ProdShared008
   *   test:  https://q3.quick.no/Test_Public
   */
  baseUrl: string;
  /**
   * Forhandlerens ApiV2-token. Sendes som `Authorization: Token token=<token>`.
   * Lages av admin i Quick3 (Client Configuration → Security → Access Token,
   * type ApiV2). PER forhandler. Krever «Confirma API»-modulen.
   */
  token: string;
  /** HTTP-timeout per kall (ms). Default 15 s. */
  timeoutMs?: number;
}

export interface CustomerBatchParams {
  limit?: number;
  offset?: number;
  /**
   * Delta-synk: kun kunder endret ETTER dette tidspunktet. Formatet er ikke
   * fullt bekreftet mot en ekte respons — vi sender ISO-8601 (UTC). Verifiser
   * mot Test_Public. Utelates ved full første synk.
   */
  changedAfterDate?: string;
  customerTypeGuid?: string;
  /** Utvidelser (f.eks. contactPersons). Kommaseparert i query. */
  expansions?: string[];
}

/**
 * F8-01 — Quick3 Web API-klient (v2, BETA).
 *
 * QuickLite-tanken: vi speiler Quick-data lokalt så verkstedet jobber i Endwise
 * (mobil-først), og dytter endringer TILBAKE til Quick. Denne klienten dekker
 * PULL-siden for kunder + tilkoblingstest. Booking/delelager/salg (pull OG push)
 * er TODO til vi har en ApiV2-token og kan lese den token-gatede swaggeren.
 */
export function createQuickClient(config: QuickConfig) {
  // CWE-918: valider baseUrl mot SSRF-vernet ALLEREDE her (før noe kall) — kaster
  // QuickSsrfError hvis den peker et ulovlig sted. Normaliserer samtidig.
  const validated = assertAllowedQuickUrl(normalizeQuickBaseUrl(config.baseUrl));
  const token = normalizeQuickToken(config.token);
  const base = `${validated.origin}${validated.pathname}`.replace(/\/+$/, '');
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  async function request<T>(path: string, schema: { parse: (v: unknown) => T }): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${base}${API_PREFIX}${path}`, {
        method: 'GET',
        headers: {
          Authorization: `Token token=${token}`,
          Accept: 'application/json',
        },
        // CWE-918: ikke følg 3xx til en ny host (redirect-SSRF-bypass).
        redirect: 'error',
        // CWE-400: hard timeout — en hengende Quick skal ikke blokkere oss.
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (cause) {
      // CWE-209/532: ALDRI reflekter rå cause (kan bære intern host/IP) til klient.
      const timedOut = (cause as Error)?.name === 'TimeoutError';
      throw new QuickError(timedOut ? 'Tidsavbrudd mot Quick' : 'Nådde ikke Quick');
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
      return schema.parse(json);
    } catch {
      throw new QuickError('Uventet svarformat fra Quick');
    }
  }

  return {
    /**
     * `client/info` — GET-only tilkoblingstest (F1-07-proben). Et 200 beviser
     * at baseUrl + token virker. Kaster QuickAuthError ved 401/403.
     */
    async clientInfo() {
      await probeQuickReadOnly({
        baseUrl: config.baseUrl,
        token: config.token,
        timeoutMs,
      });
      return {};
    },

    /** Én side kunder fra `customer/batch`. */
    async customerBatch(params: CustomerBatchParams = {}): Promise<QuickCustomerBatch> {
      const q = new URLSearchParams();
      q.set('limit', String(params.limit ?? DEFAULT_PAGE_SIZE));
      q.set('offset', String(params.offset ?? 0));
      if (params.changedAfterDate) q.set('changedAfterDate', params.changedAfterDate);
      if (params.customerTypeGuid) q.set('customerTypeGuid', params.customerTypeGuid);
      if (params.expansions?.length) q.set('expansions', params.expansions.join(','));
      return request(`/customer/batch?${q}`, quickCustomerBatch);
    },

    /**
     * Inkrementell, paginert henting: går side for side (offset += limit) til
     * `offset >= totalCount`. Yielder én kunde av gangen. `changedAfterDate`
     * gjør den til en delta-synk.
     *
     * CWE-770: harde tak (`MAX_PAGES`, `MAX_ROWS_PER_SYNC`) hindrer at en
     * uendelig/fiendtlig `totalCount` eller en Quick som aldri paginerer ferdig
     * kan henge eller tømme minnet vårt.
     */
    async *iterateCustomers(
      params: Omit<CustomerBatchParams, 'offset'> & { pageSize?: number } = {},
    ): AsyncGenerator<QuickCustomer> {
      const limit = params.pageSize ?? params.limit ?? DEFAULT_PAGE_SIZE;
      let offset = 0;
      let yielded = 0;
      for (let page = 0; page < MAX_PAGES; page++) {
        const batch = await this.customerBatch({
          limit,
          offset,
          changedAfterDate: params.changedAfterDate,
          customerTypeGuid: params.customerTypeGuid,
          expansions: params.expansions,
        });
        for (const c of batch.results) {
          if (yielded >= MAX_ROWS_PER_SYNC) {
            throw new QuickError('Quick returnerte flere rader enn taket tillater');
          }
          yielded += 1;
          yield c;
        }

        offset += batch.results.length || limit;
        if (batch.results.length === 0 || offset >= batch.totalCount) break;
      }
    },
  };
}

export type QuickClient = ReturnType<typeof createQuickClient>;

/**
 * Mapper en rå Quick-kunde til det flate speilet Endwise lagrer.
 *
 * ⚠️ USIKKER feltutledning: kun `guid`, `company`, `contactPersons` er bekreftet.
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
  return { quickGuid: raw.guid, name, email: email || null, phone: phone || null };
}

/**
 * F0-06 — IntegrationProvider for Quick. `validate()` gjør et ekte `client/info`-
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
