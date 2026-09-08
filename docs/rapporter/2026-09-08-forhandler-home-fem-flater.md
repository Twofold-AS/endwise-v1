# Rapport — F3-05 forhandler-hjem, kun fem flater

**Dato:** 8. september 2026  
**Roadmap:** F3-05 (innhold), F5-13 (chrome urørt)

## 1. Hva er gjort

- Forhandler `/home` (desktop B2 + telefon under chrome) viser **kun** Mikaels fem flater:
  1. Toppkort: Planlagt · Pågår · Ferdig (i dag) + Amicro dither-boble (denne måneden vs forrige)
  2. Innboks-rad: hvit rund boks + inbox · «Les alle siste meldinger» · hale-pil · siste-meldinger · mini-stats + nye/dag (grønn/rød vs vanlig)
  3. Lager-rad: venter på bestilling / trenger godkjenning
  4. Ansatte på jobb / totalt
  5. Hvit boks med + og «Jobb» → `/bookinger/ny`
- Fjernet: Svarhastighet, Timeplan-gulv, Team-liste (`PeopleShowcase`), Org/Hjelp-footer, døde nav-kort.
- Uten historikk: mock-tall + shadcn `Badge` `mock`. Aldri «For lite data».
- Ronny/profil-popup urørt. Chrome 389/598/452 + telefon top-bar 1+2 urørt.

## 2. Hva gikk galt

CodeQL (alert 84) fant en død `else mock`-gren i `PulseKort` — første visningsgren dekket allerede `mock`. Ingen funksjonell feil.

## 3. Hvilke fikser ble gjort

- `phone-home-pulse.ts` teller nå månedsvindu, innboks-rad og lager/ansatte i stedet for 7d-spark / SLA / Timeplan-gulv.
- `pulse-kort.tsx`: `PulseRadKort`, `PulseManedBoble`, `PulseJobbFlis`. `PulseFooter` slettet.
- Død mock-gren i `PulseKort` fjernet (CodeQL).
- Tester låst til de fem flatene.

## 4. Neste fase / neste steg

- Visuell GO på draft-PR (desktop B2 + telefon).
- Ikke merge før Mikael har sett skjermbildene.
- Ronny/profil er eget spor. Ikke #114/#119.
