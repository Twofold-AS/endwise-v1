# Endwise — arbeidsregler (MINNE, gjelder alltid)

Disse reglene er bindende for ALT arbeid i Endwise-prosjektet. Les dem før hver økt.

## 1. Roadmap er én kilde til sannhet
- **Før** enhver oppgave: verifiser mot `docs/endwise-roadmap.html` (`const ROADMAP` i fila) at oppgaven finnes, hvilken fase/ID den hører til, og at forrige fase er ferdig.
- **Etter** enhver oppgave: verifiser resultatet mot roadmap-punktets ordlyd.
- **Oppdater roadmap-fila** (`status: planned | progress | done | blocked`) hver gang en oppgave eller fase fullføres. Ingen fullført oppgave uten statusoppdatering.
- Ikke gå videre til en senere fase før den gjeldende er ferdig og verifisert.

## 2. Techstack følges 100 %
- `docs/endwise-techstack.md` er kanonisk. **Ingen avvik, ingen egne valg, ingen tillegg** i stacken.
- Ser du noe fra «Døde valg»-kolonnen eller fra §6 «Hva vi bevisst IKKE bruker» (Hetzner, NestJS, BullMQ, QStash, Trigger.dev, Redis som fast avhengighet, Unleash, Cloudflare WAF, WAL-G, Lucia, Postmark …) — det er en feil som skal fjernes.
- Trenger stacken en endring: stopp og spør. Ikke improviser.

## 3. Dokumentasjon hentes ferskt (context7)
- Bruk context7 MCP (`resolve-library-id` → `query-docs`) for **hver** teknologi før den tas i bruk.
- Ikke stol på hukommelsen for API-er, versjoner eller konfigurasjonsformat.

## 4. UI bygges av eksterne pakker — les `docs/UI-PAKKER.md` FØR du lager UI
- Endwise bruker i hovedsak komponenter, loaders og charts fra **eksterne pakker** (shadcn/ui, dither-kit, beUI, matrix-loaders), ikke egenbygde primitiver.
- **Før** du skriver en UI-komponent: les `docs/UI-PAKKER.md`. Dekker en pakke behovet — bruk den. Mangler komponenten, men pakken har den — hent den inn.
- Egen kode skrives **kun** når ingen pakke dekker behovet, og da noteres begrunnelsen i `docs/UI-PAKKER.md` §7.
- Tas en ny UI-pakke inn: **oppdater `docs/UI-PAKKER.md`** i samme økt (hva, hvordan installert, versjon/commit-pin, lisens, hvor den ligger).

## 5. Rapport etter hver arbeidsøkt (på norsk)
Hver økt avsluttes med en rapport som inneholder:
1. **Hva er gjort** (per roadmap-ID)
2. **Hva gikk galt** (feil, blokkeringer) — eller eksplisitt bekreftelse på at alt gikk som planlagt
3. **Hvilke fikser ble gjort**
4. **Neste fase / neste steg**
