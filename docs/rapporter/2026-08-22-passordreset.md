# Rapport — 22.08.2026 — Passordreset (F1-15, F1-16) + F1-18 og F1-19

**Roadmap:** F1-15 · F1-16 · F1-18 · F1-19 → `done`
**Godkjenning:** Mikkis (eksplisitt bestilling)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-15** | «Glemt passord?» under passordfeltet på `/signin` + sida `/glemt-passord` |
| **F1-16** | Hele flyten: `sendResetPassword`, herding, og `/nytt-passord` |
| **F1-18** | `PassordFelt` med vis/skjul, brukt på `/signin` og `/nytt-passord` |
| **F1-19** | Begge de utdaterte sikkerhetstekstene rettet |

`forgetPassword`/`resetPassword` fantes i Better-Auth med null kallsteder. Det som manglet var
**stien inn til dem og hvor stramt de var skrudd** — ikke funksjonaliteten.

### Filer

**Ny herdingsmodul** `packages/auth/src/password-reset.ts` — grensene som data, pluss
`passordResetHull()`. **`senders/resend.ts`** — `sendPasswordReset`, samme dev-leveringsregel som
invitasjonen. **`auth.ts`** — `sendResetPassword`, TTL, `revokeSessionsOnPasswordReset`,
`onPasswordReset`, to rate-limit-regler. **`apps/web/app/_auth/felter.tsx`** — `Field`, `INPUT`,
`PassordFelt` (løftet ut av `signin/page.tsx`). **`/glemt-passord`**, **`/nytt-passord`**.
**18 tester** i `packages/auth/test/passord-reset.test.ts`.

## 2. Sikkerhetsvalgene, og hvorfor

| Egenskap | Valgt | Better-Auths default |
|---|---|---|
| Token-levetid | **30 min** | 1 time |
| Engangsbruk | konsumeres i transaksjon; utløpt token brennes også | (samme) |
| Enumerering | identisk svar kjent/ukjent, også ved sendefeil | (samme) |
| Rate limit, be om lenke | **5 per 15 min/IP** | 3 per **minutt** = 180/t |
| Rate limit, sett passord | **10 per 15 min/IP** | 60/min |
| Sesjoner ved bytte | **alle rives** | ⛔ **`false`** |

**30 minutter, ikke en time.** Bevisst mye kortere enn invitasjonens sju dager (F1-10):
en invitasjon lager en konto som ikke finnes ennå, en resetlenke er en nøkkel til en konto som
finnes og har data i seg.

**5 per kvarter, ikke 3 per minutt.** Better-Auths standard tillater 180 forespørsler i timen mot
én sti. Det er rikelig til å fylle en innboks med resetvarsler og til å kverne adresser mot
endepunktet. Et menneske trenger én, kanskje to.

### ⛔ Reset er ikke en vei rundt 2FA

`/reset-password` setter **ingen sesjonscookie** — bytter passordet og svarer `{status: true}`.
Lest i `dist/api/routes/password.mjs` (v1.6.23) og verifisert mot det ekte endepunktet: ingen
`set-cookie`, null sesjonsrader etterpå. Brukeren må logge inn, og da gjelder F1-11 fullt ut.

Det er en egenskap vi **arver**, ikke en vi har bygget — derfor står den fast i en test.

### ⛔ `revokeSessionsOnPasswordReset` var den viktigste linja

Defaulten er `false`. Den vanligste grunnen til å tilbakestille passordet er mistanke om
kompromittering — og uten flagget beholder angriperens eksisterende sesjon full tilgang etterpå.
Resetten ville vært en trøstehandling.

## 3. Hva gikk galt

### ⚠️ 3.1 Jeg tok feil om «feiler lukket» — funnet ved å faktisk kjøre det

Første utkast av kommentaren i `resend.ts` sa at flyten «feiler LUKKET» i prod uten Resend, etter
mønster av invitasjonen. **Det er galt.** Da jeg kjørte flyten over HTTP mot dev-serveren, svarte
ruta 200 mens loggen viste:

```
Failed to run background task: Error: Resend feilet: The endwise.no domain is not verified
```

Better-Auth kaller senderen gjennom `runInBackgroundOrAwait` — altså **etter** at svaret er sendt.

Og da jeg tenkte etter: **det er riktig sånn.** Sendingen skjer bare for adresser som FINNES. Lot
vi feilen slå gjennom til svaret, ville ukjent adresse gitt 200 og kjent adresse gitt 500 — et
enumereringsorakel. Kommentaren er skrevet om til å si det sanne, og egenskapen er låst i en test
(`⛔ ENUMERERING: en feilende e-postsending endrer ikke svaret`).

