import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { pgConnectionConfig } from '../src/client.ts';

/** Kjører sql/grants.sql som eier. Idempotent — kan kjøres om igjen. */
const url = process.env.DATABASE_URL;
if (!url)
  throw new Error(
    'DATABASE_URL mangler. Opprett .env (cp .env.example .env) og start DB: `pnpm db:up`.',
  );

const here = dirname(fileURLToPath(import.meta.url));
const grants = readFileSync(join(here, '..', 'sql', 'grants.sql'), 'utf8');
// Redact_audit_log er SECURITY DEFINER og MÅ opprettes av eieren.
const functions = readFileSync(join(here, '..', 'sql', 'functions.sql'), 'utf8');

const pool = new Pool(pgConnectionConfig(url));
await pool.query(grants);
await pool.query(functions);

// pg_get_function_identity_arguments(oid) for slett_forhandler(p_tenant_id uuid)
// returnerer «p_tenant_id uuid», ikke «uuid». Filtrer derfor på navn + prosrc,
// ikke på eksakt identity-streng — godta begge formene.
const rev = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'slett_forhandler'
       and strpos(p.prosrc, 'slett_forhandler_rev=0026') > 0
  ) as ok
`);
if (rev.rows[0]?.ok !== true) {
  const funnet = await pool.query<{ identity: string; snippet: string }>(`
    select pg_get_function_identity_arguments(p.oid) as identity,
           left(p.prosrc, 240) as snippet
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'slett_forhandler'
  `);
  console.error(
    '[db] slett_forhandler er ikke rev 0026 (DROP+CREATE feilet). ' +
      'Kjør `pnpm db:setup` på nytt mot Scaleway-eieren.',
  );
  if (funnet.rows.length === 0) {
    console.error('[db] public.slett_forhandler finnes ikke.');
  } else {
    for (const rad of funnet.rows) {
      console.error(`[db] funnet slett_forhandler(${rad.identity}): ${rad.snippet}`);
    }
  }
  await pool.end();
  process.exit(1);
}

// Samme klasse som slett_forhandler: functions.sql DROP+CREATE, men
// prod hadde 42883 fordi repair-0020 droppet og grants aldri
// fullførte. Exit 1 hvis lookup mangler kolonnene siden velger, eller
// invitation_hash-guc-en (force RLS-unntaket fra pr #11).
const lookup = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'lookup_open_invitation'
       and pg_get_function_identity_arguments(p.oid) in ('text', 'p_token_hash text')
       and strpos(p.prosrc, 'app.invitation_hash') > 0
       and strpos(pg_get_function_result(p.oid), 'id') > 0
       and strpos(pg_get_function_result(p.oid), 'tenant_id') > 0
       and strpos(pg_get_function_result(p.oid), 'email') > 0
       and strpos(pg_get_function_result(p.oid), 'job_function') > 0
       and strpos(pg_get_function_result(p.oid), 'role') > 0
       and strpos(pg_get_function_result(p.oid), 'kind') > 0
       and strpos(pg_get_function_result(p.oid), 'platform_level') > 0
       and strpos(pg_get_function_result(p.oid), 'expires_at') > 0
  ) as ok
`);
if (lookup.rows[0]?.ok !== true) {
  const funnet = await pool.query<{ identity: string; result: string; snippet: string }>(`
    select pg_get_function_identity_arguments(p.oid) as identity,
           pg_get_function_result(p.oid) as result,
           left(p.prosrc, 240) as snippet
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'lookup_open_invitation'
  `);
  console.error(
    '[db] lookup_open_invitation mangler eller har feil kontrakt (DROP+CREATE feilet). ' +
      'Kjør `pnpm db:grants` på nytt mot Scaleway-eieren.',
  );
  if (funnet.rows.length === 0) {
    console.error('[db] public.lookup_open_invitation finnes ikke.');
  } else {
    for (const rad of funnet.rows) {
      console.error(
        `[db] funnet lookup_open_invitation(${rad.identity}) → ${rad.result}: ${rad.snippet}`,
      );
    }
  }
  await pool.end();
  process.exit(1);
}

