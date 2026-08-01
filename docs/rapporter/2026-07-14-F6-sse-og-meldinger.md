# Arbeidsrapport — F6-01 Meldinger + F6-02 SSE-fundament

**Dato:** 14. juli 2026 (økt 11)

---

## 1. Hva er gjort

### F6-02 — SSE-fundamentet (`apps/stream` er ikke lenger et skall)

Hentet ferske docs via context7 før jeg skrev noe: **Hono `streamSSE`** (`writeSSE` med
`event`/`data`/`id`, `stream.onAbort`, `stream.aborted`, `stream.sleep`) og **node-postgres
LISTEN/NOTIFY** (`client.on('notification')`, og at det må være en `Client` — ikke en `Pool`).

**Arkitekturen, og hvorfor den ser sånn ut:**

```
publishEvent()                    apps/stream (SSE)
  1. INSERT stream_events  ─┐        ┌─ 1. sesjon (F1-12)
     (monoton bigserial id) │        │  2. assertMember (tenant)
  2. pg_notify(kanal, ──────┼───────►│  3. tilkoblings-cap
     {id, tenantId,         │        │  4. Last-Event-ID → avspilling
      audienceId})          │        │  5. live: NOTIFY → les rad → writeSSE
                            │        └─ 6. heartbeat hvert 15s
                       RLS beskytter begge veier
```

**NOTIFY er ildledning uten hukommelse.** Er klienten frakoblet i de to sekundene eventet fyres,
er det borte for alltid — en mekaniker som kjører gjennom en tunnel ville mistet
jobboppdateringen sin. Derfor **skrives hendelsen først** (`stream_events`, monoton id), og NOTIFY
sier bare *«det finnes noe nytt»*. Ved reconnect sender klienten `Last-Event-ID`, og vi spiller av
alt med høyere id.

**NOTIFY er varselklokka. Tabellen er sannheten.**

**NOTIFY-payloaden inneholder aldri innhold** — kun `{id, tenantId, audienceId}`. To grunner, og
begge er reelle:

1. Postgres kutter NOTIFY-payload på 8000 bytes. En lang melding ville blitt **stilltiende**
   avkortet.
2. Alle som lytter på kanalen ser payloaden. Å legge meldingstekst der ville vært å sende hver
   kundes samtale til hver eneste tilkoblede prosess.

Innholdet hentes fra tabellen, gjennom RLS. **Det finnes en test som verifiserer at
NOTIFY-payloaden kun har de tre nøklene** — og at kundens telefonnummer ikke er i den.

**Én `Client`, ikke en `Pool`, for LISTEN.** LISTEN er session-tilstand. En pooled forbindelse som
gis tilbake og lånes ut igjen **slutter å lytte uten å si fra** — vi ville hatt en SSE-tjeneste som
stille sluttet å levere. Én forbindelse, én LISTEN, fan-out i minnet.

### Sikkerheten — fire lag, fordi de fanger fire ulike feil

> **En SSE-strøm som lekker på tvers av tenants er samme feil som en spørring som gjør det — bare
> vanskeligere å oppdage, fordi den lekker over tid og ingen ser en 200 som er feil.**

| Lag | Svarer på | Uten det |
|---|---|---|
| `requireSession` | Hvem er du? | Åpen strøm |
| `assertMember` | Hører du til **denne** tenanten? | En innlogget bruker ber om hvilken som helst `tenantId` og får strømmen hennes |
| `audienceId` | Er eventet ment for **deg**? | RLS ser ikke forskjell på to brukere i samme tenant — kollegaen din får kundesamtalen din |
| RLS | Hvilken tenants rader? | Alt |

Filtreringen på `tenantId`/`audienceId` er en **hard sjekk i tjenesten** — vi stoler ikke på at
NOTIFY-en var riktig adressert.

### Tilkoblings-caps

SSE holder forbindelsen åpen. Det er hele poenget — og hele risikoen: samtidige tilkoblinger er
den fremste kostnadsdriveren på Vercel (techstack §7), og en klient med en reconnect-løkke som har
gått i ball kan åpne hundrevis uten å mene noe vondt.

To grenser, fordi de fanger to ulike feil: **5 per bruker** (klient som løper løpsk) og
**100 per tenant** (én forhandler som tar hele budsjettet). Pluss en **maks levetid på 30 min** —
tvungen resirkulering; klienten kobler til igjen med `Last-Event-ID` og mister ingenting.

### F6-01 — Tråder og meldinger

