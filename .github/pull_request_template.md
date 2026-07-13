## Hva
<!-- Roadmap-ID(er), f.eks. F0-03 -->

## Roadmap-verifisering
- [ ] Verifisert mot `docs/endwise-roadmap.html` FØR arbeid
- [ ] Verifisert mot roadmap ETTER arbeid
- [ ] Roadmap-status oppdatert
- [ ] Ingen avvik fra `docs/endwise-techstack.md`

## ASVS L2-sjekkliste (obligatorisk for auth / betaling / tenant-grenser — L3 for auth+betaling)
- [ ] V1 Arkitektur: tenant-grense dokumentert for endringen
- [ ] V2 Auth: ingen bypass av obligatorisk 2FA; sesjons-ID roteres ved privilegie-endring (CWE-384)
- [ ] V3 Sesjon: 60-min idle-timeout håndhevet serverside (CWE-613)
- [ ] V4 Tilgangskontroll: RLS dekker alle nye tabeller; cross-tenant-test lagt til
- [ ] V5 Validering: all input Zod-validert; output-encoding på plass
- [ ] V7 Feil/logg: ingen hemmeligheter i logg; audit-logg for kritisk operasjon
- [ ] V9 Kommunikasjon: TLS, sikre cookie-flagg
- [ ] LLM Top 10 (hvis AI-lag berøres): tool-output behandlet som data, ikke instruks

## Sikkerhetsfunn
- [ ] CodeQL/Semgrep: null åpne funn
- [ ] `pnpm audit`: ingen high/critical
