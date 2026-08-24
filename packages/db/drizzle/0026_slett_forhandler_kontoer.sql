/*
 * 0026 — slett_forhandler: slett dealer-only Better-Auth-kontoer.
 *
 * Prod 24.08.2026 ETTER 0025: tenants.slett / slett_forhandler lyktes
 * (412/RLS fikset). Dealer-brukere kunne likevel logge inn — tomt skall,
 * ingen org/member. 0025 slettet member/invitation/organization, ikke
 * "user" (passordhash, 2FA, passkey, sesjon ble igjen).
 *
 * Historisk kommentar «Sletter ikke user-rader (never delete self)»
 * vernet acting platform-admin og Endwise-brukere, IKKE dealer-ansatte.
 *
 * DROP FUNCTION først (samme mønster som 0025). Policyer urørt (0025
 * app.slett_endwise_id + FORCE RLS beholdes). Auth-tabeller har INGEN
 * RLS (ADR-002) — ikke legg til; DEFINER kan slette uten slett-GUC.
 *
 * Funksjonen sletter KUN user_id samlet fra DENNE orgen
 * (`u.id = any (v_org_user_ids)` + NOT EXISTS member i samme statement).
 * Ingen global slett av memberless users i funksjonen (CWE-212/359/284).
 *
 * Engangs-reparasjon (0025-leftovers i prod): DML nederst i DENNE
 * migrasjonen, én gang som eier ved migrate — ikke i slett_forhandler.
 * Konservativt: kun "user" uten member-rad.
 * Etter db:setup: loggen MÅ si slett_forhandler rev=0026.
 * audit_log hard-slettes aldri. Endwise-tenant og Endwise-brukere slettes aldri.
 */

drop function if exists slett_forhandler(uuid);

create function slett_forhandler(p_tenant_id uuid)
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
  v_exists boolean;
  v_name text;
  v_constraint text;
  v_tbl_err text;
  i integer;
  v_org_user_ids text[];
