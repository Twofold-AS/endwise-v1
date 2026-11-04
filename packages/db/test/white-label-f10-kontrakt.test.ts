import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0054 white-label F10-kontrakt', () => {
  const sql = les('../drizzle/0054_white_label_f10.sql');
  const journal = les('../drizzle/meta/_journal.json');
  const functions = les('../sql/functions.sql');
  const rls = les('../src/rls.ts');
  const client = les('../src/client.ts');

  it('journal har 0054 etter 0053', () => {
    expect(journal).toMatch(/0053_white_label_f8c/);
    expect(journal).toMatch(/0054_white_label_f10/);
  });

  it('kunde-RLS er RESTRICTIVE og withCustomer setter actor', () => {
    expect(sql).toMatch(/AS RESTRICTIVE/);
    expect(sql).toMatch(/CREATE POLICY "bookings_customer_own" ON "bookings"/);
    expect(sql).toMatch(/bookings_customer_own/);
    expect(sql).toMatch(/vehicles_customer_own/);
    expect(sql).toMatch(/customers_customer_own/);
    expect(rls).toMatch(/customerRestrictivePolicy/);
    expect(client).toMatch(/export async function withCustomer/);
    expect(client).toMatch(/APP_ACTOR_SETTING/);
  });

  it('lookup krever onboarding før publisert', () => {
    expect(sql).toMatch(/lookup_tenant_by_host_rev=0054/);
    expect(sql).toMatch(/onboarding_completed_at IS NOT NULL/);
    expect(functions).toMatch(/lookup_tenant_by_host_rev=0061/);
    expect(functions).not.toMatch(/lookup_tenant_by_host_rev=0054/);
    expect(functions).not.toMatch(/lookup_tenant_by_host_rev=0048/);
  });
});
