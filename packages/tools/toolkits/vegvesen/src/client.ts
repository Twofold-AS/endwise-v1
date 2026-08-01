import type { IntegrationHealth, IntegrationProvider } from '@endwise/modules';
import { kjoretoydataResponse, type VehicleLookup } from './schema.ts';

const BASE_URL = 'https://akfell-datautlevering.atlas.vegvesen.no';
const ENDPOINT = '/enkeltoppslag/kjoretoydata';

export class VegvesenError extends Error {
  // Eksplisitt felt (ikke TS parameter property) — Node strip-only-trygt.
  readonly status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.status = status;
  }
}

/** Kvoten er 50 000 kall per API-nøkkel per døgn. 429/422 = vi har brukt opp dagens. */
export class VegvesenQuotaError extends VegvesenError {}

export interface VegvesenConfig {
  /** Sendes som `SVV-Authorization: Apikey <key>`. */
  apiKey: string;
  baseUrl?: string;
}

/**
 * F2-08 — Kjøretøyoppslag mot Statens vegvesen (Autosys «Enkeltoppslag»).
 *
 * GDPR-merknad som IKKE er valgfri: kjennemerke og understellsnummer er
 * personopplysninger etter norsk rett. Oppslag krever behandlingsgrunnlag —
 * her: booking-forespørselen fra kunden selv. Vi logger derfor aldri regnr
 * i klartekst utenfor tenant-skopet, og speiler kun det verkstedet trenger.
 */
export function createVegvesenClient(config: VegvesenConfig) {
  const baseUrl = config.baseUrl ?? BASE_URL;

  async function request(params: URLSearchParams): Promise<VehicleLookup | null> {
    const response = await fetch(`${baseUrl}${ENDPOINT}?${params}`, {
      headers: {
        'SVV-Authorization': `Apikey ${config.apiKey}`,
        Accept: 'application/json',
      },
    });

    if (response.status === 422 || response.status === 429) {
      throw new VegvesenQuotaError('Vegvesen-kvoten er brukt opp for i dag', response.status);
    }
    if (!response.ok) {
      throw new VegvesenError(`Vegvesen svarte ${response.status}`, response.status);
    }

    const parsed = kjoretoydataResponse.safeParse(await response.json());
    if (!parsed.success) {
      throw new VegvesenError('Uventet svarformat fra Vegvesen');
    }
    if (parsed.data.feilmelding) {
      throw new VegvesenError(parsed.data.feilmelding);
    }

    const first = parsed.data.kjoretoydataListe?.[0];
    if (!first) return null;

    const generelt = first.godkjenning?.tekniskGodkjenning?.tekniskeData?.generelt;
    const firstReg = first.forstegangsregistrering?.registrertForstegangNorgeDato ?? null;

    return {
      regNumber: first.kjoretoyId?.kjennemerke ?? null,
      vin: first.kjoretoyId?.understellsnummer ?? null,
      make: generelt?.merke?.[0]?.merke ?? null,
      model: generelt?.handelsbetegnelse?.[0] ?? null,
      // API-et har ingen «årsmodell» — første registrering i Norge er nærmeste sannhet.
      modelYear: firstReg ? firstReg.slice(0, 4) : null,
      inspectionDue: first.periodiskKjoretoyKontroll?.kontrollfrist ?? null,
      lastInspection: first.periodiskKjoretoyKontroll?.sistGodkjent ?? null,
    };
  }

  return {
    /** Regnr → merke/modell/årsmodell/EU-frist. `null` = ikke funnet. */
    async lookupByRegNumber(regNumber: string): Promise<VehicleLookup | null> {
      const normalized = regNumber.replace(/\s+/g, '').toUpperCase();
      return request(new URLSearchParams({ kjennemerke: normalized }));
    },

    async lookupByVin(vin: string): Promise<VehicleLookup | null> {
      return request(new URLSearchParams({ understellsnummer: vin.toUpperCase() }));
    },
  };
}

export type VegvesenClient = ReturnType<typeof createVegvesenClient>;

/**
 * F0-06 — IntegrationProvider-implementasjonen.
 * `validate()` gjør et ekte oppslag: en API-nøkkel som ikke virker skal avvises
 * ved onboarding, ikke første gang en kunde prøver å booke.
 */
export function vegvesenProvider(
  configFor: (tenantId: string) => VegvesenConfig,
): IntegrationProvider<VegvesenConfig> {
  async function probe(config: VegvesenConfig): Promise<IntegrationHealth> {
    const checkedAt = new Date().toISOString();
    try {
      // Et syntaktisk gyldig, men ikke-eksisterende kjennemerke: 200 + tom liste
      // betyr «nøkkelen virker». 401/403 betyr at den ikke gjør det.
      await createVegvesenClient(config).lookupByRegNumber('XX00000');
      return { ok: true, checkedAt };
    } catch (error) {
      if (error instanceof VegvesenQuotaError) {
        return { ok: true, checkedAt, detail: 'Kvote brukt opp, men nøkkelen er gyldig' };
      }
      return { ok: false, checkedAt, detail: (error as Error).message };
    }
  }

  return {
    id: 'vegvesen',
    validate: (_tenantId, config) => probe(config),
    health: (tenantId) => probe(configFor(tenantId)),
  };
}
