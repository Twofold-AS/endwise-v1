import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Residual etter #128 (services): samme FORCE RLS-eier-gap på øvrige
 * dealer-skriv. Schema-policyene er TO authenticated FOR ALL. Prod APP
 * er eier `endwise`. withTenant setter bare app.tenant_id.
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
const m0043 = readFileSync(
  resolve(her, '../../../packages/db/drizzle/0043_p0_dealer_owner_write.sql'),
  'utf8',
);
const liveTest = readFileSync(
  resolve(her, '../../../packages/db/test/p0-dealer-owner-write.test.ts'),
  'utf8',
);
const vitestCfg = readFileSync(resolve(her, '../../../packages/db/vitest.config.ts'), 'utf8');
const forceRls = readFileSync(resolve(her, '../../../packages/db/test/force-rls.test.ts'), 'utf8');
const feilHjelper = readFileSync(resolve(her, '../src/trpc/slett-postgres.ts'), 'utf8');
const kunder = readFileSync(resolve(her, '../src/trpc/routers/customers.ts'), 'utf8');
const kjoretoy = readFileSync(resolve(her, '../src/trpc/routers/vehicles.ts'), 'utf8');
const lager = readFileSync(resolve(her, '../src/trpc/routers/inventory.ts'), 'utf8');
const bookinger = readFileSync(resolve(her, '../src/trpc/routers/bookings.ts'), 'utf8');
const kompetanse = readFileSync(resolve(her, '../src/trpc/routers/competence.ts'), 'utf8');
const meldinger = readFileSync(resolve(her, '../src/trpc/routers/messages.ts'), 'utf8');

const INSERT_SELECT = [
  'customers',
  'customer_notes',
  'vehicles',
  'bookings',
  'booking_services',
  'skills',
  'mechanic_skills',
  'threads',
  'thread_participants',
  'messages',
  'notifications',
  'parts',
  'stock_locations',
  'stock_levels',
  'stock_movements',
] as const;

const UPDATE = [
  'customers',
  'vehicles',
  'bookings',
  'skills',
  'mechanic_skills',
  'threads',
  'thread_participants',
  'messages',
  'notifications',
  'parts',
  'stock_locations',
  'stock_levels',
] as const;

const APPEND_ONLY = ['customer_notes', 'booking_services', 'stock_movements'] as const;

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
    expect(kropp).not.toMatch(/for insert/);
    expect(kropp).not.toMatch(/for select/);
    expect(kropp).not.toMatch(/for update/);
  }
}

