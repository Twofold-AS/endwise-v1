# F0-15 oppfølging (ikke denne PR-en)

## Nonce + `strict-dynamic` via `proxy.ts`

Dagens CSP bruker `'unsafe-inline'` på `script-src` (Next uten nonce). ZAP 10055
står som WARN. Neste steg: per-request nonce i `apps/web/proxy.ts` (Next 16
erstattet `middleware.ts`), `'strict-dynamic'`, og fjern `'unsafe-inline'` i
produksjon. Krever at sidene som får nonce er dynamisk rendret.

## `baseline-browser-mapping@2.11.31`-unntak

`pnpm-workspace.yaml` har `minimumReleaseAgeExclude` for denne versjonen fordi
den lå i #181-lockfilen og var <24 t gammel 23.10.2026. Fjern unntaket når
versjonen er eldre enn `minimumReleaseAge: 1440` (etter 2026-10-23 18:27 UTC)
og kjør `pnpm install` på nytt.

## ACAO `*` på rot-HTML (ZAP 10098)

Kilde: Vercel-plattformen (`server: Vercel`), ikke `next.config.ts` `headers()`
og ikke Deployment Protection (preview svarte 200 uten auth-utfordring).
Samme `*` ligger på **produksjon** `https://endwise.no` (prerender +
`x-vercel-cache: HIT`). Prod-domenet er berørt. Vi setter aldri `*` selv.

## Sentry-region

`SENTRY_DSN` er tom (F0-14). Når DSN settes: EU = `*.ingest.de.sentry.io`
(eller `.eu.`). US/global = `ingest.sentry.io`. `connect-src` tar konkret host
fra DSN; ingen `*.sentry.io`-wildcard.