⚠️ Prisen er reell og skal ikke bortforklares: **et ødelagt e-postoppsett er usynlig for
brukeren.** Derfor må feilen være høylytt i loggen, og levering må overvåkes (F0-14).

### ⚠️ 3.2 Testene delte én bruker og var rekkefølgeavhengige

Første kjøring: 16/17. Sesjons-testen falt med «Invalid email or password» — en tidligere test
hadde allerede byttet passordet på den delte brukeren. Rettet til **én fersk bruker per test**. En
sikkerhetstest som består fordi den tilfeldigvis kjørte først, beviser ingenting.

### ⚠️ 3.3 Doc-kommentaren til `sendInvitation` ble frakoblet

Jeg satte inn `sendPasswordReset` mellom `sendInvitation` sin kommentar og funksjonen. Fanget ved
gjennomlesing, ikke av verktøy — verken typecheck eller biome ser at en kommentar har byttet eier.

### ⚠️ 3.4 Én utgående e-post ble forsøkt sendt

E2E-sjekken traff `ansatt-a@verksted.test` (seedet demokonto) mens `.env` har en ekte
`RESEND_API_KEY`. **Ingen e-post gikk ut** — Resend avviste den fordi `endwise.no` ikke er
verifisert på kontoen, og `.test` er uansett en reservert TLD som ikke kan motta post. Jeg slettet
resettokenet etterpå, så det ikke lå en levende lenke til en demokonto.

### ⚠️ 3.5 Miljøbegrensninger

- **context7 (CLAUDE.md §3) er ikke tilgjengelig** i denne økten heller. Better-Auths API er derfor
  lest fra `node_modules` — men denne gangen fra **implementasjonen** (`dist/api/routes/password.mjs`,
  `dist/db/internal-adapter.mjs`, `dist/api/rate-limiter/index.mjs`), ikke bare typene. For
  sikkerhetsspørsmål er det faktisk sterkere enn dokumentasjon: det er koden som kjører.
- **Nettleserpanelet kan fortsatt ikke ta skjermbilder** (viewport 0×0). Sidene er verifisert til å
  svare 200 og bygge, men **jeg har ikke sett dem tegnet**.

## 4. Verifisert

**18 tester**, hvorav 10 mot ekte database:

| Egenskap | Test |
|---|---|
| Ingen sesjon fra reset (2FA ikke omgått) | ingen `set-cookie`, 0 sesjonsrader |
| Engangsbruk | andre bruk → 400 |
| Levetid | bakdatert token → 400 |
| Enumerering | kjent og ukjent gir identisk svar |
| Enumerering ved feil | sendefeil endrer ikke svaret |
| Sesjoner rives | innlogget → reset → 0 sesjoner |
| 2FA overlever | `twoFactorEnabled` uendret |
| Passordkrav | 4 tegn avvist også via reset |
| Herdingen | den ekte konfigurasjonen har 0 hull; hver utrygg variant gir navngitt hull |

typecheck **22/22** ✓ · `next build` ✓ (begge nye ruter prerendret) · biome rent på egne filer ·
alle suiter grønne · roadmap **227 punkter, 227 unike, 0 ukjente ui-verdier**.

**Kjørt over HTTP mot dev-serveren:** identisk svar for kjent og ukjent adresse (byte for byte),
TTL målt til **1800 s** i basen, ugyldig token → `400 INVALID_TOKEN`.

⚠️ **DB-testene skipper under `turbo run test`**, fordi turbo ikke sender miljøvariabler videre.
Det gjelder alle DB-tester i repoet fra før (api viser 81 skipped). Jeg kjørte dem direkte med
env satt: **18/18 grønne**.

## 5. ⚠️ Ikke verifisert

**Visuelt.** Sidene svarer 200 og bygger, men er ikke sett. Det som bør ses etter: at
`/glemt-passord` og `/nytt-passord` ser ut som `/signin` (de arver nå samme felter), og at
øye-knappen ikke kolliderer med teksten i et fullt passordfelt.

**Dev-leveringen av lenka i praksis.** Enhetstesten dekker at `devRamme` skriver lenka når nøkkelen
mangler, men jeg fikk ikke sett rammen i terminalen — `.env` har en nøkkel, og da er dev-stien av
med vilje.

## 6. Neste steg

1. **F1-17** — bytt passord med det gamle som bevis, i Settings. `/innstillinger/profil` har nå en
   «Bytt passord»-knapp, men den går til RESET-flyten. Det er ærlig, ikke ideelt.
2. **F1-21 (gjenopprettingskoder)** er nå den tydeligste gjenstående svakheten: én 2FA-metode, og
   den deler innboks med resetlenka.
3. **Fjern `RESEND_API_KEY` lokalt** hvis du vil se flyten ende-til-ende i dev.
