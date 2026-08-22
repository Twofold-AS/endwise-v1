import type { Route } from 'next';
import { redirect } from 'next/navigation';

/**
 * F5-19 / F5-33 — «Tjenester & priser» = det forhandleren betaler ENDWISE.
 * Implementasjonen ligger på `/tjenester`; redirect i stedet for en kopi.
 *
 * ⚠️ **RETTET 20.08.2026:** kommentaren her sa tidligere at ruta var F5-04.
 * Det var feil, og feilen var ikke ufarlig — den er en av grunnene til at
 * F2-05/F5-04 sto som «ikke bygget, må designes» i fire måneder mens noen leste
 * denne linja og trodde katalogen fantes. Forhandlerens EGEN tjenestekatalog
 * bor på `/innstillinger/tjenestekatalog`.
 */
export default function TjenesterRedirect() {
  redirect('/tjenester' as Route);
}
