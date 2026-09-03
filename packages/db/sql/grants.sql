-- Kjøres etter migrasjoner: `pnpm db:setup` (= db:repair-0020 && db:migrate && db:grants).
-- Siste slett-relaterte migrasjon: 0026_slett_forhandler_kontoer (DROP+CREATE).
-- lookup_open_invitation: CREATE ligger i 0020/0021 + sql/functions.sql (ingen 0027).
-- Scaleway på 0026: `pnpm db:grants` alene gjenoppretter funksjonen (idempotent).
-- 0025 DROP+CREATE + app.slett_endwise_id (policyer her speiler 0025).
-- 0024 CREATE OR replace samme signatur — journal hopper over den som allerede kjørt.
-- 0023_quick_lager la Quick-GUID på parts/stock_locations.

-- Migrasjonen lager tabellene (som eier) og rollen `authenticated`.
-- Her kobles app-brukeren til rollen, og rollen får lov til å prøve å røre
-- tabellene. Hvilke rader den faktisk ser, bestemmes av RLS-policyene.

grant authenticated to endwise_app;

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Framtidige tabeller arver rettighetene.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- Force row level security (F5-28).

-- `enable row level security` gjelder for alle andre enn tabelleieren. Kobler
-- applikasjonen seg til som eier, er RLS usynlig — og det skjer uten en eneste
-- feilmelding. `force` fjerner det unntaket: da gjelder policyene også for eier.

-- Dette er belte og bukseseler. Runtime skal koble til som `endwise_app`
-- (APP_DATABASE_URL), og da hadde `enable` holdt. Men «skal» er en antakelse om
-- konfigurasjon, og en antakelse er ikke en sperre.

-- Migrasjoner kjøres fortsatt som eier. De rører DDL, ikke rader, så force
-- påvirker dem ikke. Seeding som eier gjør den derimot: se scripts/seed.ts.

-- Dynamisk over pg_class, ikke en håndskrevet tabelliste: en ny tabell med
-- `.enableRLS` blir dekket automatisk neste gang `pnpm db:grants` kjøres.
-- Idempotent.
do $$
declare r record;
begin
  for r in
    select c.relname
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relkind = 'r'
      and c.relrowsecurity          -- har enable row level security
      and not c.relforcerowsecurity -- men ikke force ennå
  loop
    execute format('alter table public.%I force row level security', r.relname);
    raise notice '[force-rls] %', r.relname;
  end loop;
end $$;

-- Runtime-rollen må aldri kunne omgå RLS på egen hånd.
-- Krever superuser å sette. Lokalt (Docker) er eieren superuser; hos en managed
-- leverandør (Scaleway) er den
-- det ikke, og der er attributtet uansett aldri satt. Derfor: prøv, og la det
-- gå hvis vi ikke har rettighetene — testen i test/force-rls.test.ts er den som
-- faktisk verifiserer at rollen ikke har bypassrls.
do $$
begin
  execute 'alter role endwise_app nobypassrls';
exception when insufficient_privilege then
  raise notice '[force-rls] mangler rettighet til å sette nobypassrls — verifiseres av testen';
end $$;

-- Hash-oppslag under force RLS

-- SECURITY DEFINER på lookup/consume kjører som eieren. Med force RLS har
-- eieren ingen tenant-policy (den er to authenticated), så uten dette unntaket
-- er hver åpen invitasjon usynlig — prod-404 med samme kropp som «ugyldig
-- token». Policyen slår bare inn når funksjonen har satt `app.invitation_hash`
-- (is_local). Uten guc: 0 rader, også for eieren. Samme mønster som
-- `tenants_platform_admin_read`.

-- To public med vilje: DEFINER-eieren er ikke `authenticated`. To authenticated
-- alene ville latt hullet stå.
drop policy if exists invitations_open_by_hash on invitations;
drop policy if exists invitations_open_by_hash_update on invitations;
create policy invitations_open_by_hash on invitations
  as permissive
  for select
  to public
  using (token_hash = nullif(current_setting('app.invitation_hash', true), ''));
create policy invitations_open_by_hash_update on invitations
  as permissive
  for update
  to public
  using (token_hash = nullif(current_setting('app.invitation_hash', true), ''))
  with check (token_hash = nullif(current_setting('app.invitation_hash', true), ''));

