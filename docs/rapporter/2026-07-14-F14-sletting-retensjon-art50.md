# Arbeidsrapport — F14: sletterutine, retensjon, art. 50-merking, pseudonymisering

**Dato:** 14. juli 2026 (økt 17)

---

## 1. F14-16 — Sletterutinen. Og det som ikke lar seg slette.

Rutinen når alle ledd — men den behandler dem ulikt, fordi de *er* ulike:

| Ledd | Hva skjer | Hvorfor |
|---|---|---|
| Meldinger, notater, stream-events, kunden selv | **Slettes** | Ingen grunn til å beholde |
| **Booking, kjøretøy** | **Anonymiseres** | Bokføringsloven. **Vi fjerner personen fra transaksjonen, ikke transaksjonen fra regnskapet.** Et regnr uten eier er ikke lenger en personopplysning — og neste eier skal vite hva som er gjort på sykkelen |
| **`audit_log`** | **Redakteres** | Se under — dette var jobbens kjerne |
| `erasure_requests` | **Slettes aldri** | Beviset på at vi slettet må overleve slettingen |

### Den append-only loggen — to krav som peker i hver sin retning

`audit_log` er append-only med vilje (F1-06): ingen UPDATE, ingen DELETE. En kompromittert
app-rolle kan skrive historie, men ikke skrive *om* den.

Men art. 17 gjelder også der. **Loggen skal være uforanderlig, OG personopplysninger i den skal
kunne fjernes.**

**Løsningen:** vi sletter ikke raden — vi redakterer feltene (`actor`, `subject_id`, `metadata`,
`ip_address`) og lar tidspunkt, handling og tenant stå. **Hendelseskjeden overlever; personen
forsvinner ut av den.**

Redaksjonen skjer gjennom en **SECURITY DEFINER**-funksjon i databasen:

- den kjører som **eieren**, ikke som app-rollen — app-rollen får dermed *aldri* UPDATE på
  `audit_log`. Den kan **be om** redaksjon, ikke utføre den.
- den henter tenant fra `app.tenant_id` **selv**, aldri fra et argument. Et argument kunne blitt
  satt av den som kaller; dette kan det ikke.
- **den skriver et spor av seg selv inn i loggen den nettopp redigerte** — som en helt vanlig,
  uslettelig rad.

Det er forskjellen på *«vi slettet fra loggen»* og *«loggen viser at vi slettet»*.

En test bekrefter at app-rollen fortsatt **ikke** kan oppdatere `audit_log` direkte (0 rader
berørt) — redaksjon skjer kun via funksjonen.

### ⚠️ Det jeg IKKE får slettet — ærlig

| Leverandør | Hva ligger der | Hva vi kan gjøre |
|---|---|---|
| **Fireworks** | **Ingenting.** ZDR er standard; prompten finnes kun i flyktig minne | Ingenting — og det er riktig svar |
| **Mistral** | Uten ZDR: input/output i **30 rullerende dager** | ⚠️ **Vi har INGEN API for å slette én enkelt prompt.** Vi kan ikke, på forespørsel fra én kunde, fjerne akkurat hennes melding fra deres logg |
| Vercel Blob | Filer | Full sletting. Dette leddet er vi herre over |
| Resend / Twilio | Leverandørlogger | Følger deres retensjon — må bekreftes i DPA (F14-09/12) |

**Derfor rapporterer rutinen status `partial`, ikke `completed`.**

Å skrive «completed» når Mistral har prompten i 30 dager til, ville vært en løgn i et dokument vi
selv laget for å bevise at vi er til å stole på. Den registrerte får sannheten: *dette er slettet,
dette er anonymisert, dette utløper innen 30 dager hos vår databehandler, og her er hvorfor.*

**Handlingen som følger:** få ZDR innvilget hos Mistral (F14-11). Da forsvinner denne raden — og
det er den beste grunnen til å prioritere den søknaden.

---

## 2. F14-03 — Logg-policyen er kode

`RETENTION_POLICY` — per tabell: retensjonstid, grunnlag, **begrunnelse**, tilgangskontroll, og
`delete | redact`.

| Tabell | Dager | Modus | Kort begrunnelse |
|---|---|---|---|
| `stream_events` | 7 | delete | Avspillingsbuffer for SSE. En uke dekker enhver rimelig frakobling; alt utover er hamstring |
| `notifications` | 90 | delete | Idempotens-vakten må huske hva som er sendt |
| `audit_log` | 365 | **redact** | Sporbarhet. Rader slettes ikke — de redakteres |
| `messages` | 730 | delete | Dialog om et kjøretøy har verdi ved neste service |
| `erasure_requests` | **0 = aldri** | — | Beviset må overleve slettingen |

