# Team-redesign — 26. august 2026

## Hva er gjort (F1-10 / F1-14 / F5-19 / F3-08)

- Team (`/innstillinger/team`, alias `/ansatte`) har piller Alle · Mekanikere · Selgere · Support via `?fane=`.
- Filteret er eksisterende `job_function` — ingen nye roller.
- Én handling **Inviter ansatt**: med e-post → `invitasjoner.opprett`, uten e-post → `team.opprettUtenInvitasjon`.
- Detaljer-rute som Innboks: person, jobber, e-post, passordreset (bekreft), 2FA-av (bekreft + kode til lederen), slett/deaktiver (bekreft), kompetanse og timeplan per person.
- Bunnknappene på Team-fanen er borte. Sidebar Kompetanse og Timeplan står. Ingen Admin-tab. Ingen Kontor/Gulvet.

## Hva gikk galt

Alt gikk som planlagt. Slider- og kallenavn-/profilfiler er ikke rørt. Forhandler-nav fra #60 er urørt.

## Fikser

- Nye tynne admin-ruter i `team`: `jobber`, `endreEpost`, `sendPassordendring`, `slaAv2faStart`, `slaAv2fa`, `fjern`. Alle `adminProcedure`.
- 2FA slås aldri av uten engangskode (SHA-256 i `verification`).

## Neste steg

- Live-sjekk av e-post (invitasjon, reset, 2FA-kode) mot Resend.
- Mekaniker- og Lager-nav urørt; Hjelp-slideren eies av en annen agent.
