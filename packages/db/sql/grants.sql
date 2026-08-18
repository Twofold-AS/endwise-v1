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
