# Rapport — 22.08.2026 (b) — Resend-feilen funnet + logo i auth-e-postene

**Roadmap:** ingen statusendring. F1-11 og F1-16 utvidet med e-postinnhold.
**Godkjenning:** Mikkis (eksplisitt bestilling)

---

## 1. ⛔ Hvorfor OTP-e-posten feilet

**Avsenderdomenet var apex-domenet, ikke det verifiserte subdomenet.**

`RESEND_FROM` sto som `Endwise <no-reply@endwise.no>`. Domenet som faktisk er verifisert i Resend
heter **`no-reply.endwise.no`**. `no-reply@endwise.no` er altså en adresse på `endwise.no`, som
ikke er verifisert.

Jeg leste den ekte tilstanden fra API-et i stedet for å gjette:

```
GET https://api.resend.com/domains
→ no-reply.endwise.no | status: verified | region: eu-west-1
```

Og målte begge retninger med en faktisk sending:

| `from` | Svar |
|---|---|
| `Endwise <no-reply@endwise.no>` | **403** `validation_error` — «The endwise.no domain is not verified» |
| `Endwise <no-reply@no-reply.endwise.no>` | **200**, senere `last_event: delivered` |

De to strengene er nesten identiske, og feilen rammet **alle** auth-e-poster samtidig:
engangskode, passordreset og invitasjon.

**Rettet tre steder:** `.env`, `.env.example` (med en kommentar som forklarer fella og hvordan man
sjekker), og fallback-verdien i `packages/auth/src/env.ts` — den sto som `noreply@endwise.no` og
var like feil.

### ⚠️ Sidefunn: `??` slapp gjennom en tom streng

Fallbacken var `process.env.RESEND_FROM ?? '…'`. `??` faller bare tilbake på `null`/`undefined`, så
en **tom** `RESEND_FROM=""` — nøyaktig det `.env.example` leverer for alle de andre nøklene — ga en
tom avsenderadresse i stedet for standardverdien. Endret til `||`.

Den ble ikke funnet ved lesing. Den ble funnet fordi jeg skrev en test som satte
`RESEND_FROM=''` og forventet at standardverdien slo inn.

### ⚠️ Feilmeldingen bar for lite

`sendEmail` kastet med bare `error.message`. Nå bæres `name` og statuskoden også:

```
Resend feilet: [validation_error] HTTP 403 The endwise.no domain is not verified.
```

`validation_error` og `restricted_api_key` krever helt ulike fikser, men har nokså lik ordlyd i
`message` alene.

## 2. Logoen — hva jeg valgte og hvorfor

| Vurdert | Utfall |
|---|---|
| SVG | ⛔ Gmail, Outlook og Apple Mail rendrer den ikke |
| `data:`-URI i `<img src>` | ⛔ **Gmail og Outlook fjerner den** |
| Hostet PNG på offentlig URL | ⛔ Krever et offentlig domene; `BETTER_AUTH_URL` er `localhost` til F13 er gjort |
| **PNG som inline vedlegg (`contentId`), referert som `cid:`** | ✅ **Valgt** |

⚠️ **«Inline base64» er to forskjellige ting, og bare den ene virker.** Base64 i `<img src="data:…">`
strippes av Gmail og Outlook. Base64 som *innholdet i et vedlegg*, sendt med `contentId` og
referert som `cid:endwise-logo`, er varianten e-postklienter faktisk støtter. Det er den siste som
er brukt.

**Filen:** 798 byte PNG (1,0 kB base64), 64×80 px — 2× av visningsstørrelsen 32×40 for skjermer med
høy tetthet. Generert fra `apps/web/public/logo/logo.svg` av `scripts/lag-logo-png.js`.

⛔ **Ingen ny avhengighet.** `sharp` finnes allerede i pnpm-storen som transitiv avhengighet av
Next, og brukes kun av det håndkjørte skriptet. Resultatet er en committet fil, ikke noe som skjer
ved kjøretid — så ingen §2-endring.

### Mørk modus

Logoen er **hvit** og ligger på sin **egen mørke flate**, `bgcolor="#0b0b0b"` satt som *attributt*
på en `<td>` (ikke bare CSS — attributtet overlever også Outlooks Word-motor).

`prefers-color-scheme` er upålitelig i e-post; Gmail respekterer den ikke i alle klienter. Løsningen
er derfor å ikke være avhengig av den:

