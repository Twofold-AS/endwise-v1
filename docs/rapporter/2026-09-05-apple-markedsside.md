# Rapport — 05.09.2026 — Apple-markedsside endwise.no (F5-35)

**Roadmap:** F5-35 (`done`, Jonas-fasit 05.09.2026)  
**Godkjenning:** Jonas-fasit 05.09.2026. Mikael via Jonas samme dag: primær CTA «Prøv Endwise». H1 urørt.  
**PR:** draft, ikke merge.

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F5-35** | Offentlig `/` byttet til Apple-markedsflate i repoet. Ingen Framer-redirect å erstatte — ruten var allerede Next `apps/web/app/page.tsx`. |

**Flate (rekkefølge låst):**
1. Hero — H1 «Verkstedet, samlet.» + én linje, primær `Prøv Endwise` (`#111`), sekundær Logg inn, ett produktspor
2. Tre like løfter: Booking · Innboks · Verkstedet
3. Produktskudd: desktop + telefon Min dag (tekst/bilde veksler én gang)
4. Pris Start 4 490 / Pro 8 490 / Enterprise 12 490 eks. mva (fra `TIERS`, Pro valgt)
5. Kort tillitslinje (Quick + Vegvesen/Autosys, ingen logo-vegg)
6. Bunn-CTA + footer (personvern, vilkår, kontakt)

**Nye ruter:** `/personvern` · `/vilkar` · `/kontakt`  
**Utenfor:** dealer-chrome, sticky megameny, «Start gratis», grønn CTA, blobatar, roadmap-rød.

## 2. Hva gikk galt

Alt gikk som planlagt. `endwise-landing-fasit.md` lå ikke i repoet — fasiten er oppgaven + Jonas-datoen. Eksisterende `public/images/*.jpg` er arkitektur, ikke UI, og brukes ikke som produktskudd.

## 3. Fikser

- Sesjonsporten i `page.tsx` urørt (innlogget → `session.me.landing`).
- Pris leses fra `TIERS` (SMS-lås 4490/8490/12490), ikke skrevet inn på nytt.
- `ProduktRamme`: fast aspect, bytt `kilde` senere uten reflow.
- Mikael via Jonas: primær CTA hero/nav/footer = «Prøv Endwise». Priskort beholdt «Ta kontakt».

## 4. Neste steg

- Bytt `BILDE_SLOTS.*.kilde` når ekte UI-skjermbilder er lastet opp.
- F14-17: full offentlig personvernerklæring (sidene nå er inngang, ikke ferdig juss).
- Preview: `pnpm --filter @endwise/web dev` → `http://localhost:3000/`
