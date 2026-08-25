import { InnstillingerSkall } from '../_skall';

/**
 * F5-19 / F5-33 — «Tjenester & priser» = det forhandleren betaler ENDWISE.
 *
 * Tidligere redirect til `/tjenester`. Nå samme skall som `/innstillinger`
 * med fane `tjenester`, så hubben ikke sender deg vekk.
 *
 * Forhandlerens EGEN tjenestekatalog bor på `/innstillinger/tjenestekatalog`.
 */
export default function TjenesterFanePage() {
  return <InnstillingerSkall startFane="tjenester" />;
}
