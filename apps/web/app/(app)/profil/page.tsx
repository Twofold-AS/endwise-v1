import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * ⚠️ `/profil` var profilens rute i noen timer 20.08.2026, før den ble flyttet
 * TILBAKE til `/innstillinger/profil` (eiers beslutning: Profil hører hjemme i
 * Settings, og URL-en skal matche plasseringen).
 *
 * ⛔ Retningen er snudd, ikke duplisert. Lot vi den gamle redirecten stå ville
 * `/innstillinger/profil → /profil → /innstillinger/profil` blitt en løkke.
 * Denne fila peker ÉN vei, og den ekte siden ligger under Settings.
 */
export default function ProfilFlyttet() {
  redirect('/innstillinger/profil' as Route);
}
