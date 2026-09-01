import { type Database, findRolesForUser } from '@endwise/db';
import { ROLES_REQUIRING_2FA } from './rbac.ts';

/**
 * Håndhevelse av obligatorisk 2FA. **Dette er sikkerhetsgrensen.**
 * Hva som var galt før
 * `ROLES_REQUIRING_2FA` var definert i `rbac.ts` og **brukt null steder**.
 * Better-Auth sin twoFactor-plugin var riktig konfigurert, men den håndhever
 * kun 2FA for brukere som har `twoFactorEnabled = true`. En `dealer_admin` med
 * flagget av logget inn med passord alene og fikk en helt vanlig sesjon.
 * Kravet sto altså i koden som en konstant, ikke som en sperre — og en
 * sikkerhetsregel ingen leser, er ingen sikkerhetsregel.
 * Regelen, i én setning
 * Har brukeren en rolle som krever 2FA, og `twoFactorEnabled` er ikke sann,
 * finnes det ingen autorisert sesjon. Punktum.
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
export function assertTwoFactorSatisfied(input: {
  roles: readonly string[];
  twoFactorEnabled: boolean | null | undefined;
}): void {
  if (input.twoFactorEnabled === true) return;
  const krever = rolesRequiring2FA(input.roles);
  throw new TwoFactorRequiredError(krever.length > 0 ? krever : ['login']);
}

/**
 * Samme avgjørelse, men henter rollene selv.
 * Ser på alle medlemskap, ikke bare den aktive forhandleren. En bruker som
 * er `customer` hos A og `dealer_admin` hos B skal ikke kunne logge inn uten
 * 2FA med A som aktiv og deretter bytte til B. Kravet henger på personen.
 */
export async function assertTwoFactorForUser(
  db: Database,
  userId: string,
  twoFactorEnabled: boolean | null | undefined,
): Promise<void> {
  // Er 2FA allerede på, er svaret ja uansett hvilke roller hen har.
  // Sparer en spørring på hver eneste forespørsel for de fleste brukere.
  if (twoFactorEnabled === true) return;

  const roles = await findRolesForUser(db, userId);
  assertTwoFactorSatisfied({ roles, twoFactorEnabled });
}
