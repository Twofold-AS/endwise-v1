# @endwise/framer-plugin

Framer Plugin for Endwise Booking-widgeten (F4-01).

**Status: skjelett (`progress`).** Bygget nå: plugin-manifest (`framer.json`), Vite/React-skall,
og en config-flate der forhandleren limer inn sin **publishable key** (offentlig, `pk_live_…`) +
API-base. Verdiene lagres i Framer plugin storage og mates til Code Component-en (F4-09) som
Property Controls.

**Gjenstår:** ekte pairing-flyt (OTP/QR mot Endwise-admin → automatisk nøkkelutstedelse), Code
File API-synk (F4-11), multi-tenant MCP-server (F4-12), versjonert CDN-runtime (F4-13).

Utvikling: `npm install && npm run dev`, åpne så plugin-en fra Framer-editoren.

Sikkerhet: KUN den offentlige publishable key-en lever her — aldri en hemmelig nøkkel (CWE-798/522).
Origin-validering + kortlevd token håndteres server-side (`/widget/init`).
