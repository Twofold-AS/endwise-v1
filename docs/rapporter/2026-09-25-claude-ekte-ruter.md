# Økt: Claude Bit 1–7 + Fix A på ekte ruter

## Hva er gjort

- `/pr-review` fjernet (Mikael: ikke samleside, ikke commit mer av den).
- PR-only preview-ruter fjernet: `/kunder-preview`, `/jobber-preview`,
  `/lager-preview`, `/butikk-preview`, `/tjenester-preview`, `/org-preview`.
- Beholdt eldre GO-previews fra main: `/pulse-preview`, `/innboks-preview`,
  `/visual-forms-preview`, `/ia-chrome-preview`.
- Claude-designet lå allerede på produkt-rutene (delt skall, tRPC). Ingen
  ny duplisering. Tester peker på live-filene.

## Hva gikk galt

- `/pr-review` var allerede committet i `e731ecc` da planen ble endret.
  Fjernet i denne økten (ikke force-push).

## Hvilke fikser ble gjort

- `next.config.ts`: iframe-headers for preview-hub fjernet (var kun for `/pr-review`).
- Tester: `claude-pr-review.test.ts` slettet; Bit 2/6/7 sjekker live-ruter.

## Innlogging på Vercel-preview

- Ingen bypass. `(app)`-skallet sender uinnloggede til `/signin`.
- Samme Better-Auth som prod: e-post → 5-sifret kode / magic link i innboks.
  TOTP-app etterpå hvis kontoen har autentikator.
- Preview bruker Preview-env `APP_DATABASE_URL` (felles preview-DB, ikke
  produksjons-cookie). Magic-lenka peker på preview-verten (`VERCEL_BRANCH_URL`),
  ikke `endwise.no`. Kontoer som finnes i preview-DB-en virker.

## Neste steg

- Mikael logger inn på preview og går gjennom de ekte rutene. **Ikke merge #178.**
