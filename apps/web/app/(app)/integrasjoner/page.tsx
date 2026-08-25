import { InnstillingerSkall } from '../innstillinger/_skall';

/**
 * F5-19 — INTEGRASJONER (oversikt).
 *
 * Alias for `/innstillinger?fane=integrasjoner`. Undersider
 * (`/integrasjoner/quick` osv.) er uendret — oppsettet bor der.
 */
export default function IntegrasjonerPage() {
  return <InnstillingerSkall startFane="integrasjoner" />;
}
