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

/** Integrasjonsnøkkelen for Quick. Speiler modulnøkkelen (F0-04) og toolkitets provider-id. */
export const QUICK_PROVIDER = 'quick';

/** Ikke-hemmelig visning av Quick-konfigen (trygg å sende til klienten). */
export interface QuickConfigView {
  baseUrl: string | null;
  /** Om en token er lagret. Selve tokenet forlater aldri serveren. */
  hasToken: boolean;
  lastSyncedAt: Date | null;
  lastSyncStatus: string | null;
  lastSyncDetail: string | null;
}

/** Dekryptert konfig til å bygge en Quick-klient. Kun for intern server-bruk. */
export interface QuickDecryptedConfig {
  baseUrl: string;
  token: string;
}

export class QuickConfigError extends Error {}

/**
 * F8-01 / F1-07 — Per-tenant Quick-konfig (RLS-skopet). Tokenet lagres envelope-
 * kryptert (aes-256-gcm, @endwise/db/crypto). Alt går via `withTenant` → RLS, så
 * forhandler A kan verken lese eller skrive forhandler B — uansett input.
 * Rollestyring (kun dealer_admin/endwise_admin skriver) håndheves i API-laget
 * (adminProcedure); RLS kjenner ikke roller.
 */
export function createQuickConfigService(db: Database) {
  return {
    /** Ikke-hemmelig visning. `hasToken` uten å avsløre tokenet. */
    async getView(tenantId: string): Promise<QuickConfigView> {
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select()
          .from(schema.integrationConfig)
          .where(eq(schema.integrationConfig.provider, QUICK_PROVIDER));
        return {
          baseUrl: row?.baseUrl ?? null,
          hasToken: Boolean(row?.tokenCipher),
          lastSyncedAt: row?.lastSyncedAt ?? null,
          lastSyncStatus: row?.lastSyncStatus ?? null,
          lastSyncDetail: row?.lastSyncDetail ?? null,
        };
      });
    },

    /**
     * Dekryptert konfig til klientbygging. Returnerer null hvis baseUrl eller
     * token mangler. Aldri eksponer resultatet mot klienten.
     */
    async getDecrypted(tenantId: string): Promise<QuickDecryptedConfig | null> {
      return withTenant(db, tenantId, async (tx) => {
        const [row] = await tx
          .select()
          .from(schema.integrationConfig)
          .where(eq(schema.integrationConfig.provider, QUICK_PROVIDER));
        if (!row?.baseUrl || !row.tokenCipher) return null;
        return { baseUrl: row.baseUrl, token: decryptSecret(row.tokenCipher) };
      });
    },

    /**
     * Lagre/oppdater konfig. `token` er valgfri: utelates den, beholdes eksisterende
     * (så forhandleren kan endre baseUrl uten å skrive inn tokenet på nytt).
     * Krypterer tokenet før lagring.
     */
    async set(tenantId: string, input: { baseUrl: string; token?: string }): Promise<void> {
      if (input.token !== undefined && !envelopeCryptoConfigured()) {
        throw new QuickConfigError(
          'ENDWISE_KEK mangler — kan ikke kryptere Quick-token. Sett nøkkelen først.',
        );
      }
      const tokenCipher = input.token !== undefined ? encryptSecret(input.token) : undefined;

      await withTenant(db, tenantId, async (tx) => {
        await tx
          .insert(schema.integrationConfig)
          .values({
            tenantId,
            provider: QUICK_PROVIDER,
            baseUrl: input.baseUrl,
            ...(tokenCipher !== undefined ? { tokenCipher } : {}),
          })
          .onConflictDoUpdate({
            target: [schema.integrationConfig.tenantId, schema.integrationConfig.provider],
            set: {
              baseUrl: input.baseUrl,
              ...(tokenCipher !== undefined ? { tokenCipher } : {}),
              updatedAt: sql`now()`,
            },
          });
      });
    },

    /** Skriv utfallet av en synk/test (status + detalj, ev. sett lastSyncedAt). */
    async recordSync(
      tenantId: string,
      result: { status: 'ok' | 'error' | 'partial'; detail?: string; syncedAt?: Date | null },
    ): Promise<void> {
      await withTenant(db, tenantId, async (tx) => {
        await tx
          .insert(schema.integrationConfig)
          .values({
            tenantId,
            provider: QUICK_PROVIDER,
            lastSyncStatus: result.status,
            lastSyncDetail: result.detail ?? null,
            ...(result.syncedAt !== undefined ? { lastSyncedAt: result.syncedAt } : {}),
          })
          .onConflictDoUpdate({
            target: [schema.integrationConfig.tenantId, schema.integrationConfig.provider],
            set: {
              lastSyncStatus: result.status,
              lastSyncDetail: result.detail ?? null,
              ...(result.syncedAt !== undefined ? { lastSyncedAt: result.syncedAt } : {}),
              updatedAt: sql`now()`,
            },
          });
      });
    },
  };
}

export type QuickConfigService = ReturnType<typeof createQuickConfigService>;