`threads` · `thread_participants` · `messages`. Én trådmodell for alle tre samtale-kanalene
(techstack §3) — forskjellen er bare hvem som står i hver ende.

**To tilgangslag, og de fanger ulike feil:**

- **RLS:** «hvilken tenants tråder?» — hindrer at forhandler A ser B.
- **Deltakelse:** «er *du* med i denne tråden?» — hindrer at en ansatt hos A leser en kundesamtale
  hos A som han ikke er del av. **Bare RLS ville gitt hver ansatt tilgang til hver kundes samtale
  i huset.** Det er ikke en tenant-lekkasje, men det er fortsatt en lekkasje.

En melding publiserer ett event **per mottaker** (ikke til avsenderen selv), med `audienceId` satt
— så SSE-filtreringen har noe å filtrere på. `authorId` tas alltid fra sesjonen, aldri fra input.

tRPC-ruter: `messages.listThreads` (m/ uleste-telling), `listMessages`, `createThread`, `post`,
`markRead`.

---

## 2. Testene — 55/55 grønne mot ekte Postgres

17 nye:

| Angrep / test | |
|---|---|
| `Last-Event-ID` fra tenant B gir A ingenting av B sitt | ✅ |
| Privat event til bruker A leveres ikke til bruker B | ✅ |
| **NOTIFY-payloaden inneholder aldri innhold** — kun `{id, tenantId, audienceId}` | ✅ |
| **LISTEN/NOTIFY fyrer faktisk** (ekte listener-forbindelse i testen) | ✅ |
| Reconnect spiller av nøyaktig det som ble mistet, i rekkefølge | ✅ |
| En ansatt som ikke er deltaker kan ikke lese tråden | ✅ |
| En ikke-deltaker kan ikke poste i tråden | ✅ |
| Tenant B ser ikke A sine tråder | ✅ |
| Meldingsteksten ligger aldri i event-payloaden | ✅ |
| Cap stopper en klient som åpner for mange strømmer (og en annens cap rammer ikke deg) | ✅ |

**Total: 55** (11 RLS/tenant · 9 booking · 5 matching · 4 varsling · 9 kompetanse · 10 SSE ·
7 meldinger). Typecheck (19 pakker), biome og `next build` også grønt.

---

## 3. Hva gikk galt

1. Sandkassens `/tmp` ble tømt midt i økten — hele node_modules og test-databasen forsvant.
   Bygget opp igjen; ingen kode gikk tapt (repoet er kilden).
2. `STREAM_CHANNEL` var eksportert fra skjemaet, men ikke fra `@endwise/db` sin rot.
3. En ubrukt import i stream-testen (fanget av Biome).

## 4. Fikser

Alle tre trivielle. `STREAM_CHANNEL` re-eksporteres nå fra `@endwise/db`.

---

## 5. Roadmap

**F6-01 og F6-02 er `done`.** Totalt: **27 ferdig · 6 pågår · 86 planlagt.**

---

## 6. Neste — og her trenger jeg en beslutning

Backend-arbeidet som **ikke** er blokkert av tokens begynner å bli tynt. Det som står igjen:

| Kandidat | Vurdering |
|---|---|
| **F6-03** Handlingsknapper i meldinger | Halvt UI. Backend-delen er liten |
| **F6-13** AI-agent-fundament (`packages/agent-runtime`) | **Stort og rent backend.** Master-løkke, loop-orchestrator, modellkatalog. Krever `OPENAI_API_KEY` for å *teste* mot ekte modell — men strukturen kan bygges og enhetstestes uten |
| **F6-14** Guardrails L1–L5 | Rent backend, sikkerhet. Krever at F6-13 finnes først |
| **F2-03** Modellbilder (Vercel Blob) | Krever `BLOB_READ_WRITE_TOKEN` for ekte opplasting |
| **F8** Quick-integrasjon | **Blokkert** — krever Quick API-tilgang (allerede `blocked` i roadmap) |

**Mitt forslag: F6-13 (AI-agent-fundament), deretter F6-14 (guardrails).** Det er den største
gjenstående backend-blokka, og den er helt uavhengig av UI.

**Men jeg trenger å vite:** skal jeg bygge agent-runtimen **mot OpenAI** (techstack §2: «OpenAI
primær; leverandører bak abstraksjon»), og i så fall — har du en `OPENAI_API_KEY` jeg kan legge i
`.env.local`, eller skal jeg bygge strukturen med en fake provider og la deg koble på nøkkelen
etterpå? Det siste går fint, og er plug-and-play.

Ingenting er pushet.
