import { InnstillingerSkall } from '../innstillinger/_skall';

/**
 * F5-04 / F5-19 — TJENESTER & PRISER.
 *
 * Alias for `/innstillinger?fane=tjenester`. Kryssreferansen fra
 * tjenestekatalogen peker hit og lander i fanen.
 */
export default function TjenesterPage() {
  return <InnstillingerSkall startFane="tjenester" />;
}
