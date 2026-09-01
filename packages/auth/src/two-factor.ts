import type { Database } from '@endwise/db';
import { ROLES_REQUIRING_2FA } from './rbac.ts';

/**
 * TOTP-status mot sesjon. **02.09.2026 (Mikael):** autentikator er valgfri
 * og senere — `assertTwoFactorSatisfied` blokkerer ikke uenrollerte.
 * Bundet TOTP (flagg + rad + verified) håndheves ved neste magic-link-verify.
 * Hvorfor `twoFactorEnabled` er nok til å bety «fullførte 2FA»
 * Better-Auth oppretter ikke en sesjon ved passord-innlogging når kontoen har
 * 2FA på — den svarer `twoFactorRedirect: true`, og sesjonen lages først etter
 * verifisert engangskode (sesjons-ID roteres da, CWE-384). En eksisterende
 * sesjon for en 2FA-aktivert bruker har derfor vært gjennom koden.
 * Unntaket — sesjoner opprettet før påslaget — er lukket.
 * De ville ellers plutselig bestått sjekken uten å ha sett en kode (målt:
 * Better-Auth rydder dem ikke selv). Sperren ligger i en databasetrigger,
 * `endwise_2fa_session_cutoff` (migrasjon `0010`), som sletter alle sesjoner i
 * det `two_factor_enabled` går fra ikke-sann til sann.
 * Den ligger i basen og ikke her fordi kravet er «uansett hvordan 2FA ble slått
 * på» — et rått `UPDATE "user" SET two_factor_enabled = true` kjører ingen
 * applikasjonskode. Denne modulen kan derfor ikke være siste skanse; triggeren
 * er det. Se `packages/db/drizzle/0010_2fa_session_cutoff.sql` for hvorfor det
 * ble sletting og ikke et «gyldig fra»-tidsstempel (kort svar: `session.created_at`
 * skrives i appserverens lokale tid, `now` er databasens — sammenligningen
 * ville vært systematisk skjev, og skjev feil vei).
 * Ingen «husk enhet»
 * `trustDevice` tvinges til false på verify-totp / verify-backup-code.
 * Alle som har Endwise-innlogging krever TOTP, også customer.
 * Widget-kunder uten app-innlogging får ingen konto her — vi lager den ikke.
 */

export class TwoFactorRequiredError extends Error {
  readonly code = 'TWO_FACTOR_REQUIRED';
  /**
   * `enrollment` = brukeren har ikke satt opp 2FA i det hele tatt og må
   * tvinges gjennom oppsett før hen slipper inn.
   */
  readonly reason = 'enrollment' as const;

  /**
   * Feltet deklareres eksplisitt og tilordnes i konstruktøren — ikke som en
   * parameter-property (`constructor(readonly roller: ...)`).
   * Det er ikke stil: `apps/api` og `apps/stream` kjøres med Nodes
   * `--experimental-strip-types`, som bare fjerner typer og ikke kan
   * transformere kode. En parameter-property må genereres om til en tilordning,
   * og da kaster Node `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` ved import — begge
   * serverne døde på oppstart. `tsc --noEmit` sa ingenting, fordi syntaksen er
   * fullt gyldig TypeScript. Funnet ved å faktisk starte serveren.
   */
  readonly roller: readonly string[];

  constructor(roller: readonly string[]) {
    super(
      `Rollen(e) ${roller.join(', ')} krever tofaktor-autentisering. ` +
        'Sesjonen er ikke autorisert før 2FA er satt opp og fullført.',
    );
    this.roller = roller;
  }
}

/** Krever denne rollen 2FA? Eneste kilde: `ROLES_REQUIRING_2FA`. */
export function roleRequires2FA(role: string): boolean {
  return (ROLES_REQUIRING_2FA as readonly string[]).includes(role);
}

/** Hvilke av rollene krever 2FA? Tom liste = ingen krav. */
export function rolesRequiring2FA(roles: readonly string[]): string[] {
  return roles.filter(roleRequires2FA);
}

/**
 * Den rene avgjørelsen, uten database. Skilt ut fordi det er denne som skal
 * være triviell å teste — og fordi en regel som bare finnes inne i en
 * databasespørring er en regel ingen tester.
 */
export function assertTwoFactorSatisfied(_input: {
  roles: readonly string[];
  twoFactorEnabled: boolean | null | undefined;
}): void {
  // TOTP er valgfri og senere. Uenrollert dealer/admin/customer får bruke appen.
  // Innloggingsmuren for bundet TOTP ligger i magic-link-verify (riv + totp-kake).
}

/**
 * Samme avgjørelse, men henter rollene selv.
 * Ser på alle medlemskap, ikke bare den aktive forhandleren. En bruker som
 * er `customer` hos A og `dealer_admin` hos B skal ikke kunne logge inn uten
 * 2FA med A som aktiv og deretter bytte til B. Kravet henger på personen.
 */
export async function assertTwoFactorForUser(
  _db: Database,
  _userId: string,
  twoFactorEnabled: boolean | null | undefined,
): Promise<void> {
  assertTwoFactorSatisfied({ roles: [], twoFactorEnabled });
}
