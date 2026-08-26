import { InnstillingerSkall } from './_skall';

/**
 * Settings. All konfigurasjon, forankret nederst i sidebaren.
 * hub-kortene er borte. Én flate med liggende pille-faner; aktiv
 * fane vises inne på siden. `?fane=` er kanonisk fane-state.
 * Prinsippet er uendret: konfigurasjon bor her, filtrering og sortering bor på
 * selve sidene.
 */
export default function InnstillingerPage() {
  return <InnstillingerSkall />;
}
