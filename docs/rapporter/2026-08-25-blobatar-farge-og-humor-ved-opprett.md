# Rapport — 25.08.2026 — Blobatar: farge og humør ved opprett

**Roadmap:** F6-19 (done, utvidet)  
**Gren:** `cursor/blobatar-picker-humor-7fb4` mot `main`

## 1. Hva er gjort

### F6-19 — hvorfor nye kontoer og «ny avatar» alltid så blide ut

Roten var ikke en ny identitetsmodell. Feltet `avatar_humor` fantes. Feilen satt i *stiene*:

- `/oppstart` hadde ingen avatar-steg (P0 fjernet det). Ny eier gikk inn med `null` overalt.
- Ansatt-invite gikk rett til landing etter 2FA. Ingen farge- eller humørvalg før første visning.
- `AvatarVelger` viste form og uttrykk, men ikke farge eller tone. Farge ble bare satt via «Ny tilfeldig».
- P0-låsen `medHappy` er borte fra main, men opprett uten valg lot ansiktet stå uten eksplisitt pose — og «Ny tilfeldig» kunne overskrive et valgt humør.

Identiteten er uendret: **form + farge + seed**. Lagret humør er det brukeren valgte. Status overstyrer bare liste-humor (`ledig=happy`, `opptatt=thinking`, `fri=idle` — ikke sleepy). `sad` bare for syk/avvik, aldri arbeidsstatus.

### Hva som er bygget

- Samme velger overalt: form, farge, humør, tone. Ikke fire nedtrekk.
- `/oppstart`: avatar-steg mellom visningsnavn og tillegg/team. Hopper du over, trekker vi blant de ti kuraterte humørene — ikke happy.
- Ansatt-/plattform-invite: avatar-steg etter 2FA. Eier går til `/oppstart` som før.
- «Ny tilfeldig» beholder valgt humør, farge og tone. Bare form (og evt. tomme felt) trekkes på nytt.
- `Avatar` med null-humør sender `idle`, ikke happy.
- Siste to farger rettet: 270 lilla og 320 rosa (300/340 leste som to magenta). Blobatar dokumenterer hue-stopp til 320.

Ingen migrasjon. Ingen Quick CONNECT-endring. PR #28 urørt.

## 2. Hva gikk galt

Alt gikk som planlagt mot spesifikasjonen. Context7 MCP krevde innlogging; blobatar-API-et ble verifisert mot pakken og README (`expression` default er `idle`). Slack-søk etter den originale noten ga ingen treff — fargefiksen er lest ut av velgerens siste to stopp mot bibliotekets 12–320-sirkel.

## 3. Fikser

- Tester for opprett-sti (`fullforAvatarValg`), for at valgt humør/farge ikke klobbes, og for 270/320.
- P0- og invite-tester oppdatert: avatar-steg er tilbake med vilje.

## 4. Neste steg

- Mikael merger når CI er grønn. Ikke merget av agenten.
- Manuell runde: ny eier-invite → `/oppstart` avatar → velg farge og humør → dashboard. Ansatt-invite → avatar etter kode → landing. «Ny tilfeldig» i profil skal ikke resette valgt humør.
