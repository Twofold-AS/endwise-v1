import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Prod 2026-09-04 04:23 UTC (df94fc3 / #124):
 * GET /invitasjoner/<token> 200, POST /godta 500 etter consume
 * («Failed query: insert into member_profiles», tenant 50f690af-…,
 * user f86aa037-…, job_function leder). Retry 410 — invite already consumed.
 *
 * Rot: consume_invitation committet FØR member_profiles-upsert.
 * Eier `endwise` under FORCE RLS har SELECT (0039) men ikke INSERT.
 */

const stubs = vi.hoisted(() => ({
  finnApen: vi.fn(),
  forbruk: vi.fn(),
}));

const rlsFeil = () => {
  const err = new Error(
    'Failed query: insert into "member_profiles" ("tenant_id","user_id","job_function") values ($1,$2,$3)',
  );
  (err as Error & { cause: { code: string; message: string } }).cause = {
    code: '42501',
    message: 'new row violates row-level security policy for table "member_profiles"',
  };
  return err;
};

vi.mock('../src/context.ts', () => ({
  createAppContext: () => ({
    db: {
      select: () => ({
        from: () => ({
          where: () => ({
            limit: async () => [],
          }),
        }),
      }),
      insert: () => ({
        values: async () => undefined,
      }),
      update: () => ({
        set: () => ({
          where: async () => undefined,
        }),
      }),
    },
  }),
}));

vi.mock('@endwise/modules/invitasjoner', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@endwise/modules/invitasjoner')>();
  return {
    ...actual,
    createInvitasjonsmodul: () => ({
      finnApen: stubs.finnApen,
      forbruk: stubs.forbruk,
    }),
  };
});

vi.mock('@endwise/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@endwise/db')>();
  return {
    ...actual,
    withTenant: async (
      _db: unknown,
      _tenantId: string,
      fn: (tx: {
        insert: (table: unknown) => {
          values: (v: unknown) => {
            onConflictDoUpdate: (opts: unknown) => Promise<void>;
          } & Promise<void>;
        };
        select: () => {
          from: () => {
            where: () => { limit: () => Promise<unknown[]> };
          };
        };
        update: () => {
          set: () => { where: () => Promise<void> };
        };
        execute: () => Promise<{ rows: unknown[] }>;
      }) => Promise<unknown>,
    ) => {
      const tx = {
        insert: (table: unknown) => ({
          values: () =>
            Object.assign(Promise.resolve(undefined), {
              onConflictDoUpdate: async () => {
                if (table === actual.schema.memberProfiles) throw rlsFeil();
              },
            }),
        }),
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => [],
            }),
          }),
        }),
        update: () => ({
          set: () => ({
            where: async () => undefined,
          }),
        }),
        execute: async () => ({ rows: [] }),
      };
      return fn(tx);
    },
  };
});

import { handleHono } from '../src/http/hono.ts';

const her = dirname(fileURLToPath(import.meta.url));

function policyKropp(sql: string, navn: string): string {
  const start = sql.indexOf(`create policy ${navn}`);
  expect(start, `mangler create policy ${navn}`).toBeGreaterThan(-1);
  const etter = sql.slice(start);
  const slutt = etter.search(/\n(?:drop policy|create policy|create or replace|-- )/);
  return slutt === -1 ? etter : etter.slice(0, slutt);
}

