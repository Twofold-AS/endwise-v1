-- Kjøres én gang når Postgres-containeren initialiseres (tomt volum).

-- Speiler prod-oppsettet (Scaleway Managed PostgreSQL): appen kobler seg til
-- med en rolle som ikke eier
-- tabellene, slik at RLS faktisk gjelder for den. Eieren (`endwise`) brukes
-- bare til migrasjoner og seeding — for eieren er RLS usynlig.

-- Merk: rollen `authenticated` opprettes av migrasjonen (Drizzle eier den,
-- se packages/db/src/roles.ts). Her lager vi bare innloggingsbrukeren;
-- koblingen mellom dem skjer i sql/grants.sql etter migrering.

create user endwise_app with password 'endwise_app';

-- pgvector (techstack §2 Database) — tas i bruk fra F6 (embeddings).
create extension if not exists vector;