- En **hvit** logo på en lys flate ville vært usynlig i klienten som *ikke* inverterer.
- En **svart** logo på en lys flate ville vært usynlig i klienten som *gjør* det.
- **Egen mørk flate** er den eneste varianten som er trygg i begge.

`color-scheme`/`supported-color-schemes` er satt i tillegg — de hjelper der de leses.

### Resten av malen

`alt="Endwise"` for dem som blokkerer bilder · `width`/`height` på `<img>` så layouten ikke hopper ·
tabeller og inline `style` (Gmail stripper `<style>`, Outlook rendrer med Word) · skjult
forhåndsvisningstekst · alt som interpoleres escapes.

**Ren tekst sendes alltid ved siden av HTML-en.** En engangskode som bare finnes i markupen, finnes
ikke for den som leser i ren tekst. Koden står også i **emnefeltet**, så den kan leses fra varselet
uten å åpne e-posten.

Passordreset-e-posten bruker samme mal, siden lenka går samme vei — der er innholdet en knapp, med
adressen gjentatt som lesbar tekst under (bedriftsfiltre skriver om og dreper knapper).

## 3. Hva gikk galt

Ingenting av betydning i utførelsen. To ting verdt å notere:

- **Jeg sendte to e-poster som del av verifiseringen**, begge til `delivered@resend.dev` —
  Resends egen testmottaker, som aksepterer og ikke leverer til et menneske. Ingen ekte innboks er
  rørt.
- **`sharp` rendret logoen svart først.** Pathene i `logo.svg` har ingen `fill`, så de defaulter til
  svart — og en svart logo på den mørke flata er usynlig. Skriptet injiserer nå `fill="#FFFFFF"`
  før rasterisering. Fanget ved å faktisk se på PNG-en mot en mørk bakgrunn, ikke ved å lese koden.

## 4. Verifisert

⭐ **Ekte sending gjennom den ekte kodestien:** `sendTwoFactorOtp` → Resend svarte 200, og
oppslag på e-post-ID-en etterpå ga **`last_event: delivered`**.

Hva Resend faktisk lagret:

| | |
|---|---|
| `from` | `Endwise <no-reply@no-reply.endwise.no>` |
| `cid:`-referanse i HTML | ✅ til stede |
| `data:`-URI i HTML | ✅ ingen |
| tekstdel | ✅ til stede |

**17 nye tester** i `packages/auth/test/epost-innhold.test.ts` som låser de stille feilene:
avsenderdomenet (inkludert at `endwise.no` avvises og at subdomener godtas, men ikke omvendt) ·
at logoen er PNG og ikke SVG · at den har alfakanal og riktige mål · at malen bruker `cid:` og
aldri `data:` · alt-tekst · `bgcolor` på logoflata · at både HTML og tekst bærer koden · at
feilmeldingen bærer `name` og statuskode · at interpolert innhold escapes.

typecheck **22/22** · biome rent · **auth-suiten 54/54** · alle andre suiter grønne.

## 5. ⚠️ Ikke verifisert

**Hvordan e-posten ser ut i en ekte innboks.** Jeg får ikke tatt skjermbilder i dette miljøet, og
jeg har ikke sendt til en menneskelig mottaker. Jeg har laget en forhåndsvisningsfil med begge
e-postene, normal og invertert — åpne den i nettleseren.

⚠️ I forhåndsvisningen vises logoen via en `data:`-URI, fordi *nettlesere* støtter det. Den ekte
e-posten bruker `cid:`. Filen viser altså layouten korrekt, men ikke `cid:`-mekanikken.

**Gmail/Outlook/Apple Mail spesifikt.** `cid:` er den bredest støttede teknikken, men klientene
oppfører seg ulikt. Vil du være sikker, send en test til en Gmail- og en Outlook-adresse du eier.

## 6. Neste steg

1. **Send en testkode til deg selv** og se den i innboksen — det er det siste leddet jeg ikke kan
   dekke herfra.
2. **Vurder å verifisere `endwise.no` (apex) i Resend også**, hvis avsenderadressen helst skal være
   `no-reply@endwise.no`. Da er det DNS-arbeid, ikke kode — og `RESEND_FROM` kan endres tilbake.
3. **Invitasjons-e-posten (F1-10)** bruker fortsatt ren tekst uten logo. Den var ikke bestilt, men
   malen ligger klar hvis du vil ha den lik de to andre.
