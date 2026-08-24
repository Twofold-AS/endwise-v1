-- F14-16 — Den kontrollerte redaksjonen av audit-loggen.
--
-- ── PROBLEMET ───────────────────────────────────────────────────────────────
--
-- `audit_log` er append-only, med vilje: policyene gir INSERT og SELECT, ingen
-- UPDATE, ingen DELETE (F1-06). En kompromittert app-rolle kan skrive historie,
-- men ikke skrive OM den.
--
-- Men art. 17 (rett til sletting) gjelder også audit-loggen. To krav som peker
-- i hver sin retning: loggen skal være uforanderlig, OG personopplysninger i
-- den skal kunne fjernes.
--
-- ── LØSNINGEN ───────────────────────────────────────────────────────────────
--
-- Vi sletter ikke RADEN. Vi REDAKTERER FELTENE som inneholder personopplysninger
-- (`actor`, `subject_id`, `metadata`, `ip_address`), og lar resten stå:
-- tidspunktet, handlingen, tenant. Loggens integritet som hendelseskjede
-- overlever; personen forsvinner ut av den.
--
-- Redaksjonen skjer gjennom denne funksjonen, som:
--   * er SECURITY DEFINER — kjører som EIEREN, ikke som app-rollen. App-rollen
--     får dermed aldri UPDATE-rettighet på audit_log. Den kan bare BE om
--     redaksjon, ikke utføre den.
--   * er tenant-skopet — den leser `app.tenant_id` selv og kan ikke overtales
--     til å redigere en annen forhandlers logg.
--   * skriver et spor av seg selv i `audit_log`, som en helt vanlig, uslettelig
--     rad. **Redaksjonen blir selv en hendelse i loggen den redigerer.**
--
-- Det er forskjellen på «vi slettet fra loggen» og «loggen viser at vi slettet».

create or replace function redact_audit_log(p_subject_id text)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_count  integer;
begin
  -- Tenant hentes fra sesjonsvariabelen — ALDRI fra et argument. Et argument
  -- kunne blitt satt av den som kaller; dette kan det ikke.
  v_tenant := nullif(current_setting('app.tenant_id', true), '')::uuid;
  if v_tenant is null then
    raise exception 'redact_audit_log: ingen tenant-kontekst (app.tenant_id mangler)';
  end if;

  update audit_log
     set actor      = '[REDAKTERT]',
         subject_id = '[REDAKTERT]',
         metadata   = jsonb_build_object('redacted', true),
         ip_address = null
   where tenant_id = v_tenant
     and (subject_id = p_subject_id or actor = p_subject_id)
     and actor <> '[REDAKTERT]';

  get diagnostics v_count = row_count;

  -- Redaksjonen er selv en hendelse. Den skrives inn i loggen den nettopp
  -- redigerte, og DEN raden kan ingen redigere bort.
  insert into audit_log (tenant_id, actor, action, subject_type, subject_id, metadata)
  values (
    v_tenant,
    'system:erasure',
    'audit.redacted',
    'erasure',
    null,
    jsonb_build_object('rows_redacted', v_count)
  );

  return v_count;
end;
$$;