const widgetLookup = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'lookup_widget_key'
       and pg_get_function_identity_arguments(p.oid) in ('text', 'p_publishable_key text')
       and strpos(p.prosrc, 'app.widget_publishable_key') > 0
  ) as ok
`);
if (widgetLookup.rows[0]?.ok !== true) {
  console.error(
    '[db] lookup_widget_key mangler eller har feil kontrakt (DROP+CREATE feilet). ' +
      'Kjør `pnpm db:grants` på nytt mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const ownerInsert = await pool.query<{ polname: string }>(`
  select p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and p.polname in (
       'audit_log_tenant_insert_owner',
       'tenants_platform_admin_insert_owner',
       'tenant_modules_platform_admin_insert_owner',
       'invitations_platform_admin_insert_owner',
       'invitations_platform_admin_select_owner',
       'invitations_owner_revoke_update',
       'tenants_tenant_select_owner',
       'tenants_tenant_update_owner',
       'dealer_profiles_tenant_select_owner',
       'tenant_modules_tenant_select_owner',
       'tenant_modules_tenant_update_owner',
       'member_profiles_tenant_select_owner',
       'member_profiles_tenant_insert_owner',
       'member_profiles_tenant_update_owner',
       'mechanics_tenant_select_owner',
       'mechanics_tenant_insert_owner',
       'invitations_tenant_select_owner',
       'services_tenant_insert_owner',
       'services_tenant_select_owner',
       'services_tenant_update_owner',
       'service_versions_tenant_insert_owner',
       'service_versions_tenant_select_owner',
       'service_versions_tenant_update_owner'
     )
