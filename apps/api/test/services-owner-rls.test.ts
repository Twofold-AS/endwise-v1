import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Prod endwise.no: services.create feiler som eier `endwise` under FORCE RLS.
 * INSERT … RETURNING på services sender bare identitet (name/vehicle_type).
 * Pris/beskrivelse bor på service_versions — neste INSERT i samme tx.
 * Schema-policyene er TO authenticated. withTenant setter bare app.tenant_id.
 */

const her = dirname(fileURLToPath(import.meta.url));
const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
const functionsSql = readFileSync(resolve(her, '../../../packages/db/sql/functions.sql'), 'utf8');
const client = readFileSync(resolve(her, '../../../packages/db/src/client.ts'), 'utf8');
const schema = readFileSync(resolve(her, '../../../packages/db/src/schema/services.ts'), 'utf8');
const ruter = readFileSync(resolve(her, '../src/trpc/routers/services.ts'), 'utf8');
const journal = readFileSync(
  resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
  'utf8',
);
const m0042 = readFileSync(
  resolve(her, '../../../packages/db/drizzle/0042_services_owner_write.sql'),
  'utf8',
);
const liveTest = readFileSync(
  resolve(her, '../../../packages/db/test/services-owner-write.test.ts'),
  'utf8',
);
const vitestCfg = readFileSync(resolve(her, '../../../packages/db/vitest.config.ts'), 'utf8');
const forceRls = readFileSync(resolve(her, '../../../packages/db/test/force-rls.test.ts'), 'utf8');
const feilHjelper = readFileSync(resolve(her, '../src/trpc/slett-postgres.ts'), 'utf8');

function policyKropp(sql: string, navn: string): string {
  const start = sql.indexOf(`create policy ${navn}`);
  expect(start, `mangler create policy ${navn}`).toBeGreaterThan(-1);
  const etter = sql.slice(start);
  const slutt = etter.search(/\n(?:drop policy|create policy|-- )/);
  return slutt === -1 ? etter : etter.slice(0, slutt);
}

function assertEierTenantPolicy(sql: string, navn: string, cmd: 'insert' | 'select' | 'update') {
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
}

