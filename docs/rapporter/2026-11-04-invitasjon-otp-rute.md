# Rapport — F38-08 invitasjons-OTP (prod «Velkommen til Bergen»)

## Hva er gjort
- **F38-08:** Rotårsak: `POST /invitasjoner/:token/send-kode` hadde ingen Next-rute. Bare GET på `[token]/route.ts`. Hono-handleren ble aldri truffet. `fetch` kaster ikke på 404, så UI sa «Kode sendt til …».
- Prod-logger (F40-deploy `dpl_2UCi1Py9s4pFTGgxFL8JuZMnvq9T`): GET `/invitasjoner/:token` 200. Ingen POST send-kode. POST `/godta` 410 (egen rute).
- Ny rute `invitasjoner/[token]/send-kode/route.ts`. Svar `{ sendt: true }` bare etter Resend-id. Feil vises. Kode er 6 siffer. FeltInput, numerisk tastatur, `autocomplete=one-time-code`.

## Hva gikk galt
- F38-07 la til auto-send i UI, men glemte Next-ruta. Ingen env/DNS-endring kreves: `RESEND_API_KEY` og `RESEND_FROM` finnes; sendingen ble aldri kalt.

## Fikser
- Next POST-rute. Ærlig `sendt`. Logg `[invitasjon] kode sendt` med Resend-id.
- FeltInput uten kort-chrome.

## Neste
- Verifiser i prod at Resend-id lander i runtime-logg og e-post kommer fram (hotmail-søppel).
- Ikke merge.