-- App-rollen får LOV til å be om redaksjon — men ikke å gjøre den selv.
-- (Funksjonen kjører som eier; app-rollen har fortsatt ingen UPDATE på audit_log.)
grant execute on function redact_audit_log(text) to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- F1-10 — Invitasjonsoppslag FØR vi vet hvilken forhandler det gjelder.
--
-- ── PROBLEMET ───────────────────────────────────────────────────────────────
--
-- `invitations` har RLS + FORCE RLS, tenant-isolert som alt annet. Det er
-- riktig for lederens liste. Men den som ÅPNER en invitasjonslenke har ingen
-- sesjon og ingen tenant — og `app.tenant_id` er derfor ikke satt.
--
-- Verifisert 16.08.2026: en unscopet `select` som app-rollen returnerer 0 rader.
-- Policyen sammenligner mot `nullif(current_setting('app.tenant_id', true), '')`,
-- som uten kontekst blir NULL, og `tenant_id = NULL` er aldri sant. Uten denne
-- funksjonen ville hver eneste invitasjon sett ut som «ukjent token».
--
-- ── LØSNINGEN ───────────────────────────────────────────────────────────────
--
-- Ett smalt, kontrollert unntak. Funksjonen:
--   * tar HASHEN, aldri tokenet. Kallstedet hasher; databasen ser aldri
--     hemmeligheten, heller ikke i en logget spørring.
--   * returnerer KUN de feltene godta-stien trenger. Ikke e-post til andre
--     invitasjoner, ikke hvem som inviterte, ikke noe å iterere over.
--   * returnerer kun ÅPNE invitasjoner. Utløpt, brukt eller tilbakekalt gir
--     null — avvisningen ligger i SQL-en, ikke i en if-setning noen kan glemme.
--   * kan ikke brukes til å ramse opp noe: uten en gyldig 256-bits hash finnes
--     det ingen inngang. Det er et oppslag, ikke en spørring.
--
-- Den er altså ikke «RLS av» — den er «ett spørsmål, ett svar, og bare hvis du
-- allerede kjenner hemmeligheten».
--
-- ── ⚠️ FORCE RLS + eier som IKKE er superuser (Scaleway, 23.08.2026) ────
--
-- SECURITY DEFINER kjører som tabelleieren. Lokalt er Docker-eieren superuser
-- og bypasser RLS, så testdataen så grønn ut. I prod er eieren `endwise` uten
-- BYPASSRLS, og `FORCE ROW LEVEL SECURITY` (grants.sql) gjelder også eieren.
-- Tenant-policyen er `TO authenticated` og krever `app.tenant_id`. Resultatet
-- uten unntak: 0 rader — samme 404 som et ugyldig token.
--
-- `row_security=off` hjelper ikke: den GUC-en kaster hvis en policy VILLE
-- filtrert, den skrur ikke av RLS. Unntaket er samme mønster som
-- `tenants_platform_admin_read`: en smal policy som slår inn når
-- `app.invitation_hash` er satt (se grants.sql), og funksjonen setter den
-- transaksjons-lokalt FØR den leser. Uten GUC ser eieren fortsatt 0 rader.

drop function if exists lookup_open_invitation(text);