describe('FORCE RLS eier-skriv på tjenestekatalog (prod-rolle endwise)', () => {
  it('withTenant setter bare app.tenant_id — ikke platform_admin', () => {
    const start = client.indexOf('export async function withTenant');
    expect(start).toBeGreaterThan(-1);
    const kropp = client.slice(start, start + 420);
    expect(kropp).toMatch(/set_config\(\$\{APP_TENANT_SETTING\}, \$\{tenantId\}, true\)/);
    expect(kropp).not.toMatch(/set_config\('app\.platform_admin'/);
  });

  it('create skriver identitet på services, pris/beskrivelse på service_versions', () => {
    expect(schema).toMatch(/export const services = pgTable/);
    expect(schema).toMatch(/name: text\('name'\)/);
    expect(schema).toMatch(/vehicleType: vehicleTypeEnum\('vehicle_type'\)/);
    expect(schema).not.toMatch(/priceMinor: integer\('price_minor'\)[\s\S]*export const services/);
    expect(schema).toMatch(/export const serviceVersions = pgTable/);
    expect(schema).toMatch(/priceMinor: integer\('price_minor'\)/);
    expect(schema).toMatch(/description: text\('description'\)/);

    const createAt = ruter.indexOf('create: adminProcedure');
    const createKropp = ruter.slice(createAt, ruter.indexOf('update: adminProcedure'));
    expect(createKropp).toMatch(/insert\(schema\.services\)/);
    expect(createKropp).toMatch(/\.returning\(\)/);
    expect(createKropp).toMatch(/insert\(schema\.serviceVersions\)/);
    expect(createKropp).toMatch(/priceMinor: input\.priceMinor/);
    expect(createKropp).toMatch(/description: input\.description/);
    expect(createKropp).toMatch(/mapTjenestePostgresFeil/);
  });

  it('services + service_versions: TO PUBLIC eier INSERT/SELECT/UPDATE, kun tenant-guc', () => {
    for (const kilde of [grants, m0042]) {
      assertEierTenantPolicy(kilde, 'services_tenant_insert_owner', 'insert');
      assertEierTenantPolicy(kilde, 'services_tenant_select_owner', 'select');
      assertEierTenantPolicy(kilde, 'services_tenant_update_owner', 'update');
      assertEierTenantPolicy(kilde, 'service_versions_tenant_insert_owner', 'insert');
      assertEierTenantPolicy(kilde, 'service_versions_tenant_select_owner', 'select');
      assertEierTenantPolicy(kilde, 'service_versions_tenant_update_owner', 'update');
    }
  });

  it('0042 + db:grants krever eier-policyene, skrur ikke av FORCE RLS', () => {
    expect(journal).toMatch(/0042_services_owner_write/);
    expect(grantsTs).toMatch(/services_tenant_insert_owner/);
    expect(grantsTs).toMatch(/services_tenant_select_owner/);
    expect(grantsTs).toMatch(/services_tenant_update_owner/);
    expect(grantsTs).toMatch(/service_versions_tenant_insert_owner/);
    expect(grantsTs).toMatch(/service_versions_tenant_select_owner/);
    expect(grantsTs).toMatch(/service_versions_tenant_update_owner/);
    expect(grantsTs).toMatch(/services_owner_update_guard/);
    expect(grantsTs).toMatch(/service_versions_owner_update_guard/);
    expect(grants).toMatch(/force row level security/);
    expect(grants).not.toMatch(/no force row level security/i);
    expect(m0042).not.toMatch(/disable row level security/i);
    expect(m0042).not.toMatch(/no force row level security/i);
    expect(forceRls).toMatch(/services_tenant_insert_owner/);
    expect(forceRls).toMatch(/service_versions_tenant_select_owner/);
  });

  it('trigger låser identitet på services og historikk på service_versions', () => {
    expect(functionsSql).toMatch(/services_owner_update_guard/);
    expect(functionsSql).toMatch(/service_versions_owner_update_guard/);
    expect(m0042).toMatch(/services_owner_update_guard/);
    expect(m0042).toMatch(/new\.id is distinct from old\.id/);
    expect(m0042).toMatch(/new\.tenant_id is distinct from old\.tenant_id/);
    expect(m0042).toMatch(/new\.name is distinct from old\.name/);
    expect(m0042).toMatch(/new\.vehicle_type is distinct from old\.vehicle_type/);
    expect(m0042).toMatch(/new\.created_at is distinct from old\.created_at/);
    expect(m0042).toMatch(/new\.service_id is distinct from old\.service_id/);
    expect(m0042).toMatch(/new\.version is distinct from old\.version/);
    expect(m0042).toMatch(/new\.price_minor is distinct from old\.price_minor/);
    expect(m0042).toMatch(/new\.description is distinct from old\.description/);
    expect(m0042).toMatch(/new\.valid_from is distinct from old\.valid_from/);
    expect(functionsSql).toMatch(/eier-UPDATE kan bare sette active/);
    expect(functionsSql).toMatch(/eier-UPDATE kan bare sette valid_to/);
  });

  it('SET ROLE-regresjon: INSERT…RETURNING + tom GUC avvist', () => {
    expect(liveTest).toMatch(/SET ROLE endwise|set local role/i);
    expect(liveTest).toMatch(/app\.tenant_id/);
    expect(liveTest).toMatch(/insert into services/);
    expect(liveTest).toMatch(/returning id, name, vehicle_type/);
    expect(liveTest).toMatch(/insert into service_versions/);
    expect(liveTest).toMatch(/uten tenant-GUC|tom tenant-GUC/i);
    expect(liveTest).toMatch(/platform_admin/);
    expect(vitestCfg).toMatch(/services-owner-write\.test\.ts/);
  });

  it('klientfeil sanitiseres — ingen Failed query/params', () => {
    expect(ruter).toMatch(/mapTjenestePostgresFeil/);
    expect(ruter).toMatch(/loggTjenestePostgresFeil/);
    expect(feilHjelper).toMatch(/export function mapTjenestePostgresFeil/);
    expect(feilHjelper).toMatch(/Kunne ikke lagre tjenesten/);
    const mapper = feilHjelper.slice(
      feilHjelper.indexOf('export function mapTjenestePostgresFeil'),
    );
    expect(mapper).not.toMatch(/Failed query/);
    expect(mapper).not.toMatch(/params:/);
  });
});