-- Widget-nøkkel under force RLS (samme mønster som invitations_open_by_hash).
-- DEFINER-eieren er ikke authenticated. Uten public-policy: 0 rader i prod.
drop policy if exists widget_keys_lookup_by_pk on widget_keys;
create policy widget_keys_lookup_by_pk on widget_keys
  as permissive
  for select
  to public
  using (
    publishable_key = nullif(current_setting('app.widget_publishable_key', true), '')
  );

-- GDPR-slett under force RLS

-- `slett_forhandler` er SECURITY DEFINER. Med force RLS har eieren ingen
-- tenant-policy (de er to authenticated). Uten dette unntaket er
-- `SELECT slug` 0 rader («finnes ikke») og DELETE på RLS-tabeller 0 rader.

-- To public med vilje: DEFINER kjører som tabelleieren.

-- Rotårsak (Scaleway): `NOT pg_has_role(current_user,
-- 'authenticated', 'member')` matcher aldri eieren. Den som CREATE role
-- authenticated er admin av rollen, så pg_has_role(...) er TRUE. Resultat:
-- tom SELECT på `slug` → «finnes ikke». Permissive OR er ikke et hull
-- `tenants_slett_forhandler_select` er bundet til slett-guc.

-- Predikatet er `current_user IS DISTINCT FROM 'authenticated'` og
-- `… FROM 'endwise_app'`: app-rollen (med eller uten SET role) kan sette
-- Guc-er, men skal ikke bruke eier-policyene. Eieren `endwise` matcher.

drop policy if exists tenants_platform_admin_read_owner on tenants;
create policy tenants_platform_admin_read_owner on tenants
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
  );

-- Vanlig API-INSERT under force RLS (prod APP_DATABASE_URL = eier `endwise`).
-- `tenants_self_isolation` er TO authenticated. Eieren er ikke den rollen,
-- så FORCE RLS nekter INSERT selv når withTenant har satt app.tenant_id
-- til den nye id-en. `tenants_platform_admin_read_owner` er SELECT-only —
-- Mikael så INSERT/UPDATE 0 som eier med begge GUC-er satt.
-- Samme port som read_owner: TO PUBLIC, eier-only, krever platform_admin.
-- withCheck krever også at id matcher app.tenant_id (createTenant setter
-- den til den nye id-en). Ingen UPDATE/DELETE her. App-rollen bruker
-- fortsatt tenants_self_isolation.
drop policy if exists tenants_platform_admin_insert_owner on tenants;
create policy tenants_platform_admin_insert_owner on tenants
  as permissive
  for insert
  to public
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

-- createTenant skriver tenant_modules i samme tx (enterprise/pakke).
-- tenant_modules_tenant_isolation er TO authenticated. Uten eier-INSERT
-- feiler neste statement etter tenants-raden.
drop policy if exists tenant_modules_platform_admin_insert_owner on tenant_modules;
create policy tenant_modules_platform_admin_insert_owner on tenant_modules
  as permissive
  for insert
  to public
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

-- tenants.create kaller opprettEier etter tenants-raden. invitations
-- har FORCE RLS + TO authenticated. Eier-INSERT med tenant-guc (withTenant)
-- eller platform_admin, samme port som audit_log_tenant_insert_owner.
drop policy if exists invitations_platform_admin_insert_owner on invitations;
create policy invitations_platform_admin_insert_owner on invitations
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      or current_setting('app.platform_admin', true) = 'on'
    )
  );

-- INSERT … RETURNING (opprettEier) sjekker også SELECT-policyer.
-- Uten denne: 42501 etter at WITH CHECK passerte (0037).
-- CWE-862/863: TO PUBLIC er leveransen (eier ≠ authenticated). Predikatet
-- er tabelleier + SET LOCAL platform_admin (skrivesti-markør fra
-- opprettEier, ikke sesjons-authz) + eksplisitt tenant_id. Tom/NULL
-- tenant-guc matcher aldri. App-rollen bruker tenant_isolation.
drop policy if exists invitations_platform_admin_select_owner on invitations;
create policy invitations_platform_admin_select_owner on invitations
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitations'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

-- Første 0038-utkast hadde bred eier-UPDATE (alle kolonner). Borte.
drop policy if exists invitations_platform_admin_update_owner on invitations;

