# Transaksjonell e-post — forhåndsvisning

HTML-kopier av malene Resend faktisk sender. `index.html` viser hver mal i 600px (desktop) og 375px (telefon).

Genereres med:

```
node --experimental-strip-types packages/auth/scripts/epost-forhaandvisning.ts
```

Logoen i disse filene er `data:`-URI **kun for forhåndsvisning**. Ekte sending bruker `cid:`-vedlegg (Gmail/Outlook fjerner `data:` i `src`).

Stengt og ikke vist: `sendTwoFactorOtp`, `sendPasswordReset`.
