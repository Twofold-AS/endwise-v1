# Rapport — 25.08.2026 — Ansatte › Kompetanse og Timeplan

**Roadmap:** F3-08 (progress, kompetanse-UI levert) · F3-12 (done, flate på plass)
**Gren:** `cursor/ansatte-kompetanse-timeplan-ee5b` mot `main`

## 1. Hva er gjort

### Hypotese
Begge sidene under Ansatte var tomme skall. **Bekreftet:**  
`/mekanikere/kompetanse` og `/mekanikere/kapasitet` rendret `<Placeholder>`.

### F3-08 / F3-12 — Kompetanse
Ekte liste + redigering på `/mekanikere/kompetanse`:
- Ferdighetskatalog (`competence.listSkills` / `upsertSkill`)
- Kompetanse per mekaniker (`listAllMechanicSkills` / `setMechanicSkill` / `removeMechanicSkill`)
- Nivå som ord (Under opplæring … Spesialist), sert. t.o.m. med 60-dagers varsel — samme språk som Min kompetanse
- Skriving bak `adminProcedure`; lesing åpen for innloggede i tenanten

### Timeplan
Ekte liste + redigering på `/mekanikere/kapasitet`:
- 7-dagers stripe + jobber via `bookings.calendar` (samme modell som mekanikerens Timeplan / Min dag)
- Kapasitet skrives til `mechanics.capacity` (`mechanics.updateCapacity`, 1–10)
- Ingen ny tabell, ingen annen timeplan-modell

### Produktlås
- Sidebar-barn forblir Team · Prisliste · Kompetanse · Timeplan (ikke Kontor/Gulvet)
- Prisliste og Tjenester & priser er urørt
- Ingen trekk mot #28, Quick CONNECT, Stripe, invite-DB eller helpdesk-slider #46

## 2. Hva gikk galt
Alt gikk som planlagt. Context7-MCP var ikke tilgjengelig i miljøet; API-ene er de eksisterende tRPC-ruterne, ikke nye biblioteker.

## 3. Fikser
- `competence.listAllMechanicSkills` så lista slipper N kall mot `listMechanicSkills`
- `updateMechanicCapacity` med RLS-sjekk (A kan ikke skrive B sin mekaniker)

## 4. Neste steg
- F3-08: ferdighetsmerker på selve `/mekanikere`-lista (dataene finnes nå)
- F3-05: aggregat på dashboard mot samme kapasitet
