# Disarto Regular (vendorisert, kuratert)

Kilde: https://github.com/Disarto/disarto-icons
Pinnet commit: `d536bd59ae5c1baa8e7d07b599bb51946e113eb9` (Disarto Icons 1.0.0)
Hentet: 7. september 2026 (Mikael GO)
Lisens: MIT — se `LICENSE`
Variant: **Regular** (`packages/static/icons/regular/*.svg`), ikke Solid

## Hvorfor vendor, ikke npm

Én barrel (`@endwise/ui` → `icons.ts` → `createLucideIcon`). Å ta inn
`disarto-icons-react` som andre API ville gitt to ikonsett side om side.
Filene ligger derfor som SVG i denne mappa og går gjennom
`scripts/build-icons.ts` — samme F5-20-rør som eierens egne strek-SVG-er.

## Hva som er hentet

Kun chrome / sidebar / hjem-kort, pluss eksakte kebab-treff der.
Full mapping: `docs/notater/disarto-ikoner.md`.

**Ikke tegnet / ikke byttet:** `hard-hat` · `handshake` · `bike` · `sailboat` ·
`clock-arrow-up` — beholdes som lucide eller eier-SVG til de er tegnet.

## Format

Disarto Regular er **fylte evenodd-path-er** med `fill="currentColor"`,
ikke lucide-strek. Codegen setter `fill: currentColor` + `stroke: none`.
Det er med vilje (Mikael 07.09.2026): aksepter filled-path, ikke tving strek.

## Oppdatering

Hent Regular-SVG-er på nytt fra samme pin (eller ny pin etter avtale).
Ikke ta inn hele settet. Ikke installer `disarto-icons-react`.
