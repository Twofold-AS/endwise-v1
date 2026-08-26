/*
 * 0024 — slett_forhandler: SELECT under force RLS + ROW_COUNT på barn.
 * Prod : POST /trpc/tenants.slett → HTTP 412,
 * Sqlstate 23503, constraint audit_log_tenant_id_tenants_id_fk.
 * Eieren er admin av authenticated, så to authenticated SELECT gjelder
 * DEFINER. Uten app.tenant_id / to public SELECT ser UPDATE 0 rader.
 * INSERT audit.redacted ble værende på forhandleren (restrict).
 * Execute setter ikke found — barn-løkka (parts/stock/customers) hoppet.
 * CREATE OR replace (samme signatur) — ingen DROP.
 * Idempotent. Etter merge: `pnpm db:setup` (migrate + grants).
 */
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
      or tenant_id = (select id from tenants where slug = 'endwise')
    )
  );-- > statement-breakpoint

drop policy if exists audit_log_slett_select on audit_log;
create policy audit_log_slett_select on audit_log
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );-- > statement-breakpoint

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
      or tenant_id = (select id from tenants where slug = 'endwise')
    )
  );-- > statement-breakpoint

drop policy if exists erasure_requests_slett_select on erasure_requests;
create policy erasure_requests_slett_select on erasure_requests
  as permissive
  for select
  to public
  using (
    current_setting('app.platform_admin', true) = 'on'
    and current_user is distinct from 'authenticated'
    and current_user is distinct from 'endwise_app'
    and tenant_id = nullif(current_setting('app.slett_tenant_id', true), '')::uuid
  );-- > statement-breakpoint

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
end $$;-- > statement-breakpoint

