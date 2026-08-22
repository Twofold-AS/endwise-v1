# Rapport — 22.08.2026 (d) — Utgående e-post fra innboksen (F6-26)

**Roadmap:** F6-26 `done` (NY) · F6-27 `planned` (NY) · F6-28 `planned` (NY) · F6-16 omskrevet
**Godkjenning:** Mikkis (eksplisitt bestilling)

---

## 1. Hva er gjort

### 1.1 Kanalvalget er transport, ikke metadata

`postMessage` leser nå trådens kanal **i samme transaksjon som innsettingen** og dispatcher når
den er `email`, med `threads.external_ref` som mottaker.

⚠️ Oppslaget ligger inne i transaksjonen med vilje. Hentet vi kanalen utenfor, kunne den rukket å
endre seg mellom oppslag og skriving — og raden ville sagt én ting mens utsendingen gjorde en annen.

**Kanalen på raden er hva som FAKTISK skjedde**, ikke hva tråden ønsker seg. En e-posttråd uten
adresse gir en vanlig app-melding, ikke en `pending` for en levering som aldri kan skje. Det er
hele poenget med feltet: badgen i innboksen skal ikke kunne lyve.

### 1.2 Leveringsstatus — svaret på «hva om det feiler»

Ny kolonne `messages.delivery_status` (`pending|sending|sent|failed`) + `delivery_error`,
migrasjon `0015`.

Rekkefølgen er **skriv først, send etterpå**. Det brukeren skrev skal aldri gå tapt i en
nettverksfeil, så meldingen er alltid i tråden — og statusen sier hva som skjedde med den.

| Spørsmålet ditt | Svaret |
|---|---|
| Skal den markeres som ikke levert? | Ja — `failed` + feilteksten fra leverandøren |
| Skal brukeren se det? | Ja — rødt «Ikke levert»-felt i tråden, med årsaken |
| Kan den sendes på nytt? | Ja — «Send på nytt»-knapp → `messages.resend` |

⛔ **`sending` finnes fordi alternativet er verre.** F3-04-dispatcheren setter `sent` FØR
nettverkskallet; en krasj midt i kallet etterlater da en rad som **påstår** at den gikk. Med
`sending` er en strandet rad synlig som strandet. Det er nøyaktig feilmodusen du pekte på.

⚠️ Statusen vises bevisst **ikke** når den er `sent`. Kanalmerket sier allerede at det gikk på
e-post, og en «Sendt»-hake på hver rad ville gjort feilvarselet usynlig nettopp der det betyr noe.
Stillhet betyr «gikk fint».

### 1.3 Idempotensvakten

Mønsteret er F3-04s — ta eierskap i basen før nettverkskallet:

```sql
UPDATE messages SET delivery_status='sending'
 WHERE id = ? AND delivery_status IN ('pending','failed')
```

Treffer den null rader, holder noen andre på, og vi sender ikke. **`sent` kan aldri plukkes opp
igjen** — kunden får ikke samme melding to ganger fordi noen klikket to ganger. Meldings-ID-en
sendes dessuten som `Idempotency-Key` til Resend (belte og sele, samme som varslene).

### 1.4 Kunden kan ikke svare ennå — `replyTo`

⛔ Dette er ikke en detalj. Uten det ville kunden fått en e-post fra `no-reply@…`, trykket svar,
og skrevet inn i et tomrom — verst mulig utfall, fordi hen **tror** meldingen kom fram.

Svaret rutes til **den ansatte som skrev meldingen**, i hens vanlige jobb-innboks. Det er ikke et
provisorium som må ryddes bort: det er riktig oppførsel så lenge innkommende ikke er bygget, og når
F6-27 lander byttes adressen til trådens egen. E-posten sier det også i klartekst:

> «Svarer du på denne e-posten, går svaret til Kari Selger (kari@…).»

⚠️ Har avsenderen ingen e-post (typisk `agent:*`-forfattere), feiler meldingen **synlig** i stedet
for å gå ut som noe kunden ikke kan svare på.

### 1.5 E-posten ser ut som de andre

Samme mal, samme logo på egen mørk flate, samme `cid:`-vedlegg som OTP og passordreset.
Meldingsteksten står i en boks med `white-space: pre-wrap` — en verkstedmelding er ofte en
punktliste, og uten den kollapser oppsettet.

### 1.6 Arkitektur

`UtgaaendeEpost` er et **grensesnitt** i modulen, ikke en Resend-import. `packages/modules`
avhenger fortsatt bare av `db` og `events` (F0-06), og Resend kobles på i `apps/api` — nøyaktig som
`createDispatcher` tar sine kanaler utenfra.

⚠️ Mangler `RESEND_API_KEY`, er kanalen `undefined`, og meldingen markeres `failed` med
«E-postkanalen er ikke konfigurert». Lokalt uten Resend ser man altså at den ikke ble sendt — som
er sannheten.

## 2. ⚠️ Situasjonen endret seg under arbeidet

