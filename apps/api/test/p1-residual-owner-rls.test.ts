import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Residual etter #128/#131 (0042+0043): samme FORCE RLS-eier-gap
 * på #131 «Utsatt»-tabellene. Schema-policyene er TO authenticated.
 * Prod APP er eier `endwise`. withTenant setter bare app.tenant_id.
 */

const her = dirname(fileURLToPath(import.meta.url));
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
const functionsSql = readFileSync(resolve(her, '../../../packages/db/sql/functions.sql'), 'utf8');
const client = readFileSync(resolve(her, '../../../packages/db/src/client.ts'), 'utf8');
const journal = readFileSync(
  resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
  'utf8',
);
const m0044 = readFileSync(
  resolve(her, '../../../packages/db/drizzle/0044_p1_residual_owner_write.sql'),
  'utf8',
);
const liveTest = readFileSync(
  resolve(her, '../../../packages/db/test/p1-residual-owner-write.test.ts'),
  'utf8',
);
const vitestCfg = readFileSync(resolve(her, '../../../packages/db/vitest.config.ts'), 'utf8');
const forceRls = readFileSync(resolve(her, '../../../packages/db/test/force-rls.test.ts'), 'utf8');

const INSERT_SELECT = [
  'dealer_profiles',
  'integration_config',
  'widget_keys',
  'billing_customers',
  'sync_conflicts',
  'stream_events',
  'shop_orders',
  'shop_order_lines',
  'feature_flag_overrides',
] as const;

const UPDATE = [
  'dealer_profiles',
  'integration_config',
  'widget_keys',
  'mechanics',
  'billing_customers',
  'sync_conflicts',
  'shop_orders',
  'feature_flag_overrides',
] as const;

const APPEND_ONLY = ['stream_events', 'shop_order_lines'] as const;

function policyKropp(sql: string, navn: string): string {
  const start = sql.indexOf(`create policy ${navn}`);
  expect(start, `mangler create policy ${navn}`).toBeGreaterThan(-1);
  const etter = sql.slice(start);
  const slutt = etter.search(/\n(?:drop policy|create policy|-- )/);
  return slutt === -1 ? etter : etter.slice(0, slutt);
}

function assertEierTenantPolicy(
  sql: string,
  navn: string,
  cmd: 'insert' | 'select' | 'update' | 'delete',
) {
  const kropp = policyKropp(sql, navn);
  expect(kropp).toMatch(new RegExp(`for ${cmd}`));
  expect(kropp).toMatch(/to public/);
  expect(kropp).toMatch(/current_user is distinct from 'authenticated'/);
  expect(kropp).toMatch(/current_user is distinct from 'endwise_app'/);
  expect(kropp).toMatch(/pg_get_userbyid|relowner/);
  expect(kropp).toMatch(/nullif\(current_setting\('app\.tenant_id', true\), ''\) is not null/);
  expect(kropp).toMatch(
    /tenant_id = nullif\(current_setting\('app\.tenant_id', true\), ''\)::uuid/,
  );
  expect(kropp).not.toMatch(/app\.platform_admin/);
  expect(kropp).not.toMatch(/for all/i);
  expect(kropp).not.toMatch(/disable row level security/i);
  expect(kropp).not.toMatch(/no force row level security/i);
  if (cmd === 'insert') {
    expect(kropp).toMatch(/with check/);
    expect(kropp).not.toMatch(/for select/);
    expect(kropp).not.toMatch(/for update/);
    expect(kropp).not.toMatch(/for delete/);
  }
  if (cmd === 'select') {
    expect(kropp).toMatch(/using/);
    expect(kropp).not.toMatch(/for insert/);
    expect(kropp).not.toMatch(/for update/);
    expect(kropp).not.toMatch(/for delete/);
  }
  if (cmd === 'update') {
    expect(kropp).toMatch(/using/);
    expect(kropp).toMatch(/with check/);
    expect(kropp).not.toMatch(/for insert/);
    expect(kropp).not.toMatch(/for select/);
    expect(kropp).not.toMatch(/for delete/);
  }
  if (cmd === 'delete') {
    expect(kropp).toMatch(/using/);
    expect(kropp).not.toMatch(/with check/);
  }
}

