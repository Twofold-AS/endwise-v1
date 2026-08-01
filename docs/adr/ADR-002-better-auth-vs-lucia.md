# ADR-002 — Better-Auth vs Lucia

**Roadmap:** F1-09 (spike, 1 dag)
**Status:** **Avgjort — Better-Auth 1.x.** Lucia forkastes som fallback.
**Dato:** 14. juli 2026
**Kilder:** Better-Auth-dokumentasjon hentet ferskt via context7 (`/better-auth/better-auth`, v1.6.23)

---

## Kontekst

Roadmap F1-09 ber om en spike på tre spørsmål før F1-01 og F1-03 kan bygges:

1. **phone-OTP-flyten** — dekker Better-Auth Twilio Verify?
2. **RLS-samspill** — tåler Better-Auth-tabellene at RLS er på?
3. **revoke-alle** — kan alle sesjoner for en bruker trekkes tilbake?

Techstacken har allerede pekt på Better-Auth (§1, «Lucia (hånd-rullet auth) → Better-Auth 1.x»). Spiken er derfor en **verifisering**, ikke et åpent valg — men den skulle kjøres, og et rødt svar ville tvunget fram Lucia.

---

## Funn

### 1. Phone-OTP med Twilio Verify — ✅ grønt

`phoneNumber`-pluginen har både `sendOTP` og `verifyOTP`. `verifyOTP` overstyrer den interne verifiseringen, som er nøyaktig det Twilio Verify krever: Twilio eier koden, vi spør bare «er den gyldig?».

```ts
phoneNumber({
  sendOTP: ({ phoneNumber }) => twilio.verify.v2.services(SID)
    .verifications.create({ to: phoneNumber, channel: 'sms' }),
  verifyOTP: async ({ phoneNumber, code }) => {
    const check = await twilio.verify.v2.services(SID)
      .verificationChecks.create({ to: phoneNumber, code });
    return check.status === 'approved';
  },
})
```

Rate-limiting og cooldown (ADR-002-kravet) dekkes av `rateLimit.customRules` per sti. Brute-force-beskyttelse på OTP-forsøk er innebygd.

### 2. RLS-samspill — ⚠️ gult, med en klar regel

**Dette er spikens viktigste funn.** Better-Auth snakker med databasen gjennom sin egen adapter (Drizzle), med applikasjonens DB-rolle — men **uten** vår tenant-kontekst. `withTenant()` setter `app.tenant_id` per transaksjon; Better-Auth kjører utenfor de transaksjonene.

Slår vi på RLS med `tenantPolicy` på Better-Auth-tabellene (`user`, `session`, `account`, `verification`), vil `current_setting('app.tenant_id')` være NULL under innlogging — og **login låser seg selv ute**. Slår vi på RLS *uten* policy, er default-deny, og det samme skjer.

**Regelen som gjelder fra nå:**

| Tabellgruppe | RLS | Isolasjon |
|---|---|---|
| Better-Auth-tabeller (`user`, `session`, `account`, `verification`, `two_factor`, `passkey`) | **AV** | Globale identiteter. En bruker er én rad, uavhengig av forhandler |
| Better-Auth organisasjonstabeller (`organization`, `member`, `invitation`) | **AV** | Medlemskapet *er* tenant-grensen — den kan ikke isoleres av seg selv |
| **Alle domenetabeller** (`tenant_modules`, bookinger, kjøretøy, meldinger …) | **PÅ** | `tenantPolicy` + `withTenant()` |

Broen mellom lagene: `organization.id` **er** `tenant_id`. Etter innlogging slår vi opp brukerens aktive organisasjon, og alle domenespørringer går gjennom `withTenant(orgId)`. Tenant-isolasjonen håndheves altså av RLS på domenelaget, og av medlemskapssjekk (`assertMember`) på auth-laget.

Dette er ikke et avvik fra F0-03 («RLS på hver tabell») — det er en presisering: RLS på hver tabell **som har `tenant_id`**. Better-Auth-tabellene har det ikke, og skal ikke ha det.

F1-08 (cross-tenant-tester i CI) må derfor teste **begge** mekanismene: RLS-lekkasje på domenetabeller *og* medlemskapsomgåelse på auth-laget.

### 3. Revoke-alle — ✅ grønt

`revokeSessions()` (alle) og `revokeOtherSessions()` (alle unntatt gjeldende) finnes. Forutsetning: sesjoner må ligge i DB (`storeSessionInDatabase`), og `session.cookieCache` må være **av** eller kortlevd — en cookie-cachet sesjon overlever revoke fram til cachen utløper. **Vi kjører uten cookie-cache.** Latency-kostnaden er ett DB-oppslag per request; det er prisen for at «logg ut alle enheter» faktisk betyr noe.

### 4. Sesjonskravene fra F1-12 — ⚠️ delvis innebygd

| Krav | Better-Auth | Vår løsning |
|---|---|---|
| 60 min idle-timeout, sliding | `expiresIn` + `updateAge` gir glidende vindu | `expiresIn: 3600`, `updateAge: 300` |
| **Absolutt maks-levetid** | **Finnes ikke** | Eget sesjonsfelt `absoluteExpiresAt` + serverside-sjekk i `requireSession()` |
| Serverside-invalidering | ✅ (DB-sesjoner) | cookie-cache av |
| Sesjons-ID roteres ved 2FA (F1-11, CWE-384) | ✅ innebygd — 2FA-hooken sletter delsesjonen og lager ny etter verifisering | — |

### 5. Obligatorisk e-post-2FA (F1-11)

`twoFactor`-pluginen med `otpOptions.sendOTP` sender koden via Resend. «Ingen bypass, ingen husk-enhet» betyr: `trustDevice` skal **aldri** settes, og `twoFactorEnabled` tvinges på for hver `dealer_admin`/`dealer_staff`/`endwise_admin` ved opprettelse.

---

## Beslutning

**Better-Auth 1.x.** Alle tre spike-spørsmålene er grønne eller håndterbare med kjent kode. Lucia-fallbacken utløses ikke, og Lucia forblir på «døde valg»-lista (techstack §1/§6).

## Konsekvenser

1. `packages/db/src/schema/auth.ts` — Better-Auth-tabeller **uten** RLS. Alt annet med.
2. `organization.id` = `tenant_id`. Ingen egen tenant-tabell for forhandlere som er organisasjoner — `tenants`-tabellen fra F0-03 speiler organisasjonen og eier de domene-nære feltene.
3. Ingen cookie-cache på sesjoner.
4. Absolutt maks-levetid må implementeres av oss (F1-12).
5. F1-08 må dekke *to* angrepsflater, ikke én.
