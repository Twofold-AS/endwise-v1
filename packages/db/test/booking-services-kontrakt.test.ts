import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F3-09 / P3 — `booking_services` har RLS + inspect, backfill, ingen billing.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0027 booking_services-kontrakt', () => {
  const sql = les('../drizzle/0027_booking_services.sql');
  const schema = les('../src/schema/bookings.ts');
  const journal = les('../drizzle/meta/_journal.json');

  it('journal har 0027_booking_services', () => {
    expect(journal).toMatch(/0027_booking_services/);
  });

  it('tabellen har tenant-isolasjon og inspect-SELECT', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/booking_services_tenant_isolation/);
    expect(sql).toMatch(/booking_services_platform_inspect_read/);
    expect(sql).toMatch(/app\.tenant_id/);
    expect(sql).toMatch(/app\.platform_inspect/);
    expect(schema).toMatch(/tenantPolicy\('booking_services'/);
    expect(schema).toMatch(/inspectSelectPolicy\('booking_services'/);
  });

  it('backfiller eksisterende jobber 1:1 og rører ikke billing', () => {
    expect(sql).toMatch(/INSERT INTO "booking_services"/);
    expect(sql).toMatch(/service_version_id/);
    expect(sql).not.toMatch(/4490|8490|12490|stripe/i);
  });
});
