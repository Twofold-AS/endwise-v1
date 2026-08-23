import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Mons P0 etter NO-GO på a840318.
 *
 * Kildekontrakt — kjører uten DATABASE_URL. Beviser at inspect ikke
 * bytter app.tenant_id, at 0021 tetter 0019/0020, og at hash-policyen
 * ikke er FOR ALL.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const client = les('../src/client.ts');
const rls = les('../src/rls.ts');
const grants = les('../sql/grants.sql');
const functions = les('../sql/functions.sql');
const invitations = les('../src/schema/invitations.ts');
const messages = les('../src/schema/messages.ts');
const m0020 = les('../drizzle/0020_platform_org.sql');
const m0021 = les('../drizzle/0021_mons_p0_sikkerhet.sql');
const journal = les('../drizzle/meta/_journal.json');

describe('Inspect-GUC — ikke tenant-swap (CWE-284 / CWE-200)', () => {
  it('withPlatformInspect setter app.platform_inspect, ikke app.tenant_id', () => {
    const start = client.indexOf('export async function withPlatformInspect');
    expect(start).toBeGreaterThan(-1);
    const kropp = client.slice(start, start + 900);
    expect(kropp).toMatch(/app\.platform_inspect/);
    expect(kropp).toMatch(/set transaction read only/i);
    expect(kropp).not.toMatch(/APP_TENANT_SETTING/);
    expect(kropp).not.toMatch(/app\.tenant_id/);
  });

  it('rls.ts har smal inspect-GUC (tenant-id, ikke bare on)', () => {
    expect(rls).toMatch(/APP_INSPECT_SETTING/);
    expect(rls).toMatch(/app\.platform_inspect/);
    expect(rls).toMatch(/inspectSelectPolicy|currentInspectTenantId/);
  });

  it('0021 lager SELECT-only inspect-policyer bundet til GUC-tenanten', () => {
    expect(m0021).toMatch(/bookings_platform_inspect_read/);
    expect(m0021).toMatch(/mechanics_platform_inspect_read/);
    expect(m0021).toMatch(/threads_platform_inspect_read/);
    expect(m0021).toMatch(/messages_platform_inspect_read/);
    expect(m0021).toMatch(/for:\s*'select'|FOR SELECT/);
    expect(m0021).toMatch(/app\.platform_inspect/);
    expect(m0021).not.toMatch(/customers_platform_inspect_read/);
  });
});

describe('0019 → 0021: bind last-message til tråd-tenant (CWE-200)', () => {
  it('0021 DROPper de brede 0019-policyene og lager tettere', () => {
    expect(m0021).toMatch(/DROP POLICY IF EXISTS threads_platform_admin_support_read/i);
    expect(m0021).toMatch(/DROP POLICY IF EXISTS messages_platform_admin_support_read/i);
    expect(m0021).toMatch(/th\.tenant_id = .+tenant_id|tenant_id = th\.tenant_id/);
  });

  it('Drizzle-skjemaet binder messages til thread.tenant_id', () => {
    const start = messages.indexOf('messages_platform_admin_support_read');
    expect(start).toBeGreaterThan(-1);
    const kropp = messages.slice(start, start + 700);
    expect(kropp).toMatch(/tenant_id/);
    expect(kropp).toMatch(/dealer_admin/);
  });

  it('rewriter ikke 0019-fila (journal-hash)', () => {
    expect(journal).toMatch(/0019_f5_11_support_read/);
    expect(journal).toMatch(/0021_mons_p0_sikkerhet/);
  });
});

describe('0020-reparasjon i 0021 (CREATE OR REPLACE RETURNS)', () => {
  it('0021 DROPper lookup_open_invitation før CREATE', () => {
    expect(m0021).toMatch(/DROP FUNCTION IF EXISTS lookup_open_invitation\(text\)/i);
    const drop = m0021.search(/DROP FUNCTION IF EXISTS lookup_open_invitation\(text\)/i);
    const create = m0021.search(/CREATE(?: OR REPLACE)? FUNCTION lookup_open_invitation/i);
    expect(drop).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(drop);
  });

  it('functions.sql DROPper før CREATE (samme kontrakt)', () => {
    const drop = functions.search(/drop function if exists lookup_open_invitation\(text\)/i);
    const create = functions.search(/create or replace function lookup_open_invitation/i);
    expect(drop).toBeGreaterThan(-1);
    expect(create).toBeGreaterThan(drop);
  });

  it('CHECK binder platform_level ↔ role', () => {
    expect(invitations).toMatch(/endwise_admin.*administrator|administrator.*endwise_admin/);
    expect(invitations).toMatch(/endwise_support.*support|support.*endwise_support/);
    expect(m0021).toMatch(/invitations_platform_level_role|platform_level.*=.*administrator/);
  });

  it('0021 er idempotent (IF EXISTS / IF NOT EXISTS)', () => {
    expect(m0021).toMatch(/DROP POLICY IF EXISTS/i);
    expect(m0021).toMatch(/DROP FUNCTION IF EXISTS/i);
    expect(m0021).toMatch(/DROP CONSTRAINT IF EXISTS/i);
  });

  it('0020 i journal forblir — reparasjon ligger i 0021', () => {
    expect(journal).toMatch(/0020_platform_org/);
    expect(m0020).toMatch(/CREATE OR REPLACE FUNCTION lookup_open_invitation/);
  });
});

describe('invitations_open_by_hash er ikke FOR ALL (CWE-284)', () => {
  it('grants.sql splitter SELECT og UPDATE', () => {
    const start = grants.indexOf('create policy invitations_open_by_hash');
    expect(start).toBeGreaterThan(-1);
    const kropp = grants.slice(start, start + 1600);
    expect(kropp).not.toMatch(/for all/i);
    expect(kropp).toMatch(/for select/i);
    expect(kropp).toMatch(/for update/i);
  });

  it('0021 reparerer hash-policyen hvis grants ikke er kjørt alene', () => {
    expect(m0021).toMatch(/invitations_open_by_hash/);
    expect(m0021).not.toMatch(/create policy invitations_open_by_hash[\s\S]{0,200}for all/i);
  });
});

describe('Eier-lås i DB (CWE-284)', () => {
  it('0021 har trigger mot demote/slett av plattform-eier', () => {
    expect(m0021).toMatch(/plattform-eier|platform_owner|eier_las/i);
    expect(m0021).toMatch(/BEFORE UPDATE OR DELETE ON member/i);
    expect(m0021).toMatch(/endwise_admin/);
  });
});
