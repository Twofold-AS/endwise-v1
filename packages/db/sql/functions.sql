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
  id           uuid,
  tenant_id    uuid,
  email        text,
  job_function text,
  role         text,
  kind         text,
  expires_at   timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.invitation_hash', p_token_hash, true);
  return query
    select i.id, i.tenant_id, i.email, i.job_function::text, i.role, i.kind, i.expires_at
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