create or replace function lookup_open_invitation(p_token_hash text)
returns table (
  id             uuid,
  tenant_id      uuid,
  email          text,
  job_function   text,
  role           text,
  kind           text,
  platform_level text,
  expires_at     timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.invitation_hash', p_token_hash, true);
  return query
    select i.id, i.tenant_id, i.email, i.job_function::text, i.role, i.kind, i.platform_level, i.expires_at
      from invitations i
     where i.token_hash = p_token_hash
       and i.accepted_at is null
       and i.revoked_at  is null
       and i.expires_at  > now()
     limit 1;
end;
$$;

-- ⛔ Merking av en invitasjon som BRUKT. Samme unntak, samme grunn: den som
-- godtar har ingen tenant-kontekst ennå.
--
-- Engangs-garantien ligger HER, i `where accepted_at is null`. To samtidige
-- forsøk på samme token gir én rad tilbake til den ene og null til den andre —
-- databasen avgjør, ikke rekkefølgen på to HTTP-kall.
create or replace function consume_invitation(p_token_hash text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  perform set_config('app.invitation_hash', p_token_hash, true);
  update invitations
     set accepted_at = now()
   where token_hash = p_token_hash
     and accepted_at is null
     and revoked_at  is null
     and expires_at  > now()
  returning id into v_id;

  return v_id;  -- null = fantes ikke, var brukt, tilbakekalt eller utløpt
end;
$$;

grant execute on function lookup_open_invitation(text) to authenticated;
grant execute on function consume_invitation(text) to authenticated;


-- ═══════════════════════════════════════════════════════════════════════════
-- F5-26 — GDPR-slett av en forhandler. App-rollen kan ikke slette audit_log
-- (append-only) eller tenants-raden mens restrict-FKer lever. Funksjonen
-- kjører som eier, men KREVER at `app.platform_admin` er satt i samme
-- transaksjon — samme GUC som withPlatformAdmin().
--
-- ⛔ Aldri Endwise-tenanten (slug = endwise).
-- Dealer-only "user"-rader SLETTES (prod 24.08.2026: innlogging overlevde
-- forhandlerslett). Beholdes kun ved gjenværende member-rad (annen org,
-- inkl. Endwise). "Never delete self" = acting admin har Endwise-medlemskap
-- — ikke e-post-unntak. Auth-tabeller har INGEN RLS (ADR-002).
--
-- ── ⚠️ FORCE RLS + eier som IKKE er superuser (Scaleway, 23.08.2026) ────
--
-- Samme klasse som `lookup_open_invitation` (PR #11). SECURITY DEFINER kjører
-- som tabelleieren. Lokalt er Docker-eieren superuser og bypasser RLS, så
-- `SELECT slug` og `DELETE` så grønne ut. I prod er eieren `endwise` uten
-- BYPASSRLS, og FORCE RLS gjelder også eieren. Policyene er `TO authenticated`
-- — eieren er det ikke. `NOT pg_has_role(authenticated)` er FEIL predikat:
-- eieren som CREATE ROLE authenticated ER medlem (ADMIN). Resultat uten unntak:
--   1. `SELECT slug FROM tenants` → 0 rader → raise «finnes ikke»
--      (dette var 500-en på endwise.no 23.08.2026, commit 17ec774).
--   2. DELETE på RLS-tabeller treffer default-deny: 0 rader, STILLE
--      (ikke insufficient_privilege — se tenant-isolation.test.ts).
--   3. `audit_log` og `erasure_requests` har ON DELETE RESTRICT mot tenants.
--      Hard-slett av audit_log er forbudt (F1-06). Uten å flytte kjedene
--      feiler `DELETE FROM tenants` med foreign_key_violation.
-- 4. Prod 24.08.2026 (412, SQLSTATE 23503, audit_log_tenant_id_tenants_id_fk):
--      eieren ER ADMIN av `authenticated`, så TO authenticated SELECT gjelder
--      DEFINER. `withPlatformAdmin` setter ikke `app.tenant_id` → SELECT 0
--      rader → UPDATE flytter 0 audit-rader (stille) → INSERT audit.redacted
--      blir værende på forhandleren. FORCE RLS + RESTRICT = 412.
--      Fikset i 0024: sett `app.tenant_id`, TO PUBLIC SELECT-policyer, skriv
--      spor på Endwise, ROW_COUNT etter EXECUTE.
-- 5. Prod 24.08.2026 ETTER `pnpm db:setup` (dpl_98PMuhbM77R4SZJiEPPryVBafJ4X,
--      cdg1, requestId sdwsb-1787599245213-412242917e8b): 412 igjen.
--      0024 var CREATE OR REPLACE samme signatur — drizzle-journal hopper
--      over den som allerede er merket kjørt, så body/policy kan ligge igjen
--      fra før. INSERT/UPDATE WITH CHECK mot Endwise gikk via
--      `select id from tenants where slug = 'endwise'` under tenants-RLS;
--      ny audit-rad etter flytt matcher ikke SELECT som bare ser slett-GUC.
--      0025: DROP FUNCTION + CREATE, `app.slett_endwise_id` (ingen subquery),
--      SELECT ser begge GUCer, EXISTS på gjenværende rader, stacked
--      constraint_name hvis DELETE tenants likevel treffer RESTRICT.
-- 6. Prod 24.08.2026 ETTER 0025: slett lyktes, men dealer-brukere kunne
--      fortsatt logge inn (tomt skall, ingen org/member). 0025 slettet
--      member/invitation/organization, ikke "user" (passordhash, 2FA,
--      passkey, sesjon ble igjen). 0026 sletter dealer-only "user" SCOPET til user_id samlet fra DENNE
--      orgen (`u.id = any (v_org_user_ids)` + NOT EXISTS member i SAMME
--      statement). CASCADE river session/account/two_factor/passkey.
--      Beholdt (annen org, inkl. Endwise): sesjon mot død org fjernes.
--      Ingen global slett av memberless users i funksjonen (CWE-212/359/284).
--      0025-leftovers: engangs-DML i migrasjon 0026 (én gang ved migrate),
--      ikke i funksjonen. verification for de innsamlede e-postene.
--
-- `row_security=off` er IKKE fiksen: den GUC-en kaster hvis en policy VILLE
-- filtrert, den skrur ikke av RLS. Unntaket er samme mønster som
-- `invitations_open_by_hash`: funksjonen setter `app.slett_tenant_id`
-- transaksjons-lokalt, og grants.sql har smale TO PUBLIC-policyer som
-- krever platform_admin + slett-GUC + current_user <> authenticated
-- / endwise_app. `NOT pg_has_role(authenticated)` er FEIL predikat:
-- eieren som CREATE ROLE authenticated ER medlem (ADMIN) → tom SELECT.
-- App-rollen kan sette GUC-er, men matcher ikke eier-policyene.
-- Uten GUC ser eieren fortsatt 0 rader.
--
-- CI kan ikke simulere «FORCE RLS + ikke-superuser eier» uten å flytte
-- eierskap på alle tabeller. Kontraktstestene i
-- apps/api/test/slett-forhandler-sql.test.ts + force-rls.test.ts er stand-in.

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
