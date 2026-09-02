/*
 * 0036 — tøm orphan two_factor_enabled.
 * Gammel e-post-OTP / delvis enable kan sette flagget uten two_factor-rad.
 * Da viser magic-link-verify TOTP-vegg («skriv koden fra appen») uten QR.
 *
 * MÅ kjøres på preview/prod Neon (samme DB). Ikke full seed / db:setup.
 * Hooken i packages/auth/src/magic-link-2fa.ts heler flagget ved runtime
 * hvis denne migrate ikke har kjørt — missed migrate skal ikke låse ute.
 *
 * Nuller IKKE TOTP-hemmeligheter. Sletter IKKE two_factor-rader.
 * 0035 tømmer bare account.password.
 */
UPDATE "user" SET two_factor_enabled = false
WHERE two_factor_enabled = true
  AND id NOT IN (SELECT user_id FROM two_factor);
