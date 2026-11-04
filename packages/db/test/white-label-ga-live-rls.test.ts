import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * Prod-eier (endwise) er ikke superuser og har ikke BYPASSRLS.
 * 0057 INSERT INTO tenants uten GUC → 42501 (91c96b6).
 * Docker-eieren er superuser — samme stand-in som tenants-owner-update.
 */
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = OWNER_URL ? describe : describe.skip;
const STANDIN = 'endwise_ga_live_rls_probe';
const her = dirname(fileURLToPath(import.meta.url));

function pgFeil(err: unknown): string {
  const deler: string[] = [];
  let cur: unknown = err;
  for (let i = 0; i < 6 && cur; i++) {
    if (cur instanceof Error) {
      const kode = 'code' in cur && typeof cur.code === 'string' ? cur.code : '';
      deler.push(`${kode} ${cur.message}`.trim());
      cur = cur.cause;
    } else {
      deler.push(String(cur));
      break;
    }
  }
  return deler.join(' | ');
}

describeDb('0057 tenants-seed under FORCE RLS (ikke-superuser eier)', () => {
  let owner: Database;
  let eierRolle = 'endwise';
  let originalEier = 'endwise';
  const tenantId = randomUUID();
  const synligId = randomUUID();

  beforeAll(async () => {
    owner = createDb(OWNER_URL as string);
    const eierRad = await owner.execute(sql`
      select pg_get_userbyid(c.relowner) as eier, r.rolsuper
        from pg_class c
        join pg_roles r on r.oid = c.relowner
       where c.oid = 'public.tenants'::regclass
    `);
    const rad = eierRad.rows[0] as { eier: string; rolsuper: boolean };
    originalEier = rad.eier;

    await owner.execute(
      sql.raw(`
      do $$
      begin
        if not exists (select 1 from pg_roles where rolname = '${STANDIN}') then
          create role ${STANDIN} nosuperuser nobypassrls nologin;
        end if;
      end $$;
    `),
    );

    await owner.transaction(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      await tx.execute(sql`select set_config('app.tenant_id', ${synligId}, true)`);
      await tx.execute(sql`
        insert into tenants (id, name, slug, kind, plan, onboarding_completed_at)
        values (
          ${synligId}::uuid, 'Synlig', ${`syn-${synligId.slice(0, 8)}`},
          'live', null, now()
        )
      `);
    });

    if (rad.rolsuper) {
      eierRolle = STANDIN;
      await owner.execute(sql.raw(`alter table public.tenants owner to ${STANDIN}`));
    } else {
      eierRolle = rad.eier;
    }
  });

  afterAll(async () => {
    await owner.execute(
      sql`delete from tenants where id in (${tenantId}::uuid, ${synligId}::uuid)`,
    );
    if (eierRolle === STANDIN) {
      await owner.execute(sql.raw(`alter table public.tenants owner to ${originalEier}`));
    }
    await owner.execute(sql.raw(`drop role if exists ${STANDIN}`));
  });

  async function somEier<T>(
    fn: (tx: Parameters<Parameters<Database['transaction']>[0]>[0]) => Promise<T>,
  ): Promise<T> {
    return owner.transaction(async (tx) => {
      await tx.execute(sql.raw(`set local role ${eierRolle}`));
      return fn(tx);
    });
  }

  it('INSERT uten GUC feiler 42501 (prod-bygget 91c96b6)', async () => {
    try {
      await somEier(async (tx) =>
        tx.execute(sql`
          insert into tenants (id, name, slug, kind, plan, onboarding_completed_at)
          values (
            ${tenantId}::uuid, 'Endwise', ${`ga-${tenantId.slice(0, 8)}`},
            'platform', null, now()
          )
        `),
      );
      expect.fail('INSERT uten GUC skulle feilet');
    } catch (err) {
      expect(pgFeil(err)).toMatch(/row-level security|42501/i);
    }
  });

  it('SELECT uten GUC ser ikke eksisterende tenant (EXISTS-hullet)', async () => {
    const res = await somEier(async (tx) =>
      tx.execute(sql`select id from tenants where slug = ${`syn-${synligId.slice(0, 8)}`}`),
    );
    expect(res.rows).toHaveLength(0);
  });

  it('SELECT med platform_admin ser tenanten', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      return tx.execute(sql`select id from tenants where slug = ${`syn-${synligId.slice(0, 8)}`}`);
    });
    expect(res.rows).toHaveLength(1);
  });

  it('INSERT med platform_admin + tenant_id går som eier', async () => {
    const res = await somEier(async (tx) => {
      await tx.execute(sql`select set_config('app.platform_admin', 'on', true)`);
      await tx.execute(sql`select set_config('app.tenant_id', ${tenantId}, true)`);
      return tx.execute(sql`
        insert into tenants (id, name, slug, kind, plan, onboarding_completed_at)
        values (
          ${tenantId}::uuid, 'Endwise', ${`ga-${tenantId.slice(0, 8)}`},
          'platform', null, now()
        )
        returning slug, kind
      `);
    });
    expect(res.rows).toHaveLength(1);
    expect(res.rows[0]).toMatchObject({ slug: `ga-${tenantId.slice(0, 8)}`, kind: 'platform' });
  });

  it('0057-fila setter begge GUC-er før INSERT INTO tenants', () => {
    const sqlFil = readFileSync(resolve(her, '../drizzle/0057_white_label_ga_live.sql'), 'utf8');
    const insert = sqlFil.indexOf('INSERT INTO tenants');
    expect(
      sqlFil.lastIndexOf("set_config('app.platform_admin', 'on', true)", insert),
    ).toBeGreaterThan(-1);
    expect(sqlFil.lastIndexOf("set_config('app.tenant_id'", insert)).toBeGreaterThan(-1);
  });
});
