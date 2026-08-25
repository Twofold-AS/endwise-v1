import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * ⚠️ `/profil` var profilens rute i noen timer 20.08.2026, før den ble flyttet
 * TILBAKE til Settings. Kanonisk URL er nå `/innstillinger?fane=profil`.
 *
 * ⛔ Retningen er én vei. `/innstillinger/profil` renderer samme skall og
 * redirecter ikke hit, så det ikke blir en løkke.
 */
export default function ProfilFlyttet() {
  redirect('/innstillinger?fane=profil' as Route);
}
