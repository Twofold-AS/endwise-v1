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
