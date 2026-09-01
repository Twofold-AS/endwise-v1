/*
 * 0035 — passord ut. Innlogging er magic link + TOTP-app.
 * Tøm credential-hasher så allowPasswordless gjelder (ellers krever
 * Better-Auth fortsatt passord på 2FA enable/disable).
 * Nullstill e-post-OTP-2FA: alle må sette TOTP.
 * Første innlogging etter denne: magic link gir midlertidig sesjon
 * som bare kan fullføre /2fa-oppsett. Etter TOTP er innboks ikke nok.
 */
UPDATE "account" SET "password" = NULL WHERE "password" IS NOT NULL;-- > statement-breakpoint
UPDATE "user" SET "two_factor_enabled" = false WHERE "two_factor_enabled" IS TRUE;-- > statement-breakpoint
DELETE FROM "two_factor";
