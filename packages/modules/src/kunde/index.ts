/** F33 / white label F11b — kundeportal handling. */

export {
  byggVarsler,
  formaterKjoretoy,
  JOBB_FASER,
  type JobbFase,
  jobbFase,
  jobbFaseKort,
  jobbFremdriftProsent,
  type KundeVarsel,
  type KundeVarselSlags,
  velgAktivJobb,
} from './fase.ts';
export {
  avgjorBeOmKode,
  type BeOmKodeBeslutning,
  type BeOmKodeGrunn,
  type BeOmKodeSvar,
  beOmKodeSvar,
  KUNDE_KODE_FEIL,
  KUNDE_KODE_FOR_MANGE,
  KUNDE_KODE_SENDT,
  kundeKodeFeilMelding,
  ukjentKundeMelding,
} from './logg-inn-kode.ts';
export {
  finnEllerOpprettKundetrad,
  IngenInnboksMottakerError,
  sendKundeMelding,
} from './melding.ts';
export { KUNDE_MELDING_MAKS, KUNDE_MELDING_PER_MINUTT, rensKundeMelding } from './tekst.ts';

/** F10-03 — shop er blokkert. Kundeflaten selger ikke før det er løst. */
export const KUNDE_BUTIKK_BLOKKERT = true;
export const KUNDE_VIPPS_AKTIV = false;

export function kundeButikkStatus() {
  return {
    apen: false as const,
    grunn: 'shop_blokkert' as const,
    vipps: false as const,
    varer: [] as const,
  };
}
