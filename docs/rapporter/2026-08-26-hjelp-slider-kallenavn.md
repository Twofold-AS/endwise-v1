# 26.08.2026 — Hjelp-slider tilbake + kallenavn for alle

## Hva er gjort

- **F5-23:** TipCard i forhandler-sidebar returnerer ikke lenger `null` når lista er tom (eller bare test-artikler). Hjelp-chrome står over Innstillinger; X minimerer, utvid åpner, refresh husker.
- **F5-19 / F7-06:** Kallenavn er et ekte felt i samme identitetsblokk som visningsnavn og e-post. `kanHaKallenavn` slipper inn alle innloggede roller. Chrome bruker `session.me.internNavn` (`member_profiles.nickname`, ellers visningsnavn).

## Hva gikk galt

#60 skjulte slideren med `if (rader.length === 0) return null`. Kallenavn var med vilje stengt for `dealer_admin` og ble derfor en død merknad på `/innstillinger/profil`.

## Fikser

- Tom slider = synlig Hjelp-bar (minimert som default uten lagret valg), ikke slettet widget.
- `profile.setNickname` lagrer for `dealer_staff` og øvrige roller på eksisterende `nickname`-kolonne.

## Neste

Verifiser live at Yamaha-forhandler ser Hjelp-chrome og kan lagre kallenavn.
