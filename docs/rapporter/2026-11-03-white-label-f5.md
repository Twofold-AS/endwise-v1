# Øktrapport 03.11.2026 — White label F5 (adskilt admin)

**Roadmap:** F21-01 (white label-planens F5, Mons-review)
**PR:** én PR, stacked på F4. Ikke merget.

## 1. Hva er gjort

| ID | Resultat |
|---|---|
| F21-01 | `createAuth({ sone })`: platform-cookie `endwise-pl`, 15 min idle / 4 t absolutt, `@better-auth/passkey` bare på platform. Rolle × sone i `createRequestContext`. `/_plattform/logg-inn` (Endwise + Admin). `/endwise` og `/admin` bare på platform-vert. `noindex` + `X-Robots-Tag`. `audit_log` uendret append-only. |

## 2. Hva gikk galt

Vercel på F2–F4 feilet først (`redirect('/logg-inn')` vs typedRoutes). Fikset med `as Route` og cherry-pick opp stakken.

CI Lint/Test på F5: `mons-lock-7` og `resend-avsender` grep-et `erAuthDestinasjon(db, email)` etter at kallet ble `destinasjon(db, email)`. GitHub CodeQL: `js/polynomial-redos` på `erEnkelEpost`.

## 3. Hvilke fikser ble gjort

Typed Route på `(app)/template.tsx` (F2/F3/F4). Ny atferd i F5 bare når `ENDWISE_WHITE_LABEL=1`.

Tester matcher `erAuthDestinasjon` + `destinasjon(db, email)`. `erEnkelEpost` er lineær (ingen åpen `+`-regex).

## 4. Neste fase / neste steg

White label-planens **F5b** (support read-only og JIT). Ikke merget.
