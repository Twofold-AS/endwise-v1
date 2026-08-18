/*
 * F1-11 — ⛔ EN PRE-2FA-SESJON SKAL ALDRI OVERLEVE AT 2FA SLÅS PÅ.
 *
 * ── Restrisikoen dette lukker ────────────────────────────────────────────
 * 2FA-gaten sier: «har rollen 2FA-krav og `two_factor_enabled` er sann, har
 * sesjonen vært gjennom koden». Det holdt IKKE for sesjoner opprettet FØR
 * påslaget — de ble plutselig gyldige uten at noen kode var tastet.
 * Oppsettflaten ryddet dem, men bare hvis 2FA ble slått på DER.
 *
 * ── ⚠️ Hvorfor dette må ligge i DATABASEN, ikke i appen ──────────────────
 * Kravet er «uansett hvordan 2FA ble slått på — også direkte i basen». En
 * `UPDATE "user" SET two_factor_enabled = true` kjører ingen applikasjonskode.
 * En trigger er det eneste stedet som ser ALLE veier inn.
 *
 * ── ⚠️ Hvorfor SLETTING og ikke et «gyldig fra»-tidsstempel ──────────────
 * Tidsstempel-varianten var førstevalget, og ble forkastet etter en MÅLING:
 *
 *   `session.created_at` er `timestamp` UTEN tidssone, og node-postgres
 *   skriver den i APPSERVERENS lokale tid. Målt 16.08.2026: en rad skrevet i
 *   samme øyeblikk som `now()` lå 7200 sekunder (2 t) foran `now()`, fordi
 *   databasen står i UTC og Node i CEST.
 *
 * Et tidsstempel satt av SQL (`now()`, UTC) sammenlignet med `created_at`
 * (appserverens klokke) ville derfor vært systematisk skjevt — og skjevheten
 * går FEIL VEI: hver sesjon ville sett «nyere enn grensen» ut, og sperren ville
 * aldri slått til. En sikkerhetssjekk som stilltiende alltid sier ja er verre
 * enn ingen sjekk, fordi den ser ut som om den virker.
 *
 * Sletting har ingen klokke-semantikk i det hele tatt. Raden er borte.
 *
 * ── Hvorfor sesjonen som NETTOPP fullførte 2FA overlever ─────────────────
 * Triggeren fyrer inne i `UPDATE`-setningen som setter flagget. Better-Auth
 * roterer sesjonen i en SENERE setning i samme forespørsel, så den nye raden
 * finnes ikke ennå når triggeren rydder. Verifisert ende-til-ende.
 *
 * ⚠️ Skulle rekkefølgen endre seg i en framtidig Better-Auth-versjon, blir
 * utfallet at brukeren må logge inn én gang til — med kode. Altså: den feiler
 * LUKKET, ikke åpent.
 *
 * Idempotent: `create or replace` + `drop trigger if exists`.
 */

CREATE OR REPLACE FUNCTION endwise_revoke_sessions_on_2fa_enable()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Kun overgangen «ikke på» → «på». NULL teller som ikke på.
  -- Uten denne betingelsen ville ENHVER oppdatering av en 2FA-bruker
  -- (navnebytte, e-postverifisering, Better-Auths egne felt-oppdateringer)
  -- logget vedkommende ut. Det er en driftsfeil, ikke en sikring.
  IF NEW.two_factor_enabled IS TRUE
     AND (OLD.two_factor_enabled IS DISTINCT FROM TRUE) THEN
    DELETE FROM "session" WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint

DROP TRIGGER IF EXISTS endwise_2fa_session_cutoff ON "user";
--> statement-breakpoint

/*
 * AFTER, ikke BEFORE: vi endrer ikke raden, vi rydder etter den. Og AFTER
 * kjører først når oppdateringen faktisk er gjennomført — en rullet tilbake
 * transaksjon skal ikke ha logget noen ut.
 */
CREATE TRIGGER endwise_2fa_session_cutoff
AFTER UPDATE OF two_factor_enabled ON "user"
FOR EACH ROW
EXECUTE FUNCTION endwise_revoke_sessions_on_2fa_enable();
