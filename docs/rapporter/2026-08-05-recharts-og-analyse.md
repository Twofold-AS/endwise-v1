# Rapport — 05.08.2026 — Recharts inn som chart-motor · Analyse (F5-18) ferdig

**Roadmap:** F5-18 → `done`
**Godkjenning:** brukergodkjent §2-beslutning (Mikkis)

---

## 1. Hva er gjort

**Chart-motor:** `recharts@^3.10.1`, hentet inn shadcn-stil i
`packages/ui/src/components/chart.tsx`. Appene importerer aldri `recharts` direkte — samme regel
som for radix og lucide. Lagt i både `packages/ui` og `apps/web` (motion-fella fra 16.07).

**Fire grafer på Analyse**, alle på mock-data:

| Graf | Type | Serier |
|---|---|---|
| Bookingvolum, 30 dager | Søyle | Fullførte · Avlyste |
| Belegg og avlysningsrate, 12 uker | Linje | Belegg % · Avlysningsrate % |
| Sidevisninger, 30 dager | Areal | Sidevisninger · Startet booking |
| Hvor besøkende kommer fra | Liggende søyle | Besøk per kilde |

Pluss fire nøkkeltall i klartekst over grafene, og Live besøkende (MapLibre) nederst.

**Holdt rent:** kun søyle/linje/areal er eksponert fra barrel-en. Pai, radar, scatter, treemap,
sankey og radialbar er utelatt. Ingen glød, ingen 3D, ingen crosshatch, `isAnimationActive={false}`
overalt.

---

## 2. Hva gikk galt

### ⚠️ 2.1 Grafene lot seg ikke se i dette miljøet

Nettleserpanelet komposierer ikke (`document.visibilityState === 'hidden'`), så `ResizeObserver`
fyrer aldri. Recharts v3 tegner SVG-en først etter at `ResponsiveContainer` har målt bredden —
altså **har jeg ikke sett grafene tegnet**.

Forsøkt og forkastet: manuell resize-event (ResizeObserver bryr seg ikke), eksplisitt bredde på
wrapperen (samme), SSR-render (v3 gir kun `<div class="recharts-wrapper">`), headless nettleser
(ingen playwright/puppeteer/jsdom installert — og jeg legger ikke til en uten godkjenning).

**Kjør `pnpm dev` og åpne `/analyse` for visuell bekreftelse.**

### 2.2 Recharts v3 SSR-rendrer ikke SVG

Ikke en feil, men verdt å vite: prerendret HTML inneholder ingen graf. Sideeffekt — en graf i en
skjult container (`display:none`, uåpnet fane) tegner ingenting før den vises. Notert i
UI-PAKKER §2.

---

## 3. Hvilke fikser ble gjort

- `useId()` og ikke en teller for chart-id-en: SSR og klient må komme fram til samme id, ellers
  hydreringsfeil og feil farger i første frame. Kolon strippes (ugyldig i attributtselektor).
- Mock-merkingen leser `KILDE`-tabellen i `_data.ts` — samme kilde som forklaringsteksten. En graf
  kan ikke bli stående umerket fordi noen glemte merkelappen.
- Techstack oppdatert: Recharts ut av «bevisst ikke i bruk», dither-kit inn. §1-raden reversert.

---

## 4. Neste steg — koble ekte data

| Graf | Hva som mangler |
|---|---|
| Bookingvolum | Aggregat per dag over `bookings` (ruten finnes, aggregatet ikke) |
| Belegg | Kapasitet per mekaniker (F3-11) satt opp mot faktisk booket tid |
| Sidevisninger + Kilder | Vercel Web Analytics — krever deploy (F13-02) |
| Live besøkende | SSE fra kundewidgeten (apps/stream) |

**Verifisert:** typecheck (web/ui/api) ✓ · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓
51 ruter · `--color-*` løser til `#15b042` (lyst) / `#1ed27d` (mørkt) · recharts i klientbundelen
· recharts-selektorer i bygget CSS · ingen konsollfeil · roadmap 154 punkter, 0 duplikater.
Midlertidig verifiseringsrute slettet. Ikke pushet.
