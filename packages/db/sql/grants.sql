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