**En test feiler hvis en regel mangler begrunnelse.** *En retensjonstid uten begrunnelse er en
gjetning.*

Ryddes av Vercel Cron (`/cron/retention`, 04:00), gjennom `withTenant` → RLS. **Jobben har ingen
global slette-tilgang** og kan ikke, ved en feil, tømme feil forhandler. En test angriper nettopp
det.

---

## 3. F14-04 — AI Act art. 50. Bygget. Stygg. I tide.

`<AiDisclosure>` og `<HumanHandoverNotice>` i `@endwise/ui`, montert på `/chat` i `apps/web`.

**Designet er bevisst minimalt.** Fristen er 2. august, og den juridiske gyldigheten avhenger ikke
av hvor pen den er — den avhenger av at informasjonen er der, tydelig, **før samtalen starter**.

Merkingen respekterer også skjermlesere (`role="note"`, `aria-live`) — art. 50 gjelder også for
brukere som ikke ser skjermen.

### `[ART50-UI]` — markøren, som bestilt

Alt som berører merkingen er merket, og `grep -r "\[ART50-UI\]"` finner alt:

| Sted | Treff |
|---|---|
| `packages/ui/src/compliance/ai-disclosure.tsx` | 4 |
| `packages/ui/src/index.ts` | 1 |
| `apps/web/app/chat/page.tsx` | 4 |
| **Roadmap** (F14-04 + **F4-15**) | 3 |

**Nytt roadmap-punkt `F4-15`:** *«[ART50-UI] Art. 50-merking: design-pass når tokens er inne»* —
kryssreferert til F14-04.

⚠️ **Skrevet inn i både kode og roadmap:** *du kan endre HVORDAN merkingen ser ut. Du kan ikke
fjerne AT den er der, og ikke flytte den bort fra samtalestart. Det er ikke design, det er
lovtekst.*

---

## 4. F14-01 — Pseudonymisering (rakk den)

E-post, telefon, regnr → `[EPOST_1]`, `[TLF_1]`, `[REGNR_1]`. Stabile plassholdere (samme verdi →
samme plassholder, så modellen kan resonnere om «samme kunde»), og `unmask()` setter de ekte
verdiene tilbake **før mennesket ser svaret**.

⚠️ **Ærlig om hva den er:** dette gjør **ikke** dataene anonyme (art. 4(5)) — vi holder kartet,
altså kan vi re-identifisere, altså er de fortsatt personopplysninger. Det er **dataminimering**
(art. 5(1)(c)): leverandøren får ikke opplysninger den ikke trenger.

Kartet lever kun i minnet, for én agent-kjøring. **Et pseudonymiseringskart på disk er en
gjenidentifiseringsnøkkel med et pent navn.**

**Status `progress`:** den er bygget og testet, men ikke koblet inn i `runAgent()` ennå. Det er
neste steg.

---

## 5. Tester — 119/119 grønne mot ekte Postgres

| Suite | Antall |
|---|---|
| RLS / tenant-isolasjon | 11 |
| Moduler (booking, matching, varsling, kompetanse, SSE, meldinger, **sletting**, **retensjon**) | **58** |
| Guardrails (L1–L5, scope-gate, **pseudonymisering**) | **20** |
| Agent-runtime (spawn-binding, eskalering, dataregion) | 17 |
| Providers (dataregion, EU-endepunkt, ruting) | 13 |

Typecheck (19 pakker), biome og `next build` (`/chat` bygger) også grønt.

**Ingenting gikk galt denne økten.**

---

## 6. Roadmap

**32 ferdig · 10 pågår · 94 planlagt.**

F14-portvakten: **F14-03 og F14-16 er `done`**. F14-04 og F14-01 er `progress`.
De ti juridiske punktene er urørt — de lukkes ikke av en commit.

## 7. Neste

- **F14-04** — design-pass venter på tokens (`F4-15`)
- **F14-01** — koble pseudonymiseringen inn i `runAgent()`
- **F14-05** — scope-gaten ut av audit-modus (krever ekte trafikk å måle mot)
- **F14-11** — ⏰ **send ZDR-søknaden til Mistral.** Den er nå den eneste grunnen til at
  sletterapporten sier `partial` i stedet for `completed`

Ingenting er pushet.
