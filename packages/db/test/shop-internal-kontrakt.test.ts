import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Intern testbutikk. Ikke Medusa. Egne tabeller + lager.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('0029 shop_internal-kontrakt', () => {
  const sql = les('../drizzle/0029_shop_internal.sql');
  const schema = les('../src/schema/shop.ts');
  const inventory = les('../src/schema/inventory.ts');
  const journal = les('../drizzle/meta/_journal.json');
  const functions = les('../sql/functions.sql');

  it('journal har 0029_shop_internal etter 0028', () => {
    expect(journal).toMatch(/0028_booking_services/);
    expect(journal).toMatch(/0029_shop_internal/);
  });

  it('selgerpris sitter på parts, ikke en annen katalog', () => {
    expect(sql).toMatch(/ALTER TABLE "parts" ADD COLUMN IF NOT EXISTS "sell_price_minor"/);
    expect(inventory).toMatch(/sellPriceMinor: integer\('sell_price_minor'\)/);
    expect(sql).not.toMatch(/medusa/i);
    expect(schema).not.toMatch(/medusa/i);
  });

  it('shop_orders og linjer har tenant-isolasjon, inspect-SELECT og FORCE-klart RLS', () => {
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/shop_orders_tenant_isolation/);
    expect(sql).toMatch(/shop_order_lines_tenant_isolation/);
    expect(sql).toMatch(/shop_orders_platform_inspect_read/);
    expect(sql).toMatch(/shop_order_lines_platform_inspect_read/);
    expect(schema).toMatch(/tenantPolicy\('shop_orders'/);
    expect(schema).toMatch(/inspectSelectPolicy\('shop_orders'/);
    expect(schema).toMatch(/tenantPolicy\('shop_order_lines'/);
    expect(schema).toMatch(/inspectSelectPolicy\('shop_order_lines'/);
  });

  it('flagget shop insertes global AV og rører ikke billing-priser', () => {
    expect(sql).toMatch(/INSERT INTO "feature_flags"/);
    expect(sql).toMatch(/'shop'/);
    expect(sql).toMatch(/false/);
    expect(sql).not.toMatch(/4490|8490|12490/);
  });

  it('slett_forhandler kjenner shop-tabellene før parts (RESTRICT)', () => {
    const start = functions.indexOf("'shop_order_lines', 'shop_orders'");
    const parts = functions.indexOf("'stock_movements', 'stock_levels', 'parts'");
    expect(start).toBeGreaterThan(-1);
    expect(parts).toBeGreaterThan(start);
  });
});
