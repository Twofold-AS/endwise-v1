# Øktrapport — 3. september 2026 (manuell kode: Logg inn utenfor feltet)

## 1. Hva er gjort

- **F1-02:** På «Skriv kode manuelt» er kodefeltet input-only. «Logg inn» er flyttet ut av inset-boksen og ligger som fullbredde-knapp i samme stakk, rett over «Send på nytt».
- **F1-02:** Shared `busy` er splittet med `handling`. Bare den trykte knappen viser pending (Logg inn ved kode-submit). «Send på nytt» animerer ikke lenger samtidig.
- Magic-link-verify og TOTP-regler er urørt. Uenrollert lander fortsatt aldri på `steg=totp`.

## 2. Hva gikk galt

Alt gikk som planlagt. Hypotesen om Input-addon/end-slot var feil: «Logg inn» satt inne i samme `bg-inset`-form som feltet (ikke et Input-addon). Shared `isPending`/`busy` på begge knapper var riktig.

## 3. Hvilke fikser ble gjort

- Felt-formen (`#signin-manuell-kode`) inneholder bare kode + feiltekst.
- «Logg inn» er `type=submit` med `form="signin-manuell-kode"` i knappe-stakken.
- `knappState('logg-inn' | 'send-nytt' | …)` binder StatefulButton-pending per handling.
- Låst i `apps/web/test/signin-steg.test.ts`.

## 4. Neste steg

Merge etter visuell review av venteskjermen. Ingen auth-protokoll-endring. Ikke gå videre til senere F1-fase fra denne polishen.
