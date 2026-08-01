# Arbeidsrapport — 30-dagers-språk + F14-17 offentlig personvernerklæring

**Dato:** 14. juli 2026 (økt 18) · **Kun dokumenter + roadmap.** Ingen kode.

---

## 1. 30-dagers-formuleringen — inn i veikartet (§4b)

Ny seksjon **§4b** i `docs/personvern/GDPR-og-AI-veikart.md`: **utkast til ordlyd, klar til
advokat**, om hva som skjer når en kunde ber om sletting.

Kjernesetningen:

> Vi sletter/anonymiserer opplysningene dine hos Endwise **umiddelbart**. Innhold som er behandlet
> av vår AI-databehandler (Mistral, EU) kan ligge i **inntil 30 dager** for sikkerhetsovervåking før
> det slettes automatisk. Vi kan ikke fjerne en enkelt melding fra denne mellomlagringen før
> fristen, men **den forsvinner innen 30 dager uansett**, og brukes ikke til noe annet formål eller
> til å trene AI-modeller.

**Hvorfor akkurat denne teksten:**

| Påstand i teksten | Hvorfor den er sann |
|---|---|
| «umiddelbart hos oss» | `eraseCustomer()` (F14-16) kjører synkront gjennom alle våre ledd før den svarer |
| «inntil 30 dager i AI-leddet» | Mistral lagrer input/output i 30 rullerende dager uten ZDR (kilde sitert) |
| «kan ikke fjerne én melding før fristen» | Vi har ingen API for det — samme faktum som gjør sletterapporten `partial` |

**Koden og teksten sier det samme.** Sletterutinen returnerer `partial` fordi Mistral-leddet består
i 30 dager; personvernerklæringen sier nøyaktig det til kunden. Det er ikke to sannheter, det er én.

**Modellen er Dara-modellen:** vi unngår ikke overføringen/mellomlagringen — vi **opplyser om den
og setter en frist**. Det er en legitim vei.

To ting som endrer avsnittet:

1. **ZDR innvilget (F14-11)** → hele 30-dagers-halen faller bort. *Den beste grunnen til å
   prioritere søknaden.*
2. **Fireworks-leddet** har ingen 30-dagers-hale (ZDR er standard). Halen gjelder **kun**
   Mistral, altså kun kundevendt AI-chat.

⚠️ **Merket [ADVOKAT]:** endelig ordlyd skal kvalitetssikres. Strukturen og de tekniske fakta er
våre; formuleringen som binder juridisk er ikke min å låse.

---

## 2. F14-17 — offentlig personvernerklæring (nytt roadmap-punkt)

Lagt inn i F14-portvakten. **Skilt fra F14-15 med vilje:**

| ID | Hva | Publikum |
|---|---|---|
| **F14-15** | Personvernerklæring + **subprosessorliste** | Compliance-artefakt (kan være teknisk/intern) |
| **F14-17** | **Offentlig åpenhetsdokument som publiseres og vises til sluttbrukerne** | Kunden som chatter med widgeten |

F14-17 er et **offentlig dokument**, ikke et internt notat. Modellen er `meetdara.no/dpa` og deres
personvernerklæring. Det skal minst dekke:

- Hvilke personopplysninger som behandles
- Behandlingsgrunnlag
- **Underdatabehandlere med land/region:** Mistral (EU), Fireworks (USA), Neon (EU), Vercel
  (fra1/EU), Resend, Twilio, Vegvesen
- Overføring utenfor EØS + grunnlaget (SCC for Fireworks)
- **Retensjon, inkl. 30-dagers AI-halen** (peker på §4b)
- De registrertes rettigheter + hvordan de utøves
- **AI-bruk (art. 50)**

**Merket [JURIDISK — vi lager utkast/struktur].** Innholdet må til advokat, men vi kan skrive
førsteutkastet selv — vi er de eneste som kjenner hele dataflyten. Det er også nettopp det F14-06
(compliance-artefakter generert fra kode) skal fôre inn i.

Kryssreferert til **F14-04** (art. 50), **F14-15** (subprosessorliste) og **F14-16**
(sletting/30-dagers-hale). Veikartets kryssreferansetabell er oppdatert.

---

## 3. Status

**Roadmap:** 32 ferdig · 10 pågår · 95 planlagt. F14-portvakten har nå **17 punkter**.

Ingen kode rørt. Ingen tester å kjøre. Ingenting pushet.

## 4. De to tingene du bør gjøre for at 30-dagers-halen skal krympe eller forsvinne

1. **Send ZDR-søknaden til Mistral (F14-11).** Blir den innvilget, forsvinner halen helt, og
   §4b + F14-17 forenkles til «slettes umiddelbart, også i AI-leddet».
2. **Få 30-dagers-retensjonen inn i DPA-en med Mistral (F14-09)** uansett — en formulering i en
   personvernerklæring er vår påstand; en formulering i DPA-en er et vilkår.