-- Eier-revoke under FORCE RLS: app-kode i withTenant (endwiseAdminProcedure),
-- ikke DEFINER og ikke caller-satt GUC som authz. Autorisasjon = current_user
-- er tabelleier og ikke authenticated/endwise_app. Tom tenant avvises
-- eksplisitt. Kolonne-lås er trigger, ikke RLS.
drop policy if exists invitations_revoke_owner_update on invitations;
drop policy if exists invitations_owner_revoke_update on invitations;
create policy invitations_owner_revoke_update on invitations
  as permissive
  for update
  to public
  using (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitations'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  )
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and current_user = (
      select pg_get_userbyid(c.relowner)
        from pg_class c
       where c.oid = 'public.invitations'::regclass
    )
    and nullif(current_setting('app.tenant_id', true), '') is not null
    and tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
  );

drop policy if exists tenants_slett_forhandler_select on tenants;
create policy tenants_slett_forhandler_select on tenants
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );

drop policy if exists tenants_slett_forhandler on tenants;
create policy tenants_slett_forhandler on tenants
  as permissive
  for delete
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );

-- Using: raden som flyttes/redigeres tilhører slett-målet.
-- With check: new.tenant_id er slett-målet (PII-redaksjon) eller
-- Endwise-tenanten (flytt så restrict-fk slipper). Ikke vilkårlig tenant_id.
drop policy if exists audit_log_slett_update on audit_log;
create policy audit_log_slett_update on audit_log
  as permissive
  for update
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  )
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = nullif(current_setting('app.slett_endwise_id', true), '')::uuid
    )
  );

drop policy if exists audit_log_slett_insert on audit_log;
create policy audit_log_slett_insert on audit_log
  as permissive
  for insert
  to public
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = nullif(current_setting('app.slett_endwise_id', true), '')::uuid
    )
  );

-- Vanlig audit-INSERT (set_global, tenant.created/deleted, …) under force RLS.
-- `audit_log_tenant_insert` er TO authenticated. Eieren matcher ikke.
-- `audit_log_slett_insert` krever slett-GUC — dekker ikke API-mutasjoner.
-- Eier-only TO PUBLIC: tenant-guc (withTenant) ELLER platform_admin.
-- Ingen UPDATE/DELETE. Append-only består.
drop policy if exists audit_log_tenant_insert_owner on audit_log;
create policy audit_log_tenant_insert_owner on audit_log
  as permissive
  for insert
  to public
  with check (
    current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.tenant_id', true), '')::uuid
      or current_setting('app.platform_admin', true) = 'on'
    )
  );

drop policy if exists audit_log_slett_select on audit_log;
create policy audit_log_slett_select on audit_log
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = nullif(current_setting('app.slett_endwise_id', true), '')::uuid
    )
  );

drop policy if exists erasure_requests_slett_forhandler on erasure_requests;
create policy erasure_requests_slett_forhandler on erasure_requests
  as permissive
  for update
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  )
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = nullif(current_setting('app.slett_endwise_id', true), '')::uuid
    )
  );

drop policy if exists erasure_requests_slett_select on erasure_requests;
create policy erasure_requests_slett_select on erasure_requests
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = nullif(current_setting('app.slett_endwise_id', true), '')::uuid
    )
  );

-- DELETE på øvrige RLS-tabeller med tenant_id. Dynamisk: nye tabeller dekkes
-- neste `pnpm db:grants`. Hopper over audit_log / erasure_requests / tenants
-- (håndteres over). Tabeller uten RLS (tenant_delete_challenges) trenger
-- ingen policy — GRANT DELETE holder, og å skru på RLS her ville knust OTP.
do $$
declare r record;
begin
  for r in
    select c.relname
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
     where n.nspname = 'public'
       and c.relkind = 'r'
       and c.relrowsecurity
       and a.attname = 'tenant_id'
       and not a.attisdropped
       and c.relname not in ('tenants', 'audit_log', 'erasure_requests')
  loop
    execute format('drop policy if exists %I on public.%I', r.relname || '_slett_forhandler', r.relname);
    execute format('drop policy if exists %I on public.%I', r.relname || '_slett_forhandler_select', r.relname);
    execute format(
      $sql$
        create policy %I on public.%I
          as permissive for delete to public
          using (
            current_setting('app.platform_admin', true) = 'on'
            and current_user is distinct from 'authenticated'
            and current_user is distinct from 'endwise_app'
            and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
          )
      $sql$,
      r.relname || '_slett_forhandler',
      r.relname
    );
    execute format(
      $sql$
        create policy %I on public.%I
          as permissive for select to public
          using (
            current_setting('app.platform_admin', true) = 'on'
            and current_user is distinct from 'authenticated'
            and current_user is distinct from 'endwise_app'
            and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
          )
      $sql$,
      r.relname || '_slett_forhandler_select',
      r.relname
    );
  end loop;
end $$;
