import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0064 passnøkkel-skjema + TOTP-rydd', () => {
  const sql = les('../drizzle/0064_passnokkel_totp_rydd.sql');
  const journal = les('../drizzle/meta/_journal.json');
  const schema = les('../src/schema/auth.ts');
  const workflow = les('../../../.github/workflows/migrate-prod.yml');

  it('journal har 0064 etter 0063', () => {
    expect(journal).toMatch(/0064_passnokkel_totp_rydd/);
    expect(journal.indexOf('0063_oppstart_branding_kunde')).toBeLessThan(
      journal.indexOf('0064_passnokkel_totp_rydd'),
    );
  });

  it('oppretter passkey-tabellen idempotent med Better Auth-kolonner', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "passkey"/);
    expect(sql).toMatch(/"credential_id"/);
    expect(sql).toMatch(/"public_key"/);
    expect(sql).toMatch(/"aaguid"/);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS "aaguid"/);
    expect(sql).toMatch(/passkey_userId_idx/);
    expect(sql).toMatch(/passkey_credentialID_idx/);
    expect(sql).toMatch(/passkey_user_id_user_id_fk/);
    expect(schema).toMatch(/export const passkey = pgTable/);
    expect(schema).toMatch(/credentialID: text\('credential_id'\)/);
    expect(schema).toMatch(/aaguid: text\('aaguid'\)/);
  });

  it('sikrer session.kontekst og Bedrift-vindu på nytt', () => {
    expect(sql).toMatch(/ALTER TABLE "session" ADD COLUMN IF NOT EXISTS "kontekst"/);
    expect(sql).toMatch(/bedrift_verifisert_at/);
    expect(sql).toMatch(/bedrift_utloper_at/);
    expect(sql).toMatch(/session_kontekst_chk/);
  });

  it('tømmer leftover TOTP slik at gamle brukere ikke blokkeres', () => {
    expect(sql).toMatch(/DELETE FROM "two_factor"/);
    expect(sql).toMatch(/SET two_factor_enabled = false/);
  });

  it('db:setup mot Scaleway kjører automatisk på main', () => {
    expect(workflow).toMatch(/name: db:setup mot Scaleway/);
    expect(workflow).toMatch(/pnpm db:setup/);
    expect(workflow).toMatch(/branches: \[main\]/);
    const web = les('../../../apps/web/package.json');
    expect(web).toMatch(/vercel-migrate\.ts/);
  });
});
