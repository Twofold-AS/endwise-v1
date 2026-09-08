# Rapport — CODE-GO Mikael (hjem live, Hjelp, Statistikk)

**Dato:** 8. september 2026  
**Roadmap:** F3-05, F5-13, F5-14, F5-19, F5-23, F5-18  
**Base:** `main` `b50d5cb` / #160. Draft. ⛔ #114/#119.

## 1. Hva er gjort

### F3-05 — forhandler home live data
- Query-nøkler: `bookings.list`, `mechanics.oversikt`, `messages.listThreads`, `inventory.listParts`.
- `HJEM_PULSE_REFETCH` = `refetchOnMount: 'always'`, `refetchOnWindowFocus`, `staleTime: 0`.
- `invalidateHjemPulse` invaliderer `bookings.list`, `bookings.calendar`, `mechanics.oversikt` etter ny jobb / statusbytte (`bookinger/ny`, `bookinger/[id]`, `min-dag/[id]`) + event `endwise:booking-lagret`.
- **Pågår** = `in_progress` eller levende booking (`draft`/`confirmed`/`in_progress`) som overlapper nå. Planlagt ekskluderer de ID-ene.
- **På jobb-regel:** aktiv *jobb-tildeling* via `aktivJobb` (`dashboard/_pa-jobb.ts`) — ikke timeføring, ikke `mechanics.active`, ikke status-humor (`på_jobb`/`ledig`). Verkstedet har ikke timeføring; ferie/planlegging uten tildeling teller ikke.

### F5-14 — Innboks top-bar
- Én stripe: **Ny samtale**-ikon venstre · **ett sort-kontroll midt** (Nyeste/Eldste-dropdown) · velg + slett-ikoner høyre.

### F5-19 / F5-13 — chrome + profil
- «Innstillinger» midtstilt i top-bar 1 (samme `phoneSideChrome` som Hjelp/Statistikk).
- «Vilkår» = samme 17/700 som menyradene.

### F5-23 — Forespørsel → Hjelp
- Profilmeny: **Hjelp** → `/hjelp` (`data-phone-profil-hjelp`).
- `/hjelp` deler Innstillinger-chrome: midtstilt tittel + underline **Artikler · Forespørsler**.
- Artikler-fanen har en **Forespørsler**-inngang. Forespørsler oppretter `dealer_admin`-tråd (samme som Innboks › Endwise).
- `/support` re-eksporterer `/hjelp`.

### F3-05 / F5-18 — uke + Analyser
- Toppkort: heading **«Denne uken»**, tall + etiketter midtstilt, blå `#0066ff` dither under, mer tilfeldig fyll.
- Ny **Analyser**-blokk over Innboks/Lager/Jobb: Del 1 «Analyser» + «Se tall»; Del 2 2×2 dither-mock (nettsidevisninger til live).
- `/statistikk` — samme chrome; faner **Bookinger · Salg · Nettside · Effektivitet**.
- Låste hjem-flater ellers uendret (ingen gamle pulse-kort). `PHONE_KORT_META.statistikk` peker fortsatt på `/rapporter`.

## 2. Hva gikk galt

- Context7 MCP var ikke autentisert — docs hentet fra eksisterende kode/pakker i repoet, ikke live context7.
- Hard-fasit-tester (`forhandler-hjem-apple-hard`, `phone-home`) låste fire rader uten Analyser og `erSettingsSti` i `phone-shell.tsx`; oppdatert til `phoneSideChrome` + Analyser-rad.
- `/hjelp` var tidligere re-eksport av `/support`; tester som leste `support/page.tsx` for NewBadge/kategorier pekte på tom re-eksport.

## 3. Hvilke fikser ble gjort

- Ny `hjem-pulse-sync.ts` + event-lytter i `useDealerHjemKort`.
- `erPaagaarJobb` + `ansattePulse(..., jobber, naa)` mot `aktivJobb`.
- Delt `phone-side-chrome.ts` + `side-chrome-skall.tsx`.
- Innboks-verktøy som `grid-cols-[auto_1fr_auto]`.
- Tester + roadmap + `UI-PAKKER.md` §8 oppdatert.

## 4. Neste fase / neste steg

- Draft PR — Mikael GO, ikke squash-merge før CODE-GO.
- Koble ekte nettsidevisninger når analyse-data finnes (F5-18 / F13-02).
- Ikke #114/#119.
