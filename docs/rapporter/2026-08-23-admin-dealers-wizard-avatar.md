# Øktrapport — F5-26 / F1-07: admin-forhandlere, eier-veiviser og avatar

## 1. Hva er gjort

**F5-26** (forhandlere + slett + pakkemodell)

- Erstattet to flate addon-lister med `NivaaValg` (radio fra `TIERS`) og `TilleggListe` (kun `TILLEGG` med `status === 'available'` som ikke allerede ligger i valgt nivå).
- Standardnivå Start. Prisene 4 490 / 8 490 / 12 490 urørt. Shop skjult. Twilio skrives i Pro/Enterprise-bundelen, aldri som avkrysning.
- Endwise-tenanten (`slug === 'endwise'`): merke «Endwise», ingen ny invitasjon, ingen slett, ingen pakke-rediger.
- Radhandlinger: Endre (navn/slug/demo, eier-epost vises bare), Endre pakke, Send invitasjon på nytt (kun ubrukt eier-invite), Slett.
- GDPR-slett i to steg (`advarsel` | `bekreft`): slug + 6-sifret kode til innlogget admin. Backend avviser uten gyldig kode og slug. Aldri Endwise, aldri egen tenant.
- `tenants.update`, `tenants.sendSlettKode`, `tenants.slett`, `tenants.pakkeKatalog`. `tenants.plan` persisterer TIERS-nøkkelen.

**F1-07 / F5-26** (`/oppstart`)

- Fire steg, ett kort synlig: Visningsnavn · Avatar · Tillegg · Team.
- Tillegg viser bare valgfrie extras admin åpnet. «Pakken din er {nivå}». Tom: «Ingen valgfrie tillegg. Du kan gå videre.»
- Avatar-steget bruker samme `AvatarVelger` som profil (`seed=user.id`). Hopp over = per navn.
- Lasteskjerm i `CardShell`, ikke naken «Laster oppstarten». Ingen «Mikael» i ingress.
- F1-07 forblir `progress` — Quick-nøkkel-onboarding gjenstår.

**Avatar**

- Ekstrahert til `apps/web/app/(app)/_avatar/avatar-velger.tsx`.
- Fire `Nedtrekk` i `grid-cols-2 lg:grid-cols-4`. Ett åpent om gangen. Åpen liste kan `col-span-full`. Rekkefølge: form → farge → humør → tone.

## 2. Hva gikk galt

Alt gikk som planlagt. Context7 MCP var ikke tilgjengelig (auth); API-ene fulgte eksisterende tRPC/Zod-mønstre i repoet. Invitasjons-godta, OTP-e-postmaler og Bekrefter-spinner er urørt (annet PR).

## 3. Hvilke fikser ble gjort

- `create`/`setModules` tar `tier` + TILLEGG-nøkler og utvider via `utvidPakke` (twilio i Pro, aldri shop).
- `dealer_admin` er fortsatt FORBIDDEN på `tenants.setModules` / `tenants.create`.
- Slett-OTP hashes; `slett_forhandler` er `SECURITY DEFINER` og krever `app.platform_admin`.
- Tester: kan ikke slette Endwise; slett uten slug/kode avvises; extras utelater included/shop/twilio; resend skjult på Endwise.

## 4. Neste fase / neste steg

- F1-07: Quick API-nøkkel i onboarding (envelope-kryptert, testkall før aktivering).
- Ikke merge denne PR-en uten gjennomgang. Ikke ta inn Bekrefter-spinner-arbeidet fra `bc-172b508c`.