create or replace function slett_forhandler(p_tenant_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_slug text;
  v_endwise uuid;
  v_redacted integer;
  v_progress boolean;
  v_count integer;
  v_left text;
  i integer;
begin
  if current_setting('app.platform_admin', true) is distinct from 'on' then
    raise exception 'slett_forhandler: krever platform_admin';
  end if;

  -- Transaksjons-lokalt. To public-policyene i grants.sql ser kun denne id-en.
  -- app.tenant_id også: eieren er admin av authenticated, så to authenticated
  -- SELECT gjelder DEFINER. Uten tenant-guc ser UPDATE 0 rader.
  perform set_config('app.slett_tenant_id', p_tenant_id::text, true);
  perform set_config('app.tenant_id', p_tenant_id::text, true);

  select slug into v_slug from tenants where id = p_tenant_id;
  if v_slug is null then
    raise exception 'slett_forhandler: finnes ikke';
  end if;
  if v_slug = 'endwise' then
    raise exception 'slett_forhandler: kan ikke slette Endwise-tenanten';
  end if;

  select id into v_endwise from tenants where slug = 'endwise';
  if v_endwise is null then
    raise exception 'slett_forhandler: Endwise-tenanten mangler (kan ikke flytte audit-kjeden)';
  end if;

  -- Aldri hard-slett audit_log. Redaktér PII i funksjonen (ikke via
  -- redact_audit_log — den leser app.tenant_id og har ingen UPDATE-policy for
  -- eieren under force RLS), flytt kjeden til Endwise så on DELETE restrict
  -- slipper tenants-raden, skriv spor PÅ Endwise (ikke på slett-målet).
  update audit_log
     set actor      = '[REDAKTERT]',
         subject_id = '[REDAKTERT]',
         metadata   = jsonb_build_object('redacted', true),
         ip_address = null
   where tenant_id = p_tenant_id
     and actor <> '[REDAKTERT]';
  get diagnostics v_redacted = row_count;

  update audit_log
     set tenant_id = v_endwise
   where tenant_id = p_tenant_id;

  insert into audit_log (tenant_id, actor, action, subject_type, subject_id, metadata)
  values (
    v_endwise,
    'system:erasure',
    'audit.redacted',
    'erasure',
    null,
    jsonb_build_object('rows_redacted', v_redacted, 'reason', 'slett_forhandler')
  );

  -- Erasure_requests slettes aldri (art. 5(2)-beviset må overleve
  -- forhandlerslett). Samme on DELETE restrict mot tenants.
  -- CWE-359/863/284: flytt til Endwise, roter id, hash identifikatorene.
  -- Ingen server-pepper i repoet. md5 er deterministisk og rainbow-bart;
  -- sha256(verdi || slettet tenant_id) er ikke-reversibel og tenant-bundet.
  -- Rå ID-er lagres ikke etter flytt. requestId strippes fra report.
  update erasure_requests
     set id           = gen_random_uuid(),
         tenant_id    = v_endwise,
         subject_id   = encode(sha256(convert_to(subject_id || p_tenant_id::text, 'UTF8')), 'hex'),
         requested_by = encode(sha256(convert_to(requested_by || p_tenant_id::text, 'UTF8')), 'hex'),
         report       = (coalesce(report, '{}'::jsonb) - 'requestId')
                        || jsonb_build_object(
                             'relocated', true,
                             'reason', 'slett_forhandler',
                             'request_id_rotated', true
                           )
   where tenant_id = p_tenant_id;

  if exists (select 1 from audit_log where tenant_id = p_tenant_id) then
    raise exception 'slett_forhandler: gjenværende koblinger i audit_log'
      using errcode = '23503';
  end if;
  if exists (select 1 from erasure_requests where tenant_id = p_tenant_id) then
    raise exception 'slett_forhandler: gjenværende koblinger i erasure_requests'
      using errcode = '23503';
  end if;

  -- Barn først (parts/stock_levels/customers inkludert). Looper til
  -- FK-rekkefølgen slipper gjennom. Execute setter ikke found — ROW_COUNT.
  -- Kun foreign_key_violation svelges i runden — RLS/privilegier skal synes.
  for i in 1..24 loop
    v_progress := false;
    for r in
      select c.relname as tbl
        from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
        join pg_attribute a on a.attrelid = c.oid
       where n.nspname = 'public'
         and c.relkind = 'r'
         and a.attname = 'tenant_id'
         and not a.attisdropped
         and c.relname not in ('tenants', 'audit_log', 'erasure_requests')
    loop
      begin
        execute format('delete from %I where tenant_id = $1', r.tbl) using p_tenant_id;
        get diagnostics v_count = row_count;
        if v_count > 0 then
          v_progress := true;
        end if;
      exception when foreign_key_violation then
        null;
      end;
    end loop;
    exit when not v_progress;
  end loop;

  v_left := '';
  for r in
    select c.relname as tbl
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = c.oid
     where n.nspname = 'public'
       and c.relkind = 'r'
       and a.attname = 'tenant_id'
       and not a.attisdropped
       and c.relname not in ('tenants', 'audit_log', 'erasure_requests')
  loop
    begin
      execute format('delete from %I where tenant_id = $1', r.tbl) using p_tenant_id;
    exception when foreign_key_violation then
      v_left := v_left || r.tbl || ', ';
    end;
  end loop;
  if v_left <> '' then
    raise exception 'slett_forhandler: gjenværende koblinger i %', rtrim(v_left, ', ')
      using errcode = '23503';
  end if;

  delete from tenant_delete_challenges where tenant_id = p_tenant_id;
  delete from member where organization_id = p_tenant_id::text;
  delete from invitation where organization_id = p_tenant_id::text;
  delete from organization where id = p_tenant_id::text;
  delete from tenants where id = p_tenant_id;

  if exists (select 1 from tenants where id = p_tenant_id) then
    raise exception 'slett_forhandler: tenanten ble ikke slettet';
  end if;

  perform set_config('app.slett_tenant_id', '', true);
  perform set_config('app.tenant_id', '', true);
end;
$$;