begin
  -- slett_forhandler_rev=0026
  if current_setting('app.platform_admin', true) is distinct from 'on' then
    raise exception 'slett_forhandler: krever platform_admin';
  end if;

  -- Transaksjons-lokalt. TO PUBLIC-policyene i grants.sql ser kun DENNE id-en.
  -- app.tenant_id også: eieren er ADMIN av authenticated, så TO authenticated
  -- SELECT gjelder DEFINER. Uten tenant-GUC ser UPDATE 0 rader.
  -- app.slett_endwise_id: WITH CHECK/INSERT/SELECT etter flytt, uten subquery
  -- mot tenants (RLS på slug='endwise' kan gi NULL → 42501 eller stille 0).
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
  perform set_config('app.slett_endwise_id', v_endwise::text, true);

  -- F1-06: aldri hard-slett audit_log. Redaktér PII i funksjonen (ikke via
  -- redact_audit_log — den leser app.tenant_id og har ingen UPDATE-policy for
  -- eieren under FORCE RLS), flytt kjeden til Endwise så ON DELETE RESTRICT
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

  -- F14-16: erasure_requests slettes ALDRI (art. 5(2)-beviset må overleve
  -- forhandlerslett). Samme ON DELETE RESTRICT mot tenants.
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

  -- Barn først (parts/stock_levels/customers inkludert). Kjent FK-rekkefølge
  -- før den dynamiske løkka. EXECUTE setter ikke FOUND — ROW_COUNT.
  -- Kun foreign_key_violation / undefined_table svelges i runden.
  foreach v_name in array array[
    'stock_movements', 'stock_levels', 'parts', 'stock_locations',
    'messages', 'thread_participants', 'threads', 'stream_events', 'notifications',
    'customer_notes', 'bookings', 'vehicles', 'customers',
    'mechanic_skills', 'mechanics', 'skills', 'service_versions', 'services',
    'member_profiles', 'invitations', 'widget_keys', 'integration_config',
    'sync_conflicts', 'tenant_modules', 'billing_customers', 'feature_flag_overrides'
  ] loop
    begin
      execute format('delete from %I where tenant_id = $1', v_name) using p_tenant_id;
    exception
      when undefined_table then null;
      when foreign_key_violation then null;
    end;
  end loop;

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
      null;
    end;
    execute format('select exists (select 1 from %I where tenant_id = $1)', r.tbl)
      into v_exists using p_tenant_id;
    if v_exists then
      v_left := v_left || r.tbl || ', ';
    end if;
  end loop;
  if v_left <> '' then
    raise exception 'slett_forhandler: gjenværende koblinger i %', rtrim(v_left, ', ')
      using errcode = '23503';
  end if;

  -- Samle forhandlerens brukere FØR member-slett. Dealer-only kontoer
  -- skal dø med forhandleren. "Never delete self" verner acting admin
  -- og Endwise-brukere — de har member-rad i Endwise-org og beholdes.
  v_org_user_ids := array(
    select distinct m.user_id
      from member m
     where m.organization_id = p_tenant_id::text
  );

  delete from tenant_delete_challenges where tenant_id = p_tenant_id;
  delete from member where organization_id = p_tenant_id::text;
  delete from invitation where organization_id = p_tenant_id::text;
  delete from organization where id = p_tenant_id::text;

  -- Dealer-only: SCOPET til innsamlede id-er. Samme statement krever
  -- NOT EXISTS member (Endwise-/tverr-org beholdes — de har member-rad).
  -- CWE-212/359/284: ALDRI globalt «slett alle uten member» her.
  -- Auth-tabellene har INGEN RLS (ADR-002); DEFINER kan slette uten slett-GUC.
  delete from verification v
   using "user" u
   where v.identifier = u.email
     and u.id = any (v_org_user_ids)
     and not exists (select 1 from member m where m.user_id = u.id)
     and not exists (
       select 1 from member m
        where m.user_id = u.id
          and m.organization_id = v_endwise::text
     );

  delete from "user" u
   where u.id = any (v_org_user_ids)
     and not exists (select 1 from member m where m.user_id = u.id)
     and not exists (
       select 1 from member m
        where m.user_id = u.id
          and m.organization_id = v_endwise::text
     );

  -- Beholdte brukere kan fortsatt ha sesjon mot død org.
  delete from session where active_organization_id = p_tenant_id::text;

  if exists (select 1 from member where organization_id = p_tenant_id::text) then
    raise exception 'slett_forhandler: gjenværende koblinger i member'
      using errcode = '23503';
  end if;
  if exists (select 1 from invitation where organization_id = p_tenant_id::text) then
    raise exception 'slett_forhandler: gjenværende koblinger i invitation'
      using errcode = '23503';
  end if;
  if exists (select 1 from organization where id = p_tenant_id::text) then
    raise exception 'slett_forhandler: gjenværende koblinger i organization'
      using errcode = '23503';
  end if;
  if exists (select 1 from session where active_organization_id = p_tenant_id::text) then
    raise exception 'slett_forhandler: gjenværende koblinger i session'
      using errcode = '23503';
  end if;

  begin
    delete from tenants where id = p_tenant_id;
  exception when foreign_key_violation then
    get stacked diagnostics v_constraint = constraint_name, v_tbl_err = table_name;
    raise exception 'slett_forhandler: gjenværende koblinger i %',
      coalesce(nullif(v_tbl_err, ''), v_constraint)
      using errcode = '23503';
  end;

  if exists (select 1 from tenants where id = p_tenant_id) then
    raise exception 'slett_forhandler: tenanten ble ikke slettet';
  end if;

  perform set_config('app.slett_tenant_id', '', true);
  perform set_config('app.slett_endwise_id', '', true);
  perform set_config('app.tenant_id', '', true);
end;
$$;

grant execute on function slett_forhandler(uuid) to authenticated;

--> statement-breakpoint

-- Engangs-reparasjon (prod 24.08.2026): 0025 slettet forhandler uten "user".
-- Kjører ÉN gang ved migrate som eier — ikke i slett_forhandler (CWE-212/359/284).
-- Konservativt: kun "user" uten member-rad. CASCADE river session/account/
-- two_factor/passkey. verification har ingen user-FK.
delete from verification v
 using "user" u
 where v.identifier = u.email
   and not exists (select 1 from member m where m.user_id = u.id);

delete from "user" u
 where not exists (select 1 from member m where m.user_id = u.id);
