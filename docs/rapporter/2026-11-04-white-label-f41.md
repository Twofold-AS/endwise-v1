# Rapport — F41 (invitasjon uten kode, merke og marked)

## Hva er gjort
- **F41-01:** Invitasjon er bare engangslenke. Ingen OTP-felt, ingen «Fikk ingen kode?». GET 20/min, POST godta 5/min, 1,2 s vent i UI.
- **F41-02:** Bedrifts-invite og login-e-post går som Endwise. Forhandler-navn/logo bare i kunde-e-post.
- **F41-03:** Platform-admin setter subdomene + firmanavn. Invitee velger visningsnavn (`tenant_branding`). Admin kan laste opp logo (Blob). Kundesider viser logo eller initial. Onboarding overskriver ikke `tenants.name`.
- **F41-04:** Invite-URL bor på app/platform. Godta lager sesjon + `Set-Cookie` (`__Host-`) på samme vert og lander `/oppstart` eller `/home`. Magic-link-landing på app er `/home` (ikke `/`, som er logg-inn).
- **F41-05:** endwise.no er bare marked. `/signin` uten kontekst 308 til app (bedrift). Med `tenant`/`slug` 308 til `<sub>.endwise.no`. Kundeflyt og kunde-e-post aldri til app. `/admin` 308 til platform. Nøytral tekst: «Hvis kontoen finnes, får du en kode på e-post.»

## Hva gikk galt
- Innloggingsløkken etter godta: invite + magic link satte kake på endwise.no. Cookie er `__Host-` uten `Domain=.endwise.no`, så app.endwise.no ser ingen sesjon. App `/` rewriter til logg-inn, så selv riktig app-verify som lander på `/` ser ut som en løkke.

## Fikser
- Invite-lenke på riktig vert; godta setter sesjon der.
- Apex uten innlogging; gamle lenker redirectes.
- `/signin` på app-verten beholdes for TOTP-verify.

## Neste
- F39-01 admin-redesign (Mikael designer).
- Ikke merge.
