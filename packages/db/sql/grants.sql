-- Kjøres ETTER migrasjoner: `pnpm db:setup` (= db:migrate && db:grants).
--
-- Migrasjonen lager tabellene (som eier) og rollen `authenticated`.
-- Her kobles app-brukeren til rollen, og rollen får lov til å PRØVE å røre
-- tabellene. Hvilke RADER den faktisk ser, bestemmes av RLS-policyene.

grant authenticated to endwise_app;

grant usage on schema public to authenticated;

grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- Framtidige tabeller arver rettighetene.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- ============================================================================
-- FORCE ROW LEVEL SECURITY (07.08.2026, F5-28 ③)
-- ============================================================================
-- `enable row level security` gjelder for ALLE ANDRE ENN TABELLEIEREN. Kobler
-- applikasjonen seg til som eier, er RLS usynlig — og det skjer uten en eneste
-- feilmelding. `force` fjerner det unntaket: da gjelder policyene også for eier.
--
-- Dette er belte og bukseseler. Runtime SKAL koble til som `endwise_app`
-- (APP_DATABASE_URL), og da hadde `enable` holdt. Men «skal» er en antakelse om
-- konfigurasjon, og en antakelse er ikke en sperre.
--
-- Migrasjoner kjøres fortsatt som eier. De rører DDL, ikke rader, så force
-- påvirker dem ikke. Seeding som eier gjør den derimot: se scripts/seed.ts.
--
-- Dynamisk over pg_class, ikke en håndskrevet tabelliste: en ny tabell med
-- `.enableRLS()` blir dekket automatisk neste gang `pnpm db:grants` kjøres.
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

-- Runtime-rollen må ALDRI kunne omgå RLS på egen hånd.
-- Krever superuser å SETTE. Lokalt (Docker) er eieren superuser; hos en managed
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

-- ============================================================================
-- F1-10 — hash-oppslag under FORCE RLS (23.08.2026)
-- ============================================================================
-- SECURITY DEFINER på lookup/consume kjører som eieren. Med FORCE RLS har
-- eieren INGEN tenant-policy (den er TO authenticated), så uten dette unntaket
-- er hver åpen invitasjon usynlig — prod-404 med samme kropp som «ugyldig
-- token». Policyen slår bare inn når funksjonen har satt `app.invitation_hash`
-- (is_local). Uten GUC: 0 rader, også for eieren. Samme mønster som
-- `tenants_platform_admin_read`.
--
-- TO PUBLIC med vilje: DEFINER-eieren er ikke `authenticated`. TO authenticated
-- alene ville latt hullet stå.
drop policy if exists invitations_open_by_hash on invitations;
create policy invitations_open_by_hash on invitations
  as permissive
  for all
  to public
  using (token_hash = nullif(current_setting('app.invitation_hash', true), ''))
  with check (token_hash = nullif(current_setting('app.invitation_hash', true), ''));

-- ============================================================================
-- F5-26 — GDPR-slett under FORCE RLS (23.08.2026)
-- ============================================================================
-- `slett_forhandler` er SECURITY DEFINER. Med FORCE RLS har eieren INGEN
-- tenant-policy (de er TO authenticated). Uten dette unntaket er
-- `SELECT slug` 0 rader («finnes ikke») og DELETE på RLS-tabeller 0 rader.
--
-- TO PUBLIC med vilje: DEFINER-eieren er ikke `authenticated`.
-- Hver slett-policy krever ALLE tre: `app.platform_admin = on`,
-- `app.slett_tenant_id` (funksjonen setter is_local) OG
-- `NOT pg_has_role(authenticated)`. App-rollen kan kalle set_config, så
-- GUC-er alene må ikke åpne slett for vanlig trafikk. `platform_admin`
-- alene åpner fortsatt KUN SELECT på tenants (`tenants_platform_admin_read`).

drop policy if exists tenants_platform_admin_read_owner on tenants;
create policy tenants_platform_admin_read_owner on tenants
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and not pg_has_role(current_user, 'authenticated', 'member')
  );

drop policy if exists tenants_slett_forhandler on tenants;
create policy tenants_slett_forhandler on tenants
  as permissive
  for delete
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and not pg_has_role(current_user, 'authenticated', 'member')
    and id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );

-- USING: raden som flyttes/redigeres tilhører slett-målet.
-- WITH CHECK: NEW.tenant_id er slett-målet (PII-redaksjon) ELLER
-- Endwise-tenanten (flytt så RESTRICT-FK slipper). Ikke vilkårlig tenant_id.
drop policy if exists audit_log_slett_update on audit_log;
create policy audit_log_slett_update on audit_log
  as permissive
  for update
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and not pg_has_role(current_user, 'authenticated', 'member')
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  )
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and not pg_has_role(current_user, 'authenticated', 'member')
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = (select id from tenants where slug = 'endwise')
    )
  );

drop policy if exists audit_log_slett_insert on audit_log;
create policy audit_log_slett_insert on audit_log
  as permissive
  for insert
  to public
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and not pg_has_role(current_user, 'authenticated', 'member')
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );

drop policy if exists erasure_requests_slett_forhandler on erasure_requests;
create policy erasure_requests_slett_forhandler on erasure_requests
  as permissive
  for update
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and not pg_has_role(current_user, 'authenticated', 'member')
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  )
  with check (
    current_setting('app.platform_admin', true) = 'on'
    and not pg_has_role(current_user, 'authenticated', 'member')
    and (
      tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
      or tenant_id = (select id from tenants where slug = 'endwise')
    )
  );

-- DELETE på øvrige RLS-tabeller med tenant_id. Dynamisk: nye tabeller dekkes
-- neste `pnpm db:grants`. Hopper over audit_log / erasure_requests / tenants
-- (håndteres over). Tabeller UTEN RLS (tenant_delete_challenges) trenger
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
    execute format(
      $sql$
        create policy %I on public.%I
          as permissive for delete to public
          using (
            current_setting('app.platform_admin', true) = 'on'
            and not pg_has_role(current_user, 'authenticated', 'member')
            and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
          )
      $sql$,
      r.relname || '_slett_forhandler',
      r.relname
    );
  end loop;
end $$;
