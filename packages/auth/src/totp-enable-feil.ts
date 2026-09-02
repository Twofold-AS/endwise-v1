import { KREDENTIAL_MUTASJON_GENERISK_MELDING } from './bytt-passord.ts';
import { MAGIC_LINK_ENROLL_UTEN_SESJON } from './magic-link.ts';

const GENERISK_LIE = KREDENTIAL_MUTASJON_GENERISK_MELDING;

const ORIGIN = 'Nettleseren stolte ikke på denne adressen. Last siden på nytt og prøv igjen.';
const PASSORDLOS =
  'Innlogging er magic link. Vi trenger ikke passord for å slå på autentikator. Last siden på nytt og prøv igjen.';
const UKJENT = 'Kunne ikke starte autentikator-oppsettet. Last siden på nytt.';

/**
 * Norsk feil for `twoFactor.enable` / `verifyTotp`.
 * Aldri «Kunne ikke bekrefte handlingen.» — den skjulte passord-orakelteksten.
 */
export function norskTotpEnableFeil(input: { code?: string; message?: string }): string {
  const kode = input.code ?? '';
  const melding = input.message ?? '';
  const raw = `${kode} ${melding}`;

  if (/csrf|origin|trusted origin|invalid origin|INVALID_ORIGIN/i.test(raw)) {
    return ORIGIN;
  }
  if (
    /UNAUTHORIZED|session|forbidden|ikke innlogget/i.test(raw) &&
    !/INVALID_PASSWORD|CREDENTIAL/i.test(raw)
  ) {
    return MAGIC_LINK_ENROLL_UTEN_SESJON;
  }
  if (/INVALID_PASSWORD|CREDENTIAL_ACCOUNT_NOT_FOUND|password/i.test(raw)) {
    return PASSORDLOS;
  }
  if (melding === GENERISK_LIE || kode === 'CREDENTIAL_MUTATION_FAILED') {
    return UKJENT;
  }
  if (melding.trim().length > 0 && melding !== GENERISK_LIE) {
    return melding;
  }
  return UKJENT;
}
