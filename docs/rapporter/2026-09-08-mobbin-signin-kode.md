# Øktrapport — 8. september 2026 (Mobbin e-post-innlogging + 5-sifret kode)

## 1. Hva er gjort

- **F1-02:** Innloggingskort + logo flyttet høyt på sida (`pt-[max(2.5rem,12vh)]`). Stor heading «Logg inn på Endwise» (28px / Inter 650). Felt er Mobbin-fyll (`bg-inset` `#f0f0f0`, 16px radius, mer vertikal padding). Fortsett med pil (`ArrowRight`); StatefulButton viser spinner i loading. Vilkår-linje peker på `/vilkar`. Logo er `AuthMerke` (mask + `bg-fg`) — synlig i mørkt tema.
- **F1-02:** Etter e-post: samme kort/heading. «Vi har sendt en midlertidig kode til **{epost}**.» + «**Ikke deg?**» (tilbake). Ett 5-sifret felt («Fyll inn kode»), ikke OTP-bokser. Fortsett → spinner.
- **F1-02 / F1-11-kanal:** Magic-token er 5 siffer (`MAGIC_LINK_KODE_LENGDE = 5`). Better-Auth `generateToken` + `storeToken: 'hashed'` + rate-limit 5/min urørt. TOTP-app forblir 6 siffer.
- **Login-e-post:** Emne `Din midlertidige Endwise kode er {kode}`. Alltid hvit bakgrunn. Svart cid-logo. «Hei {navn},» tykk. Muted «Her er koden for å logge inn». Stor svart kode. Understreket «lenka». Innstillinger → Konto. Ignorer-fotnote.

## 2. Hva gikk galt

Alt gikk som planlagt for kode og låste tester. Visuell GO er Jonas — PR holdes som draft. ⛔ #114/#119 urørt.

## 3. Hvilke fikser ble gjort

- Venteskjerm («Skriv kode manuelt» / «Send på nytt») erstattet av kode-steget.
- 12-tegns alfanumerisk kode → 5 siffer. Gamle lenker slutter å virke etter deploy.
- Innloggings-e-post har eget skall (`byggInnloggingsEpostHtml`); invite/bytte/innboks beholdt Apple-malen.

## 4. Neste steg

Jonas visual GO på draft-PR (lys + mørk, e-post + kode-steg, e-post-HTML). Ikke merge. TOTP-oppsett og invite-chrome er utenfor denne CODE-GO.