`);
const ownerNavn = new Set(ownerInsert.rows.map((r) => r.polname));
const manglerEier = [
  'audit_log_tenant_insert_owner',
  'tenants_platform_admin_insert_owner',
  'tenant_modules_platform_admin_insert_owner',
  'invitations_platform_admin_insert_owner',
  'invitations_platform_admin_select_owner',
  'invitations_owner_revoke_update',
  'tenants_tenant_select_owner',
  'tenants_tenant_update_owner',
  'dealer_profiles_tenant_select_owner',
  'tenant_modules_tenant_select_owner',
  'tenant_modules_tenant_update_owner',
  'member_profiles_tenant_select_owner',
  'member_profiles_tenant_insert_owner',
  'member_profiles_tenant_update_owner',
  'mechanics_tenant_select_owner',
  'mechanics_tenant_insert_owner',
  'invitations_tenant_select_owner',
  'services_tenant_insert_owner',
  'services_tenant_select_owner',
  'services_tenant_update_owner',
  'service_versions_tenant_insert_owner',
  'service_versions_tenant_select_owner',
  'service_versions_tenant_update_owner',
].filter((n) => !ownerNavn.has(n));
if (manglerEier.length > 0) {
  console.error(
    '[db] eier-INSERT/SELECT/UPDATE/revoke-policyer under FORCE RLS mangler: ' +
      manglerEier.join(', ') +
      '. Kjør `pnpm db:grants` mot Scaleway-eieren (0037+0038+0039+0040+0041+0042).',
  );
  await pool.end();
  process.exit(1);
}

const immutableFn = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'invitations_immutable_fields'
       and strpos(p.prosrc, 'expires_at') > 0
       and strpos(p.prosrc, 'created_at') > 0
       and strpos(p.prosrc, 'old.revoked_at is null') > 0
       and strpos(p.prosrc, 'old.accepted_at is null') > 0
  ) as ok
`);
if (immutableFn.rows[0]?.ok !== true) {
  console.error(
    '[db] invitations_immutable_fields mangler eller låser ikke utløp/created_at (0038). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const profileGuard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'member_profiles_owner_update_guard'
       and strpos(p.prosrc, 'job_function og updated_at') > 0
       and strpos(p.prosrc, 'new.tenant_id is distinct from old.tenant_id') > 0
       and strpos(p.prosrc, 'new.user_id is distinct from old.user_id') > 0
       and strpos(p.prosrc, 'new.nickname is distinct from old.nickname') > 0
  ) as ok
`);
if (profileGuard.rows[0]?.ok !== true) {
  console.error(
    '[db] member_profiles_owner_update_guard mangler eller låser ikke nickname/PK (0040). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const tenantGuard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'tenants_owner_update_guard'
       and strpos(p.prosrc, 'new.plan is distinct from old.plan') > 0
       and strpos(p.prosrc, 'new.kind is distinct from old.kind') > 0
       and strpos(p.prosrc, 'new.id is distinct from old.id') > 0
       and strpos(p.prosrc, 'new.created_at is distinct from old.created_at') > 0
  ) as ok
`);
if (tenantGuard.rows[0]?.ok !== true) {
  console.error(
    '[db] tenants_owner_update_guard mangler eller låser ikke id/created_at/plan/kind (0041). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const modulesGuard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'tenant_modules_owner_update_guard'
       and strpos(p.prosrc, 'new.tenant_id is distinct from old.tenant_id') > 0
       and strpos(p.prosrc, 'new.module_key is distinct from old.module_key') > 0
  ) as ok
`);
if (modulesGuard.rows[0]?.ok !== true) {
  console.error(
    '[db] tenant_modules_owner_update_guard mangler eller låser ikke PK (0041). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const servicesGuard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'services_owner_update_guard'
       and strpos(p.prosrc, 'eier-UPDATE kan bare sette active') > 0
       and strpos(p.prosrc, 'new.name is distinct from old.name') > 0
       and strpos(p.prosrc, 'new.vehicle_type is distinct from old.vehicle_type') > 0
  ) as ok
`);
if (servicesGuard.rows[0]?.ok !== true) {
  console.error(
    '[db] services_owner_update_guard mangler eller låser ikke identitet (0042). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const versionsGuard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'service_versions_owner_update_guard'
       and strpos(p.prosrc, 'eier-UPDATE kan bare sette valid_to') > 0
       and strpos(p.prosrc, 'new.price_minor is distinct from old.price_minor') > 0
       and strpos(p.prosrc, 'new.valid_from is distinct from old.valid_from') > 0
  ) as ok
`);
if (versionsGuard.rows[0]?.ok !== true) {
  console.error(
    '[db] service_versions_owner_update_guard mangler eller låser ikke historikk (0042). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const p0EierNavn = [
  'customers_tenant_insert_owner',
  'customers_tenant_select_owner',
  'customers_tenant_update_owner',
  'customer_notes_tenant_insert_owner',
  'customer_notes_tenant_select_owner',
  'vehicles_tenant_insert_owner',
  'vehicles_tenant_select_owner',
  'vehicles_tenant_update_owner',
  'bookings_tenant_insert_owner',
  'bookings_tenant_select_owner',
  'bookings_tenant_update_owner',
  'booking_services_tenant_insert_owner',
  'booking_services_tenant_select_owner',
  'skills_tenant_insert_owner',
  'skills_tenant_select_owner',
  'skills_tenant_update_owner',
  'mechanic_skills_tenant_insert_owner',
  'mechanic_skills_tenant_select_owner',
  'mechanic_skills_tenant_update_owner',
  'mechanic_skills_tenant_delete_owner',
  'threads_tenant_insert_owner',
  'threads_tenant_select_owner',
  'threads_tenant_update_owner',
  'thread_participants_tenant_insert_owner',
  'thread_participants_tenant_select_owner',
  'thread_participants_tenant_update_owner',
  'messages_tenant_insert_owner',
  'messages_tenant_select_owner',
  'messages_tenant_update_owner',
  'notifications_tenant_insert_owner',
  'notifications_tenant_select_owner',
  'notifications_tenant_update_owner',
  'parts_tenant_insert_owner',
  'parts_tenant_select_owner',
  'parts_tenant_update_owner',
  'stock_locations_tenant_insert_owner',
  'stock_locations_tenant_select_owner',
  'stock_locations_tenant_update_owner',
  'stock_levels_tenant_insert_owner',
  'stock_levels_tenant_select_owner',
  'stock_levels_tenant_update_owner',
  'stock_movements_tenant_insert_owner',
  'stock_movements_tenant_select_owner',
];
const p0Eier = await pool.query<{ polname: string }>(
  `
  select p.polname
    from pg_policy p
    join pg_class c on c.oid = p.polrelid
    join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public'
     and p.polname = any($1::text[])
`,
  [p0EierNavn],
);
const p0Funnet = new Set(p0Eier.rows.map((r) => r.polname));
const manglerP0 = p0EierNavn.filter((n) => !p0Funnet.has(n));
if (manglerP0.length > 0) {
  console.error(
    '[db] P0 dealer eier-INSERT/SELECT/UPDATE/DELETE under FORCE RLS mangler: ' +
      manglerP0.join(', ') +
      '. Kjør `pnpm db:grants` mot Scaleway-eieren (0043).',
  );
  await pool.end();
  process.exit(1);
}

const p0GuardNavn = [
  'customers_owner_update_guard',
  'vehicles_owner_update_guard',
  'bookings_owner_update_guard',
  'skills_owner_update_guard',
  'mechanic_skills_owner_update_guard',
  'threads_owner_update_guard',
  'thread_participants_owner_update_guard',
  'messages_owner_update_guard',
  'notifications_owner_update_guard',
  'parts_owner_update_guard',
  'stock_locations_owner_update_guard',
  'stock_levels_owner_update_guard',
];
const p0GuardFns = await pool.query<{ proname: string }>(
  `
  select p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname = any($1::text[])
`,
  [p0GuardNavn],
);
const p0GuardFunnet = new Set(p0GuardFns.rows.map((r) => r.proname));
const manglerP0Guard = p0GuardNavn.filter((n) => !p0GuardFunnet.has(n));
if (manglerP0Guard.length > 0) {
  console.error(
    '[db] P0 dealer eier-UPDATE-guard mangler: ' +
      manglerP0Guard.join(', ') +
      '. Kjør `pnpm db:grants` mot Scaleway-eieren (0043).',
  );
  await pool.end();
  process.exit(1);
}

const p0Guard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'customers_owner_update_guard'
       and strpos(p.prosrc, 'eier-UPDATE kan ikke endre id, tenant_id eller created_at') > 0
       and strpos(p.prosrc, 'new.id is distinct from old.id') > 0
  ) as ok
`);
if (p0Guard.rows[0]?.ok !== true) {
  console.error(
    '[db] customers_owner_update_guard mangler eller låser ikke identitet (0043). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const messagesGuard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'messages_owner_update_guard'
       and strpos(p.prosrc, 'eier-UPDATE kan ikke endre meldingstekst eller avsender') > 0
       and strpos(p.prosrc, 'new.body is distinct from old.body') > 0
  ) as ok
`);
if (messagesGuard.rows[0]?.ok !== true) {
  console.error(
    '[db] messages_owner_update_guard mangler eller låser ikke historikk (0043). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

const bookingsGuard = await pool.query<{ ok: boolean }>(`
  select exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname = 'bookings_owner_update_guard'
       and strpos(p.prosrc, 'new.service_version_id is distinct from old.service_version_id') > 0
       and strpos(p.prosrc, 'new.idempotency_key is distinct from old.idempotency_key') > 0
  ) as ok
`);
if (bookingsGuard.rows[0]?.ok !== true) {
  console.error(
    '[db] bookings_owner_update_guard mangler eller låser ikke avtalt versjon (0043). ' +
      'Kjør `pnpm db:grants` mot Scaleway-eieren.',
  );
  await pool.end();
  process.exit(1);
}

await pool.end();
console.info('[db] grants + funksjoner kjørt (lookup_open_invitation + slett_forhandler rev=0026)');