Om morgenen var **kun** `no-reply.endwise.no` verifisert i Resend, og apex-domenet ga
`403 validation_error` — det var hele OTP-feilen. Da jeg verifiserte den ferdige utsendingen mot
Resend, kom e-posten fra `noreply@endwise.no` og ble **levert**.

Årsaken: `endwise.no` er nå også verifisert, og `.env` er satt tilbake til apex-adressen. Begge
virker.

⛔ **Konsekvensen for koden var reell.** `RESEND_VERIFISERT_DOMENE` (entall) med en
`endsWith`-regel ville nå avvist `noreply@endwise.no` — altså akkurat den avsenderen som er i bruk.
Erstattet av `RESEND_VERIFISERTE_DOMENER`, en **eksakt liste**. Resend verifiserer hvert domene for
seg, så en subdomene-regel ville påstått at `post.endwise.no` er godkjent fordi `endwise.no` er
det — og den e-posten ville 403-et i produksjon.

⚠️ Jeg har **ikke** rørt `RESEND_FROM` i `.env` igjen. Du har satt den, den virker, og en endring
fra meg ville bare slått tilbake.

## 3. Hva gikk galt

### ⛔ 3.1 RLS skjulte forhandlernavnet — og ingenting kastet

Jeg slo opp `tenants` med `db` direkte i stedet for gjennom `withTenant`. `tenants` har RLS, så
spørringen returnerte null rader, og navnet falt stille tilbake til fallbacken «verkstedet» i
e-posten kunden får.

Ingen feil, ingen typefeil — bare feil navn hos mottakeren. **Fanget av testen**, ikke av lesing.
(`user` leses fortsatt med `db`: Better-Auth-tabellene har ikke RLS, ADR-002. Forskjellen er ikke
tilfeldig, og står i en kommentar.)

### ⚠️ 3.2 Testhjelperen kolliderte med seg selv

Min falske leverandør returnerte `resend-1` per kanalinstans. `messages` har en unik indeks på
`(tenant_id, external_id)`, så to tester i samme tenant kolliderte — og koden markerte da meldingen
`failed`, **helt korrekt**. Det så ut som en feil i utsendingen, men var en feil i testen. ID-ene
er nå globalt unike.

Verdt å notere: kollisjonen viste utilsiktet at feilhåndteringen virker også når det er
*databaseskrivingen* etter sendingen som feiler.

## 4. Verifisert

⭐ **Ekte e-post gjennom hele kodestien** — `createThread(channel:'email')` → `postMessage` →
Resend:

| | |
|---|---|
| `channel` på raden | `email` |
| `delivery_status` | `sent` |
| `external_id` | ekte Resend-ID |
| Resend `last_event` | **`delivered`** |
| `reply_to` | avsenderens adresse ✅ |
| `cid:`-logo i HTML | ✅ |
| tekstdel | ✅ |

**11 nye tester** (`apps/api/test/utgaaende-epost.test.ts`): sender med riktig innhold og
`replyTo` · kanal + status på raden matcher det som gikk ut · **idempotens** (allerede sendt →
null-kall; tre samtidige `resendMessage` → **én** e-post) · feilet sending markeres synlig og
meldingen er ikke tapt · feilet melding kan sendes på nytt og lykkes da · app-tråder sender
ingenting · e-posttråd uten adresse blir app-melding · uten kanal feiler den synlig · en
ikke-deltaker kan ikke sende på nytt · at toolkit og auth peker på samme domene (driftvakt for
duplikatet).

typecheck **22/22** · biome rent · api-suiten **117** · alle 21 turbo-oppgaver grønne ·
`next build` ✅ · roadmap **227 → 230 punkter, 230 unike**, ingen gammel ID mistet.

## 5. ⚠️ Ikke verifisert

**Hvordan det ser ut i innboksen.** Dev-serveren er stoppet (du ba om det), og flaten krever
innlogging med 2FA. Jeg har verifisert at appen bygger og at typene stemmer, men jeg har ikke sett
«Ikke levert»-feltet eller «Send på nytt»-knappen tegnet.

Det bør ses etter med øyet: at det røde feltet ikke dominerer tråden, og at feilteksten fra Resend
er lesbar for et menneske (den kan være teknisk).

**Hvordan e-posten ser ut i en ekte innboks** — samme forbehold som sist. Den er levert til
`mikkis@twofold.no`, så den ligger der.

## 6. Neste steg

1. **F6-27 — innkommende e-post.** Den ekte beslutningen der er ikke webhooken, men
   **svaradressen**: plus-adressering per tråd, `In-Reply-To`-kjeding, eller begge. Krever også at
   et domene settes opp for MOTTAK i Resend.
2. **F6-28 — utgående SMS.** Mesteparten er kanaluavhengig og finnes allerede; det som gjenstår er
   å generalisere grensesnittet og koble Twilio på.
3. ⚠️ **Ingen rate-limit på utgående e-post.** En ansatt kan sende så fort hen klarer å skrive. Det
   er greit i dag, men bør vurderes før mange forhandlere er på.