describe('godta — kontrakt: consume etter profil, samme tx', () => {
  const rute = readFileSync(resolve(her, '../src/routes/invitasjon.ts'), 'utf8');
  const godta = rute.slice(rute.indexOf("invitasjon.post('/godta'"));
  const grants = readFileSync(resolve(her, '../../../packages/db/sql/grants.sql'), 'utf8');
  const grantsTs = readFileSync(resolve(her, '../../../packages/db/scripts/grants.ts'), 'utf8');
  const modul = readFileSync(
    resolve(her, '../../../packages/modules/src/invitasjoner/index.ts'),
    'utf8',
  );
  const journal = readFileSync(
    resolve(her, '../../../packages/db/drizzle/meta/_journal.json'),
    'utf8',
  );

  it('oppretter bruker/medlem/profil før forbruk, i samme withTenant', () => {
    const withAt = godta.search(/withTenant\(db\(\), inv\.tenantId/);
    const userAt = godta.search(/insert\(schema\.user\)/);
    const profileAt = godta.search(/insert\(schema\.memberProfiles\)/);
    const forbrukAt = godta.search(/modul\.forbruk/);
    expect(withAt).toBeGreaterThan(-1);
    expect(userAt).toBeGreaterThan(withAt);
    expect(profileAt).toBeGreaterThan(userAt);
    expect(forbrukAt).toBeGreaterThan(profileAt);
    expect(godta.slice(forbrukAt, forbrukAt + 80)).toMatch(/forbruk\([^)]*tx/);
    expect(godta).not.toMatch(/forbruk tokenet|Forbruk\. Etter denne linja er tokenet dødt/);
  });

  it('forbruk tar valgfri tx slik consume_invitation deltar i kallers transaksjon', () => {
    const start = modul.search(/async forbruk\s*\(/);
    expect(start).toBeGreaterThan(-1);
    const kropp = modul.slice(start, start + 500);
    expect(kropp).toMatch(/tx\?:/);
    expect(kropp).toMatch(/consume_invitation/);
  });

  it('500 etter delvis feil sier ikke at invitasjonen er brukt — klienten kan prøve igjen', () => {
    expect(godta).not.toMatch(/invitasjonen er brukt opp/i);
    expect(godta).toMatch(/Prøv igjen/);
    expect(godta).toMatch(/loggGodtaFeil/);
    expect(rute).toMatch(/function loggGodtaFeil/);
    expect(rute).toMatch(/lesPostgresCause/);
    expect(rute).toMatch(/pg\.code/);
    expect(godta).not.toMatch(/Failed query/);
    expect(godta).not.toMatch(/error\.message/);
  });

  function assertEierSkriv(sql: string, navn: string, cmd: 'insert' | 'update') {
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
    if (cmd === 'update') {
      expect(kropp).toMatch(/with check/);
    }
  }

  it('0040 eier-INSERT/UPDATE på member_profiles + mechanics INSERT: tenant-guc, eier-only', () => {
    const m0040 = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0040_member_profiles_owner_insert.sql'),
      'utf8',
    );
    expect(journal).toMatch(/0040_member_profiles_owner_insert/);
    for (const sql of [grants, m0040]) {
      assertEierSkriv(sql, 'member_profiles_tenant_insert_owner', 'insert');
      assertEierSkriv(sql, 'member_profiles_tenant_update_owner', 'update');
      assertEierSkriv(sql, 'mechanics_tenant_insert_owner', 'insert');
    }
    expect(grantsTs).toMatch(/member_profiles_tenant_insert_owner/);
    expect(grantsTs).toMatch(/member_profiles_tenant_update_owner/);
    expect(grantsTs).toMatch(/mechanics_tenant_insert_owner/);
    expect(grantsTs).toMatch(/process\.exit\(1\)/);
  });

  it('godta-upsert setter bare jobFunction og updatedAt; mekaniker-INSERT før forbruk', () => {
    const conflict = godta.slice(godta.search(/onConflictDoUpdate/));
    expect(conflict).toMatch(/jobFunction/);
    expect(conflict).toMatch(/updatedAt/);
    expect(conflict.slice(0, 400)).not.toMatch(/nickname/);
    const mekAt = godta.search(/insert\(schema\.mechanics\)/);
    const forbrukAt = godta.search(/modul\.forbruk/);
    expect(mekAt).toBeGreaterThan(-1);
    expect(forbrukAt).toBeGreaterThan(mekAt);
  });

  it('eier-UPDATE på member_profiles låser PK og nickname (kun job_function/updated_at)', () => {
    const m0040 = readFileSync(
      resolve(her, '../../../packages/db/drizzle/0040_member_profiles_owner_insert.sql'),
      'utf8',
    );
    const fn = readFileSync(resolve(her, '../../../packages/db/sql/functions.sql'), 'utf8');
    for (const sql of [m0040, fn]) {
      expect(sql).toMatch(/member_profiles_owner_update_guard/);
      expect(sql).toMatch(/job_function og updated_at/);
      expect(sql).toMatch(/new\.nickname is distinct from old\.nickname/);
      expect(sql).toMatch(/new\.tenant_id is distinct from old\.tenant_id/);
      expect(sql).toMatch(/new\.user_id is distinct from old\.user_id/);
    }
    expect(grantsTs).toMatch(/member_profiles_owner_update_guard/);
  });
});

describe('godta — HTTP: member_profiles-feil brenner ikke invitasjonen', () => {
  beforeEach(() => {
    stubs.finnApen.mockReset();
    stubs.forbruk.mockReset();
    stubs.finnApen.mockResolvedValue({
      id: 'inv-1',
      tenantId: '50f690af-1121-4c9e-aa49-e449649e93ee',
      epost: 'eier@verksted.test',
      funksjon: 'leder',
      rolle: 'dealer_admin',
      kind: 'owner',
      platformLevel: null,
      utloper: new Date(Date.now() + 86_400_000),
    });
    stubs.forbruk.mockResolvedValue('inv-1');
  });

  it('POST 500 uten å kalle forbruk, uten SQLSTATE eller Failed query til klienten', async () => {
    const res = await handleHono(
      new Request('http://endwise.test/invitasjoner/godta', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: 'ekte-token-xx', navn: 'Kari Eier' }),
      }),
    );
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error?: string };
    expect(body.error).toMatch(/Prøv igjen/);
    expect(body.error).not.toMatch(/brukt opp|ugyldig|Failed query|42501|member_profiles/i);
    expect(stubs.forbruk).not.toHaveBeenCalled();
  });
});
