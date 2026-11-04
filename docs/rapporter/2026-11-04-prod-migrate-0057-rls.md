# Rapport — 04.11.2026 — Prod-bygg etter #209 (F38-06)

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F38-06 | 0057/0058 seeder under FORCE RLS. `app.platform_admin` + `app.tenant_id` før tenants INSERT/UPDATE. kind/plan via midlertidig disable av eier-trigger. |

## 2. Hva gikk galt

Prod-bygg `dpl_7XYzbrZrpPTpus56CQEUYu28CcvT` (`91c96b6`): 42501 `new row violates row-level security policy for table "tenants"` på `INSERT INTO tenants … 'endwise','platform'`.

Migreringsbrukeren er eier uten BYPASSRLS. `tenants_platform_admin_insert_owner` krever `app.platform_admin=on` og `id = app.tenant_id`. 0057 satte GUC først etter seed. SELECT uten GUC ser ikke `endwise` (`tenants_slug_oppslag` krever `app.slug_sjekk`), så INSERT ble forsøkt og feilet.

## 3. Fikser

- 0057: `platform_admin` først. `tenant_id` før INSERT/UPDATE. kind/plan (låst av trigger) via `DISABLE TRIGGER` bare når nødvendig.
- 0058: `platform_admin` først. user/member har ikke FORCE RLS.
- Kontrakt + RLS-test med ikke-superuser eier-stand-in (`nosuperuser nobypassrls`).
- Lokal Postgres 16: INSERT uten GUC = 42501; med begge GUC = OK. SELECT uten GUC ser 0 rader (EXISTS-hullet). 0057+0058 kjørt som probe-eier i transaksjon og rullet tilbake.

## 4. Neste steg

Hold-rutinen squash-merger når CI er grønn. Ikke merge fra agent. Etter deploy: `[db] vercel-migrate ferdig`, så ny innlogging.

## 5. Hva Mikael må gjøre

Ingen ny env eller DNS. Etter squash-merge: vent på grønt prod-bygg, logg inn på https://platform.endwise.no/logg-inn med ny kode.
