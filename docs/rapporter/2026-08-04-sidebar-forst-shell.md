# Rapport — 04.08.2026 — Sidebar-først shell bygget (F5-13…F5-19, F5-21)

**Roadmap:** F5-13 → `progress` · F5-14 → `progress` · F5-15 → `progress` · F5-16 → `done` ·
F5-17 → `progress` · F5-18 → `progress` · F5-19 → `progress` · F5-21 → `done`
**Godkjenning:** brukergodkjent 04.08.2026 (Mikkis)

---

## 1. Hva er gjort

**Shellet (F5-13).** Sidebaren er nå ytterst i DOM-en og går topp→bunn; topbaren ligger innenfor
innholdskolonnen og viser kun breadcrumb. Rekkefølgen i markup-en sier det samme som hierarkiet i
hodet.

`_shell/nav.ts` er skrevet om fra to-nivå (`SECTIONS`) til én ordnet liste med valgfrie `children`.
Samme fil styrer nå tre ting i stedet for to: sidebar-radene, breadcrumben og treffene i ⌘K.

**Destinasjonene.** Innboks (dropdown Kunder/Intern/Endwise, per-kanal-teller) · Saker
(liste↔kalender) · Kunder (dropdown Kunder/Kjøretøy) · Samarbeid · Analyse · AI-innsikt ·
Kundestøtte · Settings forankret nederst med fire underseksjoner.

**Kontekst-dropdown med tre kontekster.** Forhandler · Mekaniker (krever mekanikerprofil) ·
Endwise-admin (kun `endwise_admin`). Sistnevnte er en **bevisst tom** flate på `/endwise`.

**Logo (F5-21):** `#FFFFFF` → `#000000`.

---

## 2. Hva gikk galt

### ⚠️ 2.1 Radix kunne ikke importeres i appen

Første utkast importerte `radix-ui` direkte i `apps/web`. Det kompilerte ikke — pakken er
deklarert i `packages/ui`. Den enkle fiksen (legge den til i appens `package.json`) ville brutt
UI-PAKKER §5: apper importerer ikke primitivbiblioteket direkte.

**Riktig fiks:** hentet inn `dropdown-menu` og `dialog` som shadcn-komponenter i `packages/ui`.
Da bor dropdown-utseendet ett sted, eierens mål (rader 40px, radius 10px) er bakt inn i
komponenten, og appen slipper å deklarere `radix-ui`.

### ⚠️ 2.2 `useSearchParams()` i shellet veltet hele bygget

`next build` feilet på sider som ikke rører query i det hele tatt — `/admin/flagg`,
`/mekanikere/kapasitet`, `/innstillinger/tjenester`. Rotårsak: Sidebar og TopBar leser
`useSearchParams()`, og uten en suspense-grense trekker det **hele app-treet** ut av statisk
prerender.

**Fiks:** `<Suspense>` rundt Sidebar og TopBar i `(app)/layout.tsx`, og rundt `/saker` og
`/meldinger` som leser query selv. Kommentert i alle fire filene — dette er en felle som kommer
tilbake neste gang noen leser query i shellet.

### ⚠️ 2.3 To lucide-slugger er døpt om

lucide 0.548: `circle-help` → `CircleQuestionMark`, `filter` → `Funnel`. Eiers SVG-filnavn i
ikonregisteret må enten følge de nye navnene, eller codegen-steget (F5-20) må mappe dem. Notert i
`icons.ts`.

### ⛔ 2.4 Analyse er blokkert på chart-motor

Flaten er scaffoldet, men det finnes ingen chart-motor. Fire grafplasser står som eksplisitte
«Mangler graf»-plassholdere som sier hva som mangler og hvorfor. Ingen avhengighet installert —
det krever en §2-beslutning.

---

## 3. Hvilke fikser ble gjort

- 24 nye lucide-navn i `icons.ts` (bygget mot barrel-en, så F5-20-byttet blir sømløst).
- `/bookinger` og `/kalender` ble **redirects**, ikke slettede filer — varsler (F3-04) og
  bokmerker peker dit.
- `/integrasjoner/ai` → `/ai-innsikt` med redirect.
- `PARKED_LABEL` i `nav.ts`: de parkerte rutene (marked, admin, mekanikere, tjenester) er ute av
  navet, men **fortsatt søkbare i ⌘K**. En rute ingen kan finne, blir slettet ved et uhell.
- ⌘K bygget på `Dialog` i stedet for shadcns `command`, som ville krevd `cmdk`.

**Verifisert:** typecheck (web/ui/api) ✓ · Biome ✓ (3 pre-eksisterende funn) · `next build` ✓
**51 ruter** · 16 nye/remappede ruter svarer 200 · lyst tema, sidebar `rgb(250,250,250)`, valgt
`rgb(237,237,237)`, rader 40/44px, kontroller 32px/10px verifisert live i nettleser · logo
`#000000` · ingen konsollfeil.

**IKKE verifisert:** ingenting er kjørt mot ekte database. Kontekst-dropdown, uleste-tellere og
rollegating er ikke sett med ekte sesjon — krever `pnpm dev` + Docker-Postgres.

---

## 4. Neste steg

1. **§2-beslutning: chart-motor.** Blokkerer F5-18.
2. **Kalendervisning (F3-07)** — den eneste tomme visningen i Saker.
3. **Sidebar-kollaps + mobilvariant** — `panel-left-close/open` er bestilt i ikonregisteret, men
   sidebaren er fast 248px i dag.
4. **F5-20 ikon-codegen** når SVG-ene finnes.
5. **Samarbeid-backend** venter på juridisk avklaring (F14-07).
