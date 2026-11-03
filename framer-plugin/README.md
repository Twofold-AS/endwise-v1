# @endwise/framer-plugin

**Tillegg, ikke kjerne.** Kundesiden (`<slug>.endwise.no`) er hele løsningen for
booking, meldinger og profil. Framer-pluginen er et valgfritt embed på
forhandlerens egen nettside. Widgeten henter forhandlerens publiserte merke
(navn, farge, logo) fra `/widget/init` — samme merke som kundesiden.

Framer Plugin for Endwise Booking-widgeten (F4-01, merket tillegg i F37 / plan F14).

**Status: skjelett (`progress`), merket tillegg.** Bygget nå: plugin-manifest
(`framer.json`), Vite/React-skall, config-flate der forhandleren limer inn sin
**publishable key** (offentlig, `pk_live_…`) + API-base. Verdiene lagres i Framer
plugin storage. Branding kommer fra Endwise, ikke fra Framer-tweaks.

**Gjenstår:** ekte pairing-flyt (OTP/QR mot Endwise-admin → automatisk
nøkkelutstedelse), Code File API-synk (F4-11), multi-tenant MCP-server (F4-12),
versjonert CDN-runtime (F4-13). Booking-flyten i widgeten er uendret.

Utvikling: `npm install && npm run dev`, åpne så plugin-en fra Framer-editoren.

Sikkerhet: KUN den offentlige publishable key-en lever her — aldri en hemmelig
nøkkel (CWE-798/522). Origin-validering + kortlevd token håndteres server-side
(`/widget/init`). ⛔ `#0066ff` på CTA.
