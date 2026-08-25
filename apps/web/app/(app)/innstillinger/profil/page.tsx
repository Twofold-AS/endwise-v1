import { InnstillingerSkall } from '../_skall';

/**
 * Alias for `/innstillinger?fane=profil`. Renderer samme skall slik at
 * bokmerker og plattform-unntaket (`/innstillinger/profil`) overlever.
 */
export default function ProfilPage() {
  return <InnstillingerSkall startFane="profil" />;
}