describe('FORCE RLS eier-skriv på P0 dealer-tabeller (prod-rolle endwise)', () => {
  it('withTenant setter bare app.tenant_id — ikke platform_admin', () => {
    const start = client.indexOf('export async function withTenant');
    expect(start).toBeGreaterThan(-1);
    const kropp = client.slice(start, start + 420);
    expect(kropp).toMatch(/set_config\(\$\{APP_TENANT_SETTING\}, \$\{tenantId\}, true\)/);
    expect(kropp).not.toMatch(/set_config\('app\.platform_admin'/);
  });

  it('alle P0-tabeller: TO PUBLIC eier INSERT/SELECT, kun tenant-guc', () => {
    for (const kilde of [grants, m0043]) {
      for (const tabell of INSERT_SELECT) {
        assertEierTenantPolicy(kilde, `${tabell}_tenant_insert_owner`, 'insert');
        assertEierTenantPolicy(kilde, `${tabell}_tenant_select_owner`, 'select');
      }
      for (const tabell of UPDATE) {
        assertEierTenantPolicy(kilde, `${tabell}_tenant_update_owner`, 'update');
      }
      assertEierTenantPolicy(kilde, 'mechanic_skills_tenant_delete_owner', 'delete');
    }
  });

  it('append-only tabeller har ikke eier-UPDATE', () => {
    for (const tabell of APPEND_ONLY) {
      expect(grants).not.toMatch(new RegExp(`${tabell}_tenant_update_owner`));
      expect(m0043).not.toMatch(new RegExp(`${tabell}_tenant_update_owner`));
    }
  });

  it('0043 + db:grants krever eier-policyene, skrur ikke av FORCE RLS', () => {
    expect(journal).toMatch(/0042_services_owner_write/);
    expect(journal).toMatch(/0043_p0_dealer_owner_write/);
    expect(journal.indexOf('0042_services_owner_write')).toBeLessThan(
      journal.indexOf('0043_p0_dealer_owner_write'),
    );
    expect(journal).not.toMatch(/0042_p0_dealer/);
    for (const tabell of INSERT_SELECT) {
      expect(grantsTs).toMatch(new RegExp(`${tabell}_tenant_insert_owner`));
      expect(grantsTs).toMatch(new RegExp(`${tabell}_tenant_select_owner`));
    }
    for (const tabell of UPDATE) {
      expect(grantsTs).toMatch(new RegExp(`${tabell}_tenant_update_owner`));
      expect(grantsTs).toMatch(new RegExp(`${tabell}_owner_update_guard`));
    }
    expect(grantsTs).toMatch(/mechanic_skills_tenant_delete_owner/);
    expect(grants).toMatch(/force row level security/);
    expect(grants).not.toMatch(/no force row level security/i);
    expect(m0043).not.toMatch(/disable row level security/i);
    expect(m0043).not.toMatch(/no force row level security/i);
    expect(forceRls).toMatch(/customers_tenant_insert_owner/);
    expect(forceRls).toMatch(/stock_movements_tenant_select_owner/);
    expect(forceRls).toMatch(/bookings_tenant_update_owner/);
  });

  it('trigger låser identitet/historikk der UPDATE finnes', () => {
    expect(functionsSql).toMatch(/customers_owner_update_guard/);
    expect(functionsSql).toMatch(/bookings_owner_update_guard/);
    expect(functionsSql).toMatch(/messages_owner_update_guard/);
    expect(m0043).toMatch(/customers_owner_update_guard/);
    expect(m0043).toMatch(/new\.id is distinct from old\.id/);
    expect(m0043).toMatch(/new\.tenant_id is distinct from old\.tenant_id/);
    expect(m0043).toMatch(/new\.created_at is distinct from old\.created_at/);
    expect(m0043).toMatch(/new\.idempotency_key is distinct from old\.idempotency_key/);
    expect(m0043).toMatch(/new\.service_version_id is distinct from old\.service_version_id/);
    expect(m0043).toMatch(/new\.body is distinct from old\.body/);
    expect(m0043).toMatch(/new\.author_id is distinct from old\.author_id/);
    expect(functionsSql).toMatch(/eier-UPDATE kan ikke endre id, tenant_id eller created_at/);
    expect(functionsSql).toMatch(/eier-UPDATE kan ikke endre meldingstekst eller avsender/);
    expect(functionsSql).not.toMatch(/customer_notes_owner_update_guard/);
    expect(functionsSql).not.toMatch(/stock_movements_owner_update_guard/);
  });

  it('SET ROLE-regresjon: INSERT…RETURNING + tom GUC avvist', () => {
    expect(liveTest).toMatch(/SET ROLE endwise|set local role/i);
    expect(liveTest).toMatch(/app\.tenant_id/);
    expect(liveTest).toMatch(/insert into customers/);
    expect(liveTest).toMatch(/insert into customer_notes/);
    expect(liveTest).toMatch(/insert into vehicles/);
    expect(liveTest).toMatch(/insert into bookings/);
    expect(liveTest).toMatch(/insert into booking_services/);
    expect(liveTest).toMatch(/insert into skills/);
    expect(liveTest).toMatch(/insert into threads/);
    expect(liveTest).toMatch(/insert into messages/);
    expect(liveTest).toMatch(/insert into parts/);
    expect(liveTest).toMatch(/insert into stock_movements/);
    expect(liveTest).toMatch(/delete from mechanic_skills/i);
    expect(liveTest).toMatch(/uten tenant-GUC|tom tenant-GUC/i);
    expect(liveTest).toMatch(/platform_admin/);
    expect(liveTest).not.toMatch(/p0_test_service_versions_fk_select/);
    expect(vitestCfg).toMatch(/p0-dealer-owner-write\.test\.ts/);
  });

  it('klientfeil sanitiseres — ingen Failed query/params', () => {
    expect(kunder).toMatch(/mapDealerWritePostgresFeil/);
    expect(kjoretoy).toMatch(/mapDealerWritePostgresFeil/);
    expect(lager).toMatch(/mapDealerWritePostgresFeil/);
    expect(bookinger).toMatch(/mapDealerWritePostgresFeil/);
    expect(kompetanse).toMatch(/mapDealerWritePostgresFeil/);
    expect(meldinger).toMatch(/mapDealerWritePostgresFeil/);
    expect(feilHjelper).toMatch(/export function mapDealerWritePostgresFeil/);
    expect(kunder).toMatch(/Kunne ikke lagre kunden/);
    expect(kjoretoy).toMatch(/Kunne ikke lagre kjøretøyet/);
    expect(lager).toMatch(/Kunne ikke lagre/);
    const fjerne = kompetanse.slice(kompetanse.indexOf('removeMechanicSkill'));
    expect(fjerne).toMatch(/mapDealerWritePostgresFeil/);
    expect(fjerne).toMatch(/Kunne ikke fjerne kompetansen/);
    expect(fjerne).not.toMatch(/Failed query/);
    const mapper = feilHjelper.slice(
      feilHjelper.indexOf('export function mapDealerWritePostgresFeil'),
    );
    expect(mapper).not.toMatch(/Failed query/);
    expect(mapper).not.toMatch(/params:/);
  });
});
