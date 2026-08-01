# Desktop-app for forhandlere — hva finnes egentlig?

**Dato:** 14. juli 2026 · **Status:** utredning, ingenting bygget
**Spørsmål:** kan «native SDK fra Vercel» brukes til en desktop-app for forhandlerne?

---

## 1. Ja, Vercel Native SDK finnes — men den løser ikke problemet du tror

**Det er ekte.** [`vercel-labs/native`](https://github.com/vercel-labs/native), Apache-2.0,
siste release **v0.4.4 (11. juli 2026)**, ~6k stjerner. Repoet er 85 % Zig.

Slik fungerer den, ordrett fra README-en:

> «Views are declarative markup in `.native` files, logic is plain Zig, and Native SDK's own
> engine draws every pixel into real OS windows — **no browser, no WebView**, no interpreter
> in the binary.»

Det betyr, konkret for oss:

| | |
|---|---|
| **Kan vi gjenbruke Next.js-appen?** | **Nei.** Ingen WebView betyr ingen React, ingen shadcn/ui, ingen dither-kit, ingen Tailwind |
| **Kan vi gjenbruke React-koden?** | **Nei.** Views skrives i `.native`-markup, logikk i **Zig** |
| **Hva må skrives om?** | Hele forhandler-UI-et. Og teamet må lære Zig |
| **Er den moden?** | **Nei.** README-en sier selv: «Native SDK is pre-1.0: APIs still move» |

Med andre ord: Native SDK er ikke en måte å pakke web-appen vår i et vindu på. Det er et helt
annet UI-rammeverk, i et helt annet språk, som ville betydd at vi vedlikeholder **to** frontends —
og et brudd på techstacken (§2 Frontend er Next.js 16 + React 19.2 + shadcn).

Vercel Labs har også [`zero-native`](https://www.infoq.com/news/2026/06/zero-native-zig-xplatform-vercel/)
(Zig-backend + OS-WebView, kan pare med en Next.js-frontend). Den er nærmere det du ser for deg,
men er like fersk og enda mindre utbredt.

---

## 2. Hva er det reelle alternativet på vår stack?

### A. Installerbar PWA — **anbefalt første steg**

Next.js 16 leverer dette uten nye avhengigheter. Forhandleren får ikon i menylinja/oppgavelinja,
eget vindu uten nettleser-chrome, offline-cache. **Techstacken har allerede en PWA** (mekaniker-PWA,
F7) — vi ville gjenbrukt mønsteret, ikke innført noe nytt.

- Kostnad: ~ingenting. Ingen ny stack, ingen ny byggekjede, ingen app-signering.
- Dekker sannsynligvis 90 % av det forhandleren faktisk savner: «jeg vil ikke ha en fane blant
  30 andre».
- Mangler: skikkelig OS-integrasjon (tray-ikon, globale snarveier, filsystem, auto-oppdatering
  utenfor nettleseren).

### B. Tauri 2 — hvis vi trenger et ekte native skall

Rust + OS-ens egen WebView. Små binærer, kodesignering, auto-oppdatering.

**Men her er haken, og den er viktig:** Tauris egen dokumentasjon er tydelig — Next.js må kjøre
som **statisk eksport** (`output: 'export'`), fordi *«Tauri does not support server-based
solutions»*. Appen vår er RSC/App Router med tRPC og Better-Auth på serveren. En statisk eksport
ville betydd å rive ut mesteparten av arkitekturen.

Den farbare varianten: **Tauri som tynt skall som peker på den hostede appen** (`devUrl`/ekstern
URL) i stedet for `frontendDist`. Da beholder vi hele serverarkitekturen, og Tauri gir oss
vinduet, ikonet, tray-en og auto-oppdateringen. Det er ærlig talt «en pen nettleser», men det er
akkurat det en desktop-app for et web-produkt *er*.

### C. Electron

Mest modent, men tyngst (bundler hele Chromium), og gir ingenting Tauri ikke gir oss her.
Ingen grunn til å velge det.

---

## 3. Anbefaling

1. **Ikke bygg noe nå.** Vi har ikke engang UI-et for forhandleren ennå — F3/F5 er ikke bygget.
2. **Gjør PWA-en til default.** Den koster nesten ingenting og besvarer sannsynligvis behovet.
3. **Ikke velg Native SDK.** Den ville tvunget fram en Zig-rewrite av forhandler-UI-et, brutt
   techstacken, og er pre-1.0.
4. **Legg inn som siste fase i roadmap** — forslag:

> **F14 — Desktop-app (valgfritt)**
> - `F14-01` ADR-004-spike: PWA vs. Tauri-skall. Krav som avgjør: trenger forhandleren tray-ikon,
>   globale snarveier, lokal filtilgang eller auto-oppdatering utenom nettleseren?
> - `F14-02` PWA-manifest + installerbarhet på forhandler-dashboardet
> - `F14-03` (betinget) Tauri 2-skall mot hostet app + kodesignering (Windows/macOS)

Sist i rekka, ikke først: en desktop-app rundt et UI som ikke finnes ennå, er et vindu rundt
ingenting.

---

**Kilder:**
- [vercel-labs/native (GitHub)](https://github.com/vercel-labs/native) — README, lisens, v0.4.4
- [Tauri 2 · Next.js frontend](https://v2.tauri.app/start/frontend/nextjs) — «Tauri does not support server-based solutions», `output: 'export'`
- [Vercel Labs Open-Sources Zero-Native (InfoQ)](https://www.infoq.com/news/2026/06/zero-native-zig-xplatform-vercel/)
