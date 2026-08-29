import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * 0032 — engangs backfill av mechanics-rad for ansatte med
 * job_function=mekaniker som mangler rad. Alle tenants, ingen hardkodet
 * forhandler. Idempotent via NOT EXISTS.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0032 mekaniker-rad-backfill-kontrakt', () => {
  const sql = les('../drizzle/0032_mekaniker_rad_backfill.sql');
  const journal = les('../drizzle/meta/_journal.json');

  it('journal har 0032 etter 0031', () => {
    expect(journal).toMatch(/0031_dealer_profile_grant/);
    expect(journal).toMatch(/0032_mekaniker_rad_backfill/);
  });

  it('inserter kun når job_function er mekaniker og rad mangler', () => {
    expect(sql).toMatch(/INSERT INTO "mechanics"/i);
    expect(sql).toMatch(/"?job_function"?\s*=\s*'mekaniker'/);
    expect(sql).toMatch(/NOT EXISTS/i);
    expect(sql).toMatch(/user_id/);
    expect(sql).toMatch(/tenant_id/);
  });

  it('er tenant-skopet per rad, uten hardkodet forhandler', () => {
    expect(sql).not.toMatch(/mikael-moto/i);
    expect(sql).not.toMatch(/@/);
    expect(sql).toMatch(/member_profiles/);
    expect(sql).toMatch(/"user"/);
  });
});
