/*
 * 0035 — passord ut. Innlogging er magic link + TOTP-app.
 * Tøm credential-hasher så allowPasswordless gjelder.
 * TOTP-rader og two_factor_enabled beholdes: Mons — ikke tving alle
 * gjennom et enroll-vindu der innboks er begge faktorer.
 * Uenrollert (two_factor_enabled=false) → magic link + /2fa-oppsett,
 * gated av TWO_FACTOR_REQUIRED. Enrollert → magic link + TOTP.
 */
UPDATE "account" SET "password" = NULL WHERE "password" IS NOT NULL;
