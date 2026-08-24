# Rapport — 24.08.2026 — Reset-token + innboks-navn (F1-16, F5-11)

**Roadmap:** F1-16 · F5-11 / F5-25 (bugfiks, allerede `done`/`progress`)
**Godkjenning:** Mikael (eksplisitt bestilling)

---

## 1. Hva er gjort

| ID | Hva |
|---|---|
| **F1-16** | `/nytt-passord` viser skjemaet etter ekte e-postklikk. Tokenet overlever at query-strengen strykes. |
| **F5-11** | Endwise-innboks: listerad = kun forhandler-/verkstednavn. Tråd = personens visningsnavn. Rolle = Forhandler-admin / Endwise-admin / Endwise-support — aldri «Ansatt». |

### Filer

**`apps/web/app/nytt-passord/reset-token.ts`** — `lesResetToken` (`token` / `token_hash` / `hash`), `resetLenkeFeil` (`error`), `beholdForsteToken`. **`page.tsx`** bruker dem; `setToken(params.get('token') ?? null)` er borte.

**`apps/web/app/(app)/innboks/_lib.ts`** — `supportRadTittel` er liste (kun tenant). `supportTradTittel` / `supportRolleEtikett` / `forsteMotpartNavn` / `authorLabel` nekter «Ansatt» som navn.

**`[id]/page.tsx`** — trådhode og meldingsforfatter bruker visningsnavn + ekte rolle. **`directory.ts`** + **`navnForDealerOgEndwise`** returnerer `member.role` (`authorRolle` / `kontaktRolle`).

Ingen migrasjon. Ingen Admin-tab, ingen butikk, ingen `setActive`.

## 2. Hva gikk galt

**F1-16:** Hypotesen stemte. Sida leste `?token=`, `history.replaceState` tømte query, `useSearchParams` ble tom, effekten kjørte på nytt med `[params]` og `setToken(null)`. Skjemaet ble byttet ut med «Denne siden må åpnes fra lenken i e-posten».

**F5-11:** `supportRadTittel` satte person + forhandler på lista. I tråden ble `rolle: 'ansatt'` hardkodet, så `dealer_admin` ble vist som «Ansatt».

## 3. Hvilke fikser ble gjort

1. Behold første ikke-tomme token i state. Strip query etter lesing. Godta Better Auths `token` / `token_hash` / `hash` / `error`. Ingen token i logg. Ingen verify-orakel.
2. Liste vs tråd delt. Rolleetikett bare for de tre navngitte rollene. `directory.participants` og platform-støtte returnerer ekte `member.role`.

`sendResetPassword` satte allerede `?token=` — uendret, låst i test.

## 4. Neste fase / neste steg

F5-11 står `progress`: support-endwise-agent som førstelinje gjenstår. Ingen ny fase startet.

---

**Tester:** `apps/web` 15 filer / 95 tester grønne. `messages-platform` source-lås grønn (DB-tester hoppet over uten `DATABASE_URL`). Typecheck web / modules / api grønn.
