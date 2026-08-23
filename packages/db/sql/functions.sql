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
-- ⛔ Sletter ikke user-rader (never delete self).
--
-- ── ⚠️ FORCE RLS + eier som IKKE er superuser (Scaleway, 23.08.2026) ────
--
-- Samme klasse som `lookup_open_invitation` (PR #11). SECURITY DEFINER kjører
-- som tabelleieren. Lokalt er Docker-eieren superuser og bypasser RLS, så
-- `SELECT slug` og `DELETE` så grønne ut. I prod er eieren `endwise` uten
-- BYPASSRLS, og FORCE RLS gjelder også eieren. Policyene er `TO authenticated`
-- — eieren er det ikke. Resultat uten unntak:
--   1. `SELECT slug FROM tenants` → 0 rader → raise «finnes ikke»
--      (dette var 500-en på endwise.no 23.08.2026, commit 17ec774).
--   2. DELETE på RLS-tabeller treffer default-deny: 0 rader, STILLE
--      (ikke insufficient_privilege — se tenant-isolation.test.ts).
--   3. `audit_log` og `erasure_requests` har ON DELETE RESTRICT mot tenants.
--      Hard-slett av audit_log er forbudt (F1-06). Uten å flytte kjedene
--      feiler `DELETE FROM tenants` med foreign_key_violation.
--
-- `row_security=off` er IKKE fiksen: den GUC-en kaster hvis en policy VILLE
-- filtrert, den skrur ikke av RLS. Unntaket er samme mønster som
-- `invitations_open_by_hash`: funksjonen setter `app.slett_tenant_id`
-- transaksjons-lokalt, og grants.sql har smale TO PUBLIC-policyer som
-- krever platform_admin + slett-GUC + ikke-authenticated. App-rollen
-- kan sette GUC-er, men `NOT pg_has_role(authenticated)` stenger den.
-- Uten GUC ser eieren fortsatt 0 rader.
--
-- CI kan ikke simulere «FORCE RLS + ikke-superuser eier» uten å flytte
-- eierskap på alle tabeller. Kontraktstestene i
-- apps/api/test/slett-forhandler-sql.test.ts + force-rls.test.ts er stand-in.

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
  i integer;
begin
  if current_setting('app.platform_admin', true) is distinct from 'on' then
    raise exception 'slett_forhandler: krever platform_admin';
  end if;

  -- Transaksjons-lokalt. TO PUBLIC-policyene i grants.sql ser kun DENNE id-en.
  perform set_config('app.slett_tenant_id', p_tenant_id::text, true);

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

  -- F1-06: aldri hard-slett audit_log. Redaktér PII i funksjonen (ikke via
  -- redact_audit_log — den leser app.tenant_id og har ingen UPDATE-policy for
  -- eieren under FORCE RLS), skriv spor, flytt kjeden til Endwise så
  -- ON DELETE RESTRICT slipper tenants-raden.
  update audit_log
     set actor      = '[REDAKTERT]',
         subject_id = '[REDAKTERT]',
         metadata   = jsonb_build_object('redacted', true),
         ip_address = null
   where tenant_id = p_tenant_id
     and actor <> '[REDAKTERT]';
  get diagnostics v_redacted = row_count;

  insert into audit_log (tenant_id, actor, action, subject_type, subject_id, metadata)
  values (
    p_tenant_id,
    'system:erasure',
    'audit.redacted',
    'erasure',
    null,
    jsonb_build_object('rows_redacted', v_redacted, 'reason', 'slett_forhandler')
  );

  update audit_log
     set tenant_id = v_endwise
   where tenant_id = p_tenant_id;

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

  -- Barn først. Looper til FK-rekkefølgen slipper gjennom.
  -- Kun foreign_key_violation svelges — RLS/privilegier skal synes.
  for i in 1..12 loop
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
        if found then
          v_progress := true;
        end if;
      exception when foreign_key_violation then
        null;
      end;
    end loop;
    exit when not v_progress;
  end loop;

  delete from tenant_delete_challenges where tenant_id = p_tenant_id;
  delete from member where organization_id = p_tenant_id::text;
  delete from invitation where organization_id = p_tenant_id::text;
  delete from organization where id = p_tenant_id::text;
  delete from tenants where id = p_tenant_id;

  if exists (select 1 from tenants where id = p_tenant_id) then
    raise exception 'slett_forhandler: tenanten ble ikke slettet';
  end if;

  perform set_config('app.slett_tenant_id', '', true);
end;
$$;

grant execute on function slett_forhandler(uuid) to authenticated;
