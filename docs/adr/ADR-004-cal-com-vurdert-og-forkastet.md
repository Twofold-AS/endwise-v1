# ADR-004 — cal.com (self-host) vurdert og forkastet

**Status:** **Forkastet.** Vi fortsetter med egen booking-motor (F3-01).
**Dato:** 14. juli 2026 · **Besluttet av:** Mikkis

---

## Kontekst

Spørsmålet som ble stilt: kunne vi self-hoste cal.com i stedet for å bygge og vedlikeholde en
egen booking-motor?

Rimelig spørsmål — cal.com er modent, åpent, og løser «finn en ledig tid og book den».

## Beslutning

**Nei.** Fire grunner, i rekkefølge etter vekt:

### 1. Domenet er feil

cal.com booker **møter**: én person, én kalender, ett tidsvindu. Endwise booker **verkstedkapasitet**:
en mekaniker med *ferdigheter* (`mc-eu`, `båtmotor`), en *tjeneste med versjonert varighet*, et
*kjøretøy* med EU-frist, og en *matching-regel* som avgjør hvem som kan ta jobben.

Slot-låsen vår er per **(tenant, mekaniker)**. Konflikten vi beskytter mot er ikke «to personer
vil ha samme møtetid» — det er «to bookinger legger beslag på samme mekaniker». Det er en annen
modell, ikke en konfigurasjon av den samme.

### 2. Motoren er allerede bygget — og bevist

F3-01 er ferdig: livsløps-maskin, `pg_advisory_xact_lock`, konfliktdeteksjon, idempotensnøkler.
**9 tester grønne mot ekte Postgres**, inkludert samtidighetstesten (to parallelle bookinger på
samme slot → nøyaktig én vinner). Å bytte den ut nå ville vært å kaste noe som virker for noe som
må formes om til å passe.

### 3. AGPL-3.0

cal.com er AGPL. Endwise er et SaaS-produkt vi selger. AGPL-ens nettverksklausul er ikke noe man
«ser an» — den er nettopp designet for å treffe SaaS. Enten kjøper vi kommersiell lisens, eller så
lever vi med en juridisk usikkerhet i kjernen av produktet. Ingen av delene er attraktive når
alternativet er kode vi allerede eier.

### 4. Drift

Techstack §0: «Vercel hele veien. Én leverandør.» cal.com self-host er en Next.js-app + egen
Postgres + egne migrasjoner + egen oppgraderingssti. Det er et helt system til å holde i live —
og det ville sittet mellom oss og vår egen database.

## Konsekvenser

- Ingen endring i techstack eller roadmap.
- Vi eier booking-domenet selv. Det betyr at F3-02 (mekaniker-matching), F3-03 (kalender-API) og
  F3-04 (varsling) også er våre — men de er *små* når motoren først står.
- Skulle vi senere trenge møtebooking (f.eks. «avtal en prat med selger»), er cal.com fortsatt et
  fornuftig verktøy for **det** — men da som en integrasjon, ikke som fundamentet.
