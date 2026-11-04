# Rapport — F39 (subdomene, app.endwise.no, kundeselvbetjening)

## Hva er gjort
- **F39-02:** Platform-admin setter subdomene (`slugSchema`: reservert + format). Kollisjon i `tenants.create`. Onboarding viser kopierbar kundelenke. Forhandler kan ikke endre slug.
- **F39-03:** Host-sone `app`. `app.endwise.no` / `app.localhost` → `/_bedrift/logg-inn` (e-post + kode + 2FA). `(app)` serveres her. Kundevert har ikke Privat/Bedrift. `app` er reservert slug. `*.endwise.no` dekker DNS.
- **F39-04:** Kundelogg inn med e-post eller telefon hvis kunden finnes (Endwise eller Quick). Samme svar. 5/time. GDPR-varsel ved første innlogging. Ingen massee-post.
- **F39-01** (admin-redesign) er ikke denne PR-en.
- **F38-07** (invitasjonskode) er egen PR: https://github.com/Twofold-AS/endwise-v1/pull/211

## Hva gikk galt
- `app` var allerede reservert som «historisk» (ADR-005 droppet den). Nå er den egen sone.
- `__Host-`-kake kan ikke deles på tvers av subdomener. Ansatte jobber derfor på `app.endwise.no`, ikke på `<slug>.endwise.no`.

## Fikser
- Host-ruting, auth-sone `app`, dest-splitt (`erAnsattDestinasjon` / `erKundeHostDestinasjon`).
- 0060: `customers.gdpr_ack_at`.
- ADR-005 og roadmap oppdatert.

## Neste
- F39-01 admin-redesign.
- Rebase mot #211 hvis den merges først (journal idx 59).
- Ikke merge.
