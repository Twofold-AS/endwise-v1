import { type Database, eq, schema } from '@endwise/db';

/**
 * F21 / white label F5 — passkey-port for platform.
 * Tabellen `passkey` ligger allerede i schema (dormant siden plugin ble
 * fjernet). En rad betyr at brukeren har bundet en nøkkel.
 */
export async function brukerHarPasskey(db: Database, userId: string): Promise<boolean> {
  const id = userId.trim();
  if (!id) return false;
  try {
    const [rad] = await db
      .select({ id: schema.passkey.id })
      .from(schema.passkey)
      .where(eq(schema.passkey.userId, id))
      .limit(1);
    return Boolean(rad);
  } catch {
    return false;
  }
}

/**
 * Platform-admin krever Endwise-rolle OG bundet passkey.
 * Uten nøkkel: nei (samme som ukjent — ingen enumerering i UI).
 */
export function kanBrukePlattform(input: {
  role: string | null | undefined;
  harPasskey: boolean;
}): boolean {
  if (input.role !== 'endwise_admin' && input.role !== 'endwise_support') return false;
  return input.harPasskey;
}
