# Øktrapport — F1-07: Quick-probe i nettleseren (dealer-IP)

24.08.2026 · F1-07

## 1. Hva er gjort

**F1-07** — live GET `client/info` flyttet fra Vercel-funksjonen til forhandlerens nettleser.

- Verifisert mot Quick: `OPTIONS`/`GET` mot `q3.quick.no` gir `Access-Control-Allow-Origin: *` og `Access-Control-Allow-Headers: Content-Type, Authorization`. Browser→Quick er tillatt.
- `apps/web` + `apps/api` ligger på Vercel fra1 (`/trpc` er Next route handler). Ingen Scaleway-hop for API. CORS var eneste vei av fra1.
- `/integrasjoner/quick` og `/oppstart` kjører GET med `Authorization: Token token=…` og `Accept: application/json` fra nettleseren. User-Agent settes ikke (forbidden header; ikke i CORS allow-headers).
- `setConfig` og `onboarding.fullfor` persisterer **etter** vellykket nettleser-probe og sender **ikke** tokenet til Quick fra Vercel. Feilet probe kaller ikke persist.
- Residual `testConnection` (lagret nøkkel, tomt felt) er fortsatt server-GET. HTTP 500 mappes ikke som ugyldig nøkkel. Ingen Vercel/allowlist-tekst i klientfeil.
- Ingen shop, ingen Admin-tab, norsk UI.

Roadmap F1-07 forblir `progress` (mekanikere på tvers gjenstår).

## 2. Hva gikk galt

Alt gikk som planlagt. Context7 MCP krevde innlogging og ble ikke brukt. CORS ble verifisert med `curl` OPTIONS/GET mot Quick (uten token — 401 med CORS-headers). Ingen ekte ApiV2-nøkkel i tester eller logger.

## 3. Hvilke fikser ble gjort

- `@endwise/toolkit-quick/browser` — klientinngang uten `client.ts`.
- `includeUserAgent: false` i nettleser-proben.
- `persistAfterBrowserQuickProbe` — persist kalles ikke ved feilet GET.
- TypeError/Failed to fetch → «Nådde ikke Quick», ikke nøkkelavvisning.

## 4. Neste steg

- Mikael: «Test og lagre» fra verksted-PC (dealer-IP). Forventet: GET 200 i nettleseren, deretter persist.
- Residual: `testConnection` uten nøkkel i feltet, cron-pull og «Hent nå» går fortsatt fra fra1 og kan 500 mot Quick allowlist — det er F8-01-synk, ikke onboarding-proben.
- GJENSTÅR på F1-07: oversikt over mekanikere på tvers.
