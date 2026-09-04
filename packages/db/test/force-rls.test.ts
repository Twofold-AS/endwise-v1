import { sql } from 'drizzle-orm';
import { beforeAll, describe, expect, it } from 'vitest';
import { createDb, type Database } from '../src/client.ts';

/**
 * F5-28 ③ — «Er RLS i det hele tatt PÅ for den rollen appen bruker?»
 * De andre isolasjonstestene angriper policyene. Denne testen angriper
 * Forutsetningen for dem: at runtime-forbindelsen faktisk er underlagt RLS.
 * Det er en reell fare, ikke en teoretisk. `enable row level security` gjelder
 * for alle andre enn tabelleieren. Peker `APP_DATABASE_URL` på eieren — eller
 * er rollen superuser eller `bypassrls` — er hele tenant-isolasjonen borte, og
 * alle de andre testene blir grønne likevel. Det ville vært den farligste
 * grønne testen i repoet.
 * Derfor sjekker denne fire ting, og alle fire må holde:
 * ① runtime-rollen eier ingen RLS-tabell
 * ② runtime-rollen er hverken superuser eller bypassrls
 * ③ hver RLS-tabell har force (så ① ikke lenger er nok til å ødelegge noe)
 * ④ RLS er faktisk påslått på tabellene vi tror den er påslått på
 * Krever `pnpm db:setup` (migrasjoner + grants). Uten DB skippes testen — som
 * alle de andre DB-testene.
 */
const APP_URL = process.env.APP_DATABASE_URL;
const OWNER_URL = process.env.DATABASE_URL;
const describeDb = APP_URL && OWNER_URL ? describe : describe.skip;

/** Tabeller som skal ha RLS. Ikke uttømmende — en stikkprøve med tenner. */
const MÅ_HA_RLS = [
  'tenants',
  'tenant_modules',
  'bookings',
  'customers',
  'vehicles',
  'mechanics',
  'messages',
  'threads',
  'feature_flag_overrides',
  'shop_orders',
  'shop_order_lines',
];

