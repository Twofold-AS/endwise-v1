import { InnstillingerSkall } from '../innstillinger/_skall';

/**
 * F5-09 / F5-32 — abonnement.
 * Alias for `/innstillinger?fane=abonnement`. Sidebar-lenken `/abonnement`
 * lander i samme skall, så eksisterende href-er fortsetter å virke.
 */
export default function AbonnementPage() {
  return <InnstillingerSkall startFane="abonnement" />;
}