describe('FORCE RLS residual eier-skriv (#131 Utsatt, prod-rolle endwise)', () => {
  it('withTenant setter bare app.tenant_id — ikke platform_admin', () => {
    const start = client.indexOf('export async function withTenant');
    expect(start).toBeGreaterThan(-1);
    const kropp = client.slice(start, start + 420);
    expect(kropp).toMatch(/set_config\(\$\{APP_TENANT_SETTING\}, \$\{tenantId\}, true\)/);
    expect(kropp).not.toMatch(/set_config\('app\.platform_admin'/);
  });

  it('residual-tabeller: TO PUBLIC eier INSERT/SELECT/UPDATE, kun tenant-guc', () => {
    for (const kilde of [grants, m0044]) {
      for (const tabell of INSERT_SELECT) {
        assertEierTenantPolicy(kilde, `${tabell}_tenant_insert_owner`, 'insert');
        assertEierTenantPolicy(kilde, `${tabell}_tenant_select_owner`, 'select');
      }
      assertEierTenantPolicy(kilde, 'tenant_modules_tenant_insert_owner', 'insert');
      for (const tabell of UPDATE) {
        assertEierTenantPolicy(kilde, `${tabell}_tenant_update_owner`, 'update');
      }
    }
  });

  it('append-only tabeller har ikke eier-UPDATE', () => {
    for (const tabell of APPEND_ONLY) {
      expect(grants).not.toMatch(new RegExp(`${tabell}_tenant_update_owner`));
      expect(m0044).not.toMatch(new RegExp(`${tabell}_tenant_update_owner`));
    }
  });

  it('0044 + db:grants krever residual-policyene, skrur ikke av FORCE RLS', () => {
    expect(journal).toMatch(/0042_services_owner_write/);
    expect(journal).toMatch(/0043_p0_dealer_owner_write/);
    expect(journal).toMatch(/0044_p1_residual_owner_write/);
    expect(journal.indexOf('0043_p0_dealer_owner_write')).toBeLessThan(
      journal.indexOf('0044_p1_residual_owner_write'),
    );
    for (const tabell of INSERT_SELECT) {
      expect(grantsTs).toMatch(new RegExp(`${tabell}_tenant_insert_owner`));
      expect(grantsTs).toMatch(new RegExp(`${tabell}_tenant_select_owner`));
    }
    expect(grantsTs).toMatch(/tenant_modules_tenant_insert_owner/);
    expect(grantsTs).toMatch(/mechanics_tenant_update_owner/);
    for (const tabell of UPDATE) {
      expect(grantsTs).toMatch(new RegExp(`${tabell}_tenant_update_owner`));
      if (tabell !== 'mechanics') {
        expect(grantsTs).toMatch(new RegExp(`${tabell}_owner_update_guard`));
      }
    }
    expect(grantsTs).toMatch(/mechanics_owner_update_guard/);
    expect(grants).toMatch(/force row level security/);
    expect(grants).not.toMatch(/no force row level security/i);
    expect(m0044).not.toMatch(/disable row level security/i);
    expect(m0044).not.toMatch(/no force row level security/i);
    expect(forceRls).toMatch(/dealer_profiles_tenant_insert_owner/);
    expect(forceRls).toMatch(/tenant_modules_tenant_insert_owner/);
    expect(forceRls).toMatch(/mechanics_tenant_update_owner/);
  });

  it('trigger låser identitet der UPDATE finnes', () => {
    expect(functionsSql).toMatch(/dealer_profiles_owner_update_guard/);
    expect(functionsSql).toMatch(/widget_keys_owner_update_guard/);
    expect(functionsSql).toMatch(/mechanics_owner_update_guard/);
    expect(functionsSql).toMatch(/billing_customers_owner_update_guard/);
    expect(m0044).toMatch(/dealer_profiles_owner_update_guard/);
    expect(m0044).toMatch(/new\.publishable_key is distinct from old\.publishable_key/);
    expect(m0044).toMatch(/new\.created_by_user_id is distinct from old\.created_by_user_id/);
    expect(functionsSql).toMatch(/eier-UPDATE kan ikke endre tenant_id eller created_at/);
    expect(functionsSql).toMatch(
      /eier-UPDATE kan ikke endre id, tenant_id, created_at eller publishable_key/,
    );
    expect(functionsSql).toMatch(/new\.user_id is distinct from old\.user_id/);
    expect(functionsSql).toMatch(
      /eier-UPDATE kan ikke endre id, tenant_id, created_at eller user_id/,
    );
    expect(m0044).toMatch(/new\.user_id is distinct from old\.user_id/);
    expect(grantsTs).toMatch(/new\.user_id is distinct from old\.user_id/);
    expect(functionsSql).not.toMatch(/stream_events_owner_update_guard/);
    expect(functionsSql).not.toMatch(/shop_order_lines_owner_update_guard/);
  });

  it('tenant_modules INSERT er tenant-guc, ikke platform_admin', () => {
    const kropp = policyKropp(grants, 'tenant_modules_tenant_insert_owner');
    expect(kropp).not.toMatch(/app\.platform_admin/);
    const admin = policyKropp(grants, 'tenant_modules_platform_admin_insert_owner');
    expect(admin).toMatch(/app\.platform_admin/);
    expect(grantsTs).toMatch(/tenant_modules_tenant_insert_owner/);
    expect(grantsTs).toMatch(
      /strpos\(pg_get_expr\(p\.polwithcheck, p\.polrelid\), 'app\.platform_admin'\) = 0/,
    );
  });

  it('SET ROLE-regresjon: INSERT…RETURNING + tom GUC avvist', () => {
    expect(liveTest).toMatch(/SET ROLE endwise|set local role/i);
    expect(liveTest).toMatch(/app\.tenant_id/);
    expect(liveTest).toMatch(/insert into dealer_profiles/);
    expect(liveTest).toMatch(/insert into integration_config/);
    expect(liveTest).toMatch(/insert into widget_keys/);
    expect(liveTest).toMatch(/insert into billing_customers/);
    expect(liveTest).toMatch(/insert into tenant_modules/);
    expect(liveTest).toMatch(/insert into sync_conflicts/);
    expect(liveTest).toMatch(/insert into stream_events/);
    expect(liveTest).toMatch(/insert into shop_orders/);
    expect(liveTest).toMatch(/insert into shop_order_lines/);
    expect(liveTest).toMatch(/insert into feature_flag_overrides/);
    expect(liveTest).toMatch(/update mechanics/);
    expect(liveTest).toMatch(/eier-UPDATE kan ikke rebinde mechanics\.user_id/);
    expect(liveTest).toMatch(/set user_id = 'other-user'/);
    expect(liveTest).toMatch(/uten tenant-GUC|tom tenant-GUC/i);
    expect(liveTest).toMatch(/platform_admin/);
    expect(vitestCfg).toMatch(/p1-residual-owner-write\.test\.ts/);
  });
});
