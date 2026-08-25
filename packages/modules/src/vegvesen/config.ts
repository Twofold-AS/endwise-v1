import {
  type Database,
  decryptSecret,
  encryptSecret,
  envelopeCryptoConfigured,
  eq,
  schema,
  sql,
  withTenant,
} from '@endwise/db';

/** Integrasjonsnøkkelen for Vegvesen. Speiler modulnøkkelen (F0-16). */
export const VEGVESEN_PROVIDER = 'vegvesen';

/** Ikke-hemmelig visning. Selve nøkkelen forlater ALDRI serveren. */
export interface VegvesenConfigView {
  hasKey: boolean;
}

export class VegvesenConfigError extends Error {}

/**
 * F2-08 — Per-tenant Vegvesen-API-nøkkel (RLS-skopet).
 *
 * Samme tabell og envelope-crypto som Quick (`integration_config`).
 * `getView` returnerer KUN `hasKey`. `getDecrypted` er for lookup-klienten
 * og skal aldri sendes til nettleseren.
 */
export function createVegvesenConfigService(db: Database) {
  return {
    async getView(tenantId: string): Promise<VegvesenConfigView> {
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select({ tokenCipher: schema.integrationConfig.tokenCipher })
          .from(schema.integrationConfig)
          .where(eq(schema.integrationConfig.provider, VEGVESEN_PROVIDER));
        return { hasKey: Boolean(row?.tokenCipher) };
      });
    },

    /**
     * Dekryptert nøkkel til Autosys-klienten. Null hvis den mangler.
     * Aldri eksponer resultatet mot klienten. Aldri logg det.
     */
    async getDecrypted(tenantId: string): Promise<string | null> {
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select({ tokenCipher: schema.integrationConfig.tokenCipher })
          .from(schema.integrationConfig)
          .where(eq(schema.integrationConfig.provider, VEGVESEN_PROVIDER));
        if (!row?.tokenCipher) return null;
        return decryptSecret(row.tokenCipher);
      });
    },

    async set(tenantId: string, apiKey: string): Promise<void> {
      const trimmed = apiKey.trim();
      if (!trimmed) {
        throw new VegvesenConfigError('API-nøkkelen kan ikke være tom.');
      }
      if (!envelopeCryptoConfigured()) {
        throw new VegvesenConfigError(
          'ENDWISE_KEK mangler — kan ikke kryptere Vegvesen-nøkkelen. Sett nøkkelen først.',
        );
      }
      const tokenCipher = encryptSecret(trimmed);

      await withTenant(db, tenantId, async (tx) => {
        await tx
          .insert(schema.integrationConfig)
          .values({
            tenantId,
            provider: VEGVESEN_PROVIDER,
            tokenCipher,
          })
          .onConflictDoUpdate({
            target: [schema.integrationConfig.tenantId, schema.integrationConfig.provider],
            set: {
              tokenCipher,
              updatedAt: sql`now()`,
            },
          });
      });
    },
  };
}

export type VegvesenConfigService = ReturnType<typeof createVegvesenConfigService>;

/**
 * Nøkkel til oppslag: tenant-lagret først, deretter env (bakoverkompatibel).
 * Returnerer aldri en tom streng.
 */
export async function hentVegvesenApiNokkel(
  db: Database,
  tenantId: string,
): Promise<string | null> {
  const fraDb = await createVegvesenConfigService(db).getDecrypted(tenantId);
  if (fraDb) return fraDb;
  const fraEnv = process.env.VEGVESEN_API_KEY?.trim();
  return fraEnv ? fraEnv : null;
}