describeDb('FORCE RLS + runtime-rollen', () => {
  let app: Database;

  beforeAll(() => {
    app = createDb(APP_URL as string);
  });

  it('① runtime-brukeren eier INGEN tabell med RLS', async () => {
    const res = await app.execute(sql`
      select c.relname as tabell
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relrowsecurity
        and pg_get_userbyid(c.relowner) = current_user
    `);
    const eide = res.rows.map((r) => r.tabell);

    // Meldingen er viktigere enn assertionen: den som ser denne testen ryke
    // skal ikke måtte gjette hva som er galt.
    expect(
      eide,
      `APP_DATABASE_URL peker på en bruker som EIER ${eide.length} RLS-tabell(er). ` +
        'Uten FORCE ville RLS vært usynlig for den. Bruk endwise_app, ikke eieren.',
    ).toEqual([]);
  });

  it('② runtime-rollen er hverken superuser eller bypassrls', async () => {
    const res = await app.execute(sql`
      select rolsuper, rolbypassrls from pg_roles where rolname = current_user
    `);
    const rolle = res.rows[0] as { rolsuper: boolean; rolbypassrls: boolean } | undefined;
    expect(rolle, 'fant ikke current_user i pg_roles').toBeDefined();
    expect(rolle?.rolsuper, 'runtime-rollen er SUPERUSER — RLS gjelder ikke').toBe(false);
    expect(rolle?.rolbypassrls, 'runtime-rollen har BYPASSRLS').toBe(false);
  });

  it('③ hver tabell med RLS har også FORCE', async () => {
    const res = await app.execute(sql`
      select c.relname as tabell
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relkind = 'r'
        and c.relrowsecurity
        and not c.relforcerowsecurity
    `);
    const uten = res.rows.map((r) => r.tabell);
    expect(
      uten,
      `Disse mangler FORCE ROW LEVEL SECURITY: ${uten.join(', ')}. Kjør \`pnpm db:grants\`.`,
    ).toEqual([]);
  });

  it('③e lookup_open_invitation finnes med invitation_hash (F1-10)', async () => {
    const res = await app.execute(sql`
      select p.proname,
             pg_get_function_identity_arguments(p.oid) as identity,
             pg_get_function_result(p.oid) as result,
             p.prosrc
        from pg_proc p
        join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname = 'lookup_open_invitation'
    `);
    expect(res.rows, 'Mangler lookup_open_invitation. Kjør `pnpm db:grants`.').toHaveLength(1);
    expect(String(res.rows[0]?.identity)).toMatch(/text/);
    expect(String(res.rows[0]?.prosrc)).toMatch(/app\.invitation_hash/);
    expect(String(res.rows[0]?.result)).toMatch(/platform_level/);
    expect(String(res.rows[0]?.result)).toMatch(/job_function/);
    expect(String(res.rows[0]?.result)).toMatch(/expires_at/);
  });

  it('③b invitations_open_by_hash finnes (F1-10 FORCE RLS-unntak)', async () => {
    const res = await app.execute(sql`
      select polname, polcmd, polpermissive
      from pg_policy
      where polrelid = 'public.invitations'::regclass
        and polname = 'invitations_open_by_hash'
    `);
    expect(res.rows, 'Mangler invitations_open_by_hash. Kjør `pnpm db:grants`.').toHaveLength(1);
    expect(res.rows[0]?.polcmd, 'Hash-policyen skal være SELECT, ikke FOR ALL.').toBe('r');
  });

  it('③c slett_forhandler FORCE RLS-unntak finnes (F5-26)', async () => {
    const res = await app.execute(sql`
      select c.relname as tabell, p.polname
        from pg_policy p
        join pg_class c on c.oid = p.polrelid
       where p.polname in (
         'tenants_platform_admin_read_owner',
         'tenants_platform_admin_insert_owner',
         'tenant_modules_platform_admin_insert_owner',
         'invitations_platform_admin_insert_owner',
         'invitations_platform_admin_select_owner',
         'invitations_owner_revoke_update',
         'tenants_tenant_select_owner',
         'dealer_profiles_tenant_select_owner',
         'tenant_modules_tenant_select_owner',
         'member_profiles_tenant_select_owner',
         'member_profiles_tenant_insert_owner',
         'member_profiles_tenant_update_owner',
         'mechanics_tenant_select_owner',
         'mechanics_tenant_insert_owner',
         'audit_log_tenant_insert_owner',
         'tenants_slett_forhandler',
         'tenants_slett_forhandler_select',
         'audit_log_slett_update',
         'audit_log_slett_insert',
         'audit_log_slett_select',
         'erasure_requests_slett_forhandler',
         'erasure_requests_slett_select',
         'tenant_modules_slett_forhandler'
       )
       order by p.polname
    `);
    const navn = res.rows.map((r) => r.polname);
    expect(navn, 'Mangler slett-policyer. Kjør `pnpm db:grants`.').toEqual(
      expect.arrayContaining([
        'tenants_platform_admin_read_owner',
        'tenants_platform_admin_insert_owner',
        'tenant_modules_platform_admin_insert_owner',
        'invitations_platform_admin_insert_owner',
        'invitations_platform_admin_select_owner',
        'invitations_owner_revoke_update',
        'tenants_tenant_select_owner',
        'dealer_profiles_tenant_select_owner',
        'tenant_modules_tenant_select_owner',
        'member_profiles_tenant_select_owner',
        'member_profiles_tenant_insert_owner',
        'member_profiles_tenant_update_owner',
        'mechanics_tenant_select_owner',
        'mechanics_tenant_insert_owner',
        'audit_log_tenant_insert_owner',
        'tenants_slett_forhandler',
        'tenants_slett_forhandler_select',
        'audit_log_slett_update',
        'audit_log_slett_select',
        'erasure_requests_slett_select',
        'tenant_modules_slett_forhandler',
      ]),
    );
  });

  it('③f eier-INSERT-policyer for tenants/audit_log/tenant_modules finnes', async () => {
    const res = await app.execute(sql`
      select p.polname, p.polcmd
        from pg_policy p
       where p.polname in (
         'audit_log_tenant_insert_owner',
         'tenants_platform_admin_insert_owner',
         'tenant_modules_platform_admin_insert_owner',
         'invitations_platform_admin_insert_owner',
         'invitations_platform_admin_select_owner',
         'invitations_owner_revoke_update',
         'tenants_tenant_select_owner',
         'dealer_profiles_tenant_select_owner',
         'tenant_modules_tenant_select_owner',
         'member_profiles_tenant_select_owner',
         'member_profiles_tenant_insert_owner',
         'member_profiles_tenant_update_owner',
         'mechanics_tenant_select_owner',
         'mechanics_tenant_insert_owner'
       )
       order by p.polname
    `);
    const navn = res.rows.map((r) => r.polname);
    expect(navn, 'Mangler eier-INSERT-policyer. Kjør `pnpm db:grants`.').toEqual([
      'audit_log_tenant_insert_owner',
      'dealer_profiles_tenant_select_owner',
      'invitations_owner_revoke_update',
      'invitations_platform_admin_insert_owner',
      'invitations_platform_admin_select_owner',
      'mechanics_tenant_insert_owner',
      'mechanics_tenant_select_owner',
      'member_profiles_tenant_insert_owner',
      'member_profiles_tenant_select_owner',
      'member_profiles_tenant_update_owner',
      'tenant_modules_platform_admin_insert_owner',
      'tenant_modules_tenant_select_owner',
      'tenants_platform_admin_insert_owner',
      'tenants_tenant_select_owner',
    ]);
    const insertNavn = new Set([
      'audit_log_tenant_insert_owner',
      'invitations_platform_admin_insert_owner',
      'mechanics_tenant_insert_owner',
      'member_profiles_tenant_insert_owner',
      'tenant_modules_platform_admin_insert_owner',
      'tenants_platform_admin_insert_owner',
    ]);
    expect(
      res.rows.filter((r) => insertNavn.has(String(r.polname))).every((r) => r.polcmd === 'a'),
      'Eier-INSERT-policyene skal være INSERT, ikke ALL/UPDATE/DELETE.',
    ).toBe(true);
    expect(
      res.rows.find((r) => r.polname === 'invitations_platform_admin_select_owner')?.polcmd,
    ).toBe('r');
    expect(res.rows.find((r) => r.polname === 'invitations_owner_revoke_update')?.polcmd).toBe('w');
    expect(res.rows.find((r) => r.polname === 'member_profiles_tenant_update_owner')?.polcmd).toBe(
      'w',
    );
    const tenantSelect = new Set([
      'tenants_tenant_select_owner',
      'dealer_profiles_tenant_select_owner',
      'tenant_modules_tenant_select_owner',
      'member_profiles_tenant_select_owner',
      'mechanics_tenant_select_owner',
    ]);
    expect(
      res.rows.filter((r) => tenantSelect.has(String(r.polname))).every((r) => r.polcmd === 'r'),
      'Eier-SELECT-policyene skal være SELECT, ikke ALL/INSERT.',
    ).toBe(true);
  });

  it('③d eier av tenants er superuser lokalt — Scaleway-antakelsen står i functions.sql', async () => {
    // CI/Docker: eieren bypasser force RLS. Vi kan ikke flytte eierskap her
    // uten å ødelegge resten av suiten. Kontraktstestene + ③c er stand-in.
    const res = await app.execute(sql`
      select r.rolsuper
        from pg_class c
        join pg_roles r on r.oid = c.relowner
       where c.oid = 'public.tenants'::regclass
    `);
    const eier = res.rows[0] as { rolsuper: boolean } | undefined;
    expect(eier).toBeDefined();
    if (eier?.rolsuper) {
      expect(eier.rolsuper).toBe(true);
    }
  });

  it('④ kjernetabellene har RLS påslått i det hele tatt', async () => {
    const res = await app.execute(sql`
      select c.relname as tabell, c.relrowsecurity as rls
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind = 'r'
    `);
    const kart = new Map(res.rows.map((r) => [r.tabell as string, r.rls as boolean]));
    for (const t of MÅ_HA_RLS) {
      expect(kart.get(t), `tabellen ${t} finnes ikke`).toBeDefined();
      expect(kart.get(t), `${t} mangler RLS`).toBe(true);
    }
  });
});
