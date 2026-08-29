# Rapport — Suspense rundt Verkstedet useSearchParams (29.08.2026)

## Hva er gjort

- **F5-13:** Produksjonsbygg av main (#85 squash, 867eb92) feilet på prerender av `/dashboard` og `/verkstedet`.
- `VerkstedetPage` kalte `useSearchParams()` i default-eksporten uten Suspense-grense.
- Samme mønster som saker/innboks/kunder: `VerkstedetPageInner` leser query, default-eksporten er `<Suspense><VerkstedetPageInner /></Suspense>`.
- `/verkstedet` re-eksporterer fortsatt `../dashboard/page` — ingen ny IA.

## Hva gikk galt

Vercel-prod (`dpl_EHAH76yo9savDvwJnWQ6fZeE3ntb`) feilet. tsc/vitest fanget det ikke. Context7 MCP var ikke autentisert; mønsteret er hentet fra eksisterende sider i repoet.

## Hvilke fikser ble gjort

- `apps/web/app/(app)/dashboard/page.tsx`: wrap som saker.
- Lock-test i `phone-home.test.ts`.

## Neste fase / neste steg

- Merge når CI er grønn. Ikke merget herfra.
