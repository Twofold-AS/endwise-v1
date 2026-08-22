import { randomUUID } from 'node:crypto';
import { createDb } from '@endwise/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, phoneNumber, twoFactor } from 'better-auth/plugins';
import { devTrustedOrigins } from './dev-origins.ts';
import { authEnv } from './env.ts';
import {
  NYTT_PASSORD_STI,
  PASSORD_RESET_TTL_SEKUNDER,
  RESET_BE_OM_GRENSE,
  RESET_BE_OM_STI,
  RESET_SETT_GRENSE,
  RESET_SETT_STI,
} from './password-reset.ts';
import { ac, roles } from './rbac.ts';
import { sendPasswordReset, sendTwoFactorOtp } from './senders/resend.ts';
import { sendPhoneOtp, verifyPhoneOtp } from './senders/twilio.ts';
import {
  ABSOLUTE_MAX_LIFETIME_SECONDS,
  absoluteExpiryFor,
  IDLE_TIMEOUT_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from './session-policy.ts';

/**
 * F1-01 / F1-03 / F1-05 / F1-11 / F1-12 — Better-Auth-instansen. ADR-002 avgjort.
 *
 * Merk RLS-regelen fra ADR-002: Better-Auth sine tabeller har IKKE RLS.
 * De er globale identiteter. Tenant-grensen går på `organization.id` (= tenant_id),
 * og håndheves av RLS på domenetabellene + medlemskapssjekk her.
 */
export function createAuth(db = createDb(authEnv.databaseUrl)) {
  return betterAuth({
    appName: 'Endwise',
    secret: authEnv.secret,
    baseURL: authEnv.baseUrl,

    database: drizzleAdapter(db, { provider: 'pg' }),

    /**
     * Origin-sjekken er PÅ og skal være det — men i dev er `localhost`,
     * `127.0.0.1` OG maskinens LAN-adresse samme maskin, mens bare den ene står
     * i `BETTER_AUTH_URL`. Åpner du appen på `http://127.0.0.1:3000` eller fra
     * telefonen på `http://192.168.x.x:3000`, blir hvert eneste auth-kall
     * avvist med `403 Invalid origin`, uten at noe i UI-et antyder at adressen
     * i adressefeltet er problemet.
     *
     * LAN-adressene leses fra maskinens egne nettverksgrensesnitt ved oppstart
     * (`devTrustedOrigins`) — ikke fra en env-variabel som blir feil neste gang
     * ruteren deler ut en ny IP.
     *
     * ⚠️ Kun i dev. I produksjon er `baseURL` fasiten, og en ekstra betrodd
     * origin der ville vært et hull, ikke en bekvemmelighet.
     */
    ...(process.env.NODE_ENV === 'production' ? {} : { trustedOrigins: devTrustedOrigins() }),

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,

      /**
       * F1-15 / F1-16 — PASSORDRESET. Grenseverdiene bor i `password-reset.ts`;
       * `passordResetHull()` er testen som gjør et bortfall her til en rød test.
       *
       * ── ⛔ Hvorfor dette IKKE er en vei rundt 2FA ──────────────────────
       * Better-Auths `/reset-password` setter **ingen sesjonscookie** — den
       * bytter passordet og svarer `{ status: true }`, punktum (lest i
       * `dist/api/routes/password.mjs`, v1.6.23; det finnes ikke et
       * `setSessionCookie`-kall i handleren). Brukeren må derfor logge inn
       * etterpå, og da gjelder F1-11 fullt ut: passord + engangskode.
       *
       * Det er en egenskap vi ARVER, ikke en vi har bygget — og arvet
       * oppførsel kan endre seg i en minor. Derfor står den fast i
       * `passord-reset.test.ts`, som feiler hvis en resett noen gang begynner
       * å dele ut sesjoner.
       *
       * ⚠️ Den ekte svakheten står i `password-reset.ts`: andre faktor er en
       * kode på e-post, og resetlenka går til samme innboks. Reset gjør det
       * ikke verre, men løser det heller ikke. F1-21 og F1-24 gjør.
       */
      sendResetPassword: async ({ user, token }) => {
        /**
         * ⚠️ Vi bygger lenka SELV i stedet for å bruke `url`-argumentet.
         *
         * Better-Auths `url` peker på `/api/auth/reset-password/:token`, som
         * er et REDIRECT-endepunkt: det slår opp tokenet, og sender deretter
         * brukeren videre til `callbackURL` med tokenet på query-strengen.
         * Det ekstra hoppet kjøper oss ingenting — vi validerer uansett i det
         * `POST /reset-password` konsumerer tokenet — og det koster et ledd
         * til der tokenet står i en URL, altså et ledd til der det kan havne
         * i en referrer eller en proxylogg.
         *
         * Én lenke, rett til sida som spør om passordet.
         */
        const lenke = new URL(NYTT_PASSORD_STI, authEnv.baseUrl);
        lenke.searchParams.set('token', token);

        await sendPasswordReset({
          to: user.email,
          lenke: lenke.toString(),
          utloper: new Date(Date.now() + PASSORD_RESET_TTL_SEKUNDER * 1000),
        });
      },

      /** 30 minutter. Begrunnelsen står i `password-reset.ts`. */
      resetPasswordTokenExpiresIn: PASSORD_RESET_TTL_SEKUNDER,

      /**
       * ⛔ **Better-Auths default er `false`, og default er feil her.**
       *
       * Den vanligste grunnen til at noen tilbakestiller passordet sitt er at
       * de tror kontoen er kompromittert. Uten dette flagget beholder
       * angriperens eksisterende sesjon full tilgang etter resetten — offeret
       * har «tatt tilbake» kontoen og ingenting har skjedd. Byttet passord
       * ville da vært en trøstehandling, ikke en sikring.
       *
       * ⚠️ Prisen er at brukeren selv også logges ut overalt. Det er riktig
       * pris, og e-posten sier det på forhånd.
       */
      revokeSessionsOnPasswordReset: true,

      /**
       * Ikke en sperre — sperren over er `revokeSessionsOnPasswordReset`.
       * Dette er sporet: en passordendring skal være synlig i driftsloggen.
       *
       * ⛔ **Ingen rad i `audit_log`, og det er et bevisst valg.** Tabellen har
       * `tenant_id NOT NULL` med referanse til `tenants` (F1-06), mens en
       * passordreset er en hendelse på en GLOBAL identitet: brukeren kan høre
       * til null forhandlere eller flere. Å velge én tenant ville vært å finne
       * på et svar, og å skrive én rad per medlemskap er en beslutning om hva
       * en forhandler har krav på å se om en person — den hører hjemme i F5-05,
       * ikke i en fiks som skulle gi folk passordet tilbake.
       *
       * ⚠️ Aldri e-post, token eller passord her. En driftslogg er ikke en
       * hemmelighet — den leses av flere og lever lenger enn hendelsen.
       */
      onPasswordReset: async ({ user }) => {
        console.warn(`[auth] passord tilbakestilt for bruker ${user.id} — alle sesjoner revokert`);
      },
    },

    session: {
      // F1-12: glidende 60-min idle-vindu, serverside.
      expiresIn: IDLE_TIMEOUT_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      // ADR-002: cookie-cache AV. Ellers overlever en revoket sesjon i cachen,
      // og «logg ut alle enheter» blir en løgn.
      cookieCache: { enabled: false },
      additionalFields: {
        // F1-12: absolutt maks-levetid — finnes ikke i Better-Auth, så vi eier den.
        absoluteExpiresAt: {
          type: 'date',
          required: false,
          input: false,
          defaultValue: () => absoluteExpiryFor(),
        },
      },
    },

    /**
     * F1-01: rate-limit + cooldown på OTP-stiene.
     *
     * ⚠️ **AV I DEV fra 07.08.2026 — og det var ikke en svekkelse, det var en fiks.**
     *
     * Better-Auth slår rate-limit av i dev som standard. Vi hadde overstyrt det
     * med `enabled: true`, og kombinert med bøtte-problemet under (se
     * `ipAddress`) betydde det at **alle klienter delte ÉN teller på 5 innlogginger
     * per minutt**. Fem forsøk fra hvem som helst — en feiltastet passord, en
     * refresh, et testskript — låste ute alle andre i 60 sekunder, med
     * «Too many requests» som eneste spor. Det var det som gjorde at innlogging
     * med demo-brukeren sluttet å virke.
     *
     * Grensene er UENDRET i produksjon. Vil du teste dem lokalt:
     * `AUTH_RATE_LIMIT=1 pnpm dev`.
     */
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production' || process.env.AUTH_RATE_LIMIT === '1',
      window: 60,
      max: 60,
      customRules: {
        '/phone-number/send-otp': { window: 60, max: 3 },
        '/phone-number/verify': { window: 60, max: 5 },
        '/two-factor/send-otp': { window: 60, max: 3 },
        '/sign-in/email': { window: 60, max: 5 },

        /**
         * F1-15 / F1-16 — passordreset.
         *
         * ⚠️ Disse to MÅ stå eksplisitt selv om Better-Auth har en egen
         * standardregel for `/request-password-reset` (60s/3). `customRules`
         * vinner over standardreglene (rate-limiter/index.mjs: special →
         * plugin → custom), så uten en oppføring her arver vi 3 per minutt =
         * 180 i timen. Se `password-reset.ts` for hvorfor det er for slakt.
         */
        [RESET_BE_OM_STI]: { ...RESET_BE_OM_GRENSE },
        [RESET_SETT_STI]: { ...RESET_SETT_GRENSE },
      },
      storage: 'database',
    },

    plugins: [
      // F1-04: organizations = tenants. organization.id ER tenant_id.
      organization({ ac, roles }),

      // F1-01: phone-OTP med Twilio Verify som sender OG verifikator (ADR-002).
      phoneNumber({
        sendOTP: async ({ phoneNumber: to }) => {
          await sendPhoneOtp(to);
        },
        verifyOTP: async ({ phoneNumber: to, code }) => verifyPhoneOtp(to, code),
      }),

      // F1-11: OBLIGATORISK e-post-2FA. Ingen bypass, ingen «husk enhet»:
      // trustDevice settes aldri fra vår side. Sesjons-ID roteres av pluginen
      // ved fullført 2FA (CWE-384).
      twoFactor({
        issuer: 'Endwise',
        otpOptions: {
          async sendOTP({ user, otp }) {
            await sendTwoFactorOtp(user.email, otp);
          },
        },
      }),

      // Passkey (WebAuthn) er UTSATT (16.07.2026): `@better-auth/passkey` dro inn
      // en foreldet @better-auth/core-1.4.x-subtre (peer-drift) og ingen klientflyt
      // brukte den ennå (auth-client har kun organization + twoFactor). Plugin +
      // pakke fjernet for en ren peer-graf. `passkey`-tabellen i schema er beholdt
      // dormant. Techstack §2: reaktiver ved å legge tilbake pakken + passkeyClient
      // når WebAuthn-flyten faktisk bygges. Se docs/roadmap-endringer.md.
    ],

    advanced: {
      cookiePrefix: 'endwise',
      useSecureCookies: process.env.NODE_ENV === 'production',

      /**
       * ⚠️ F1-01 — HVEM rate-limiten teller på. Dette er en sikkerhetsfiks,
       * ikke en konfigurasjonsdetalj.
       *
       * Better-Auth stoler IKKE på `x-forwarded-for` som standard — den kan
       * settes av klienten selv. Uten en betrodd kilde til IP faller den
       * tilbake på **én delt bøtte for alle** (nøkkelen `no-trusted-ip`), og
       * logger en advarsel de fleste aldri ser. Konsekvensen er at rate-limiten
       * snur seg: i stedet for å beskytte mot brute force blir den et
       * tilgjengelighetsangrep, der én klient kan låse ute samtlige brukere.
       *
       * Derfor navngis headerne eksplisitt. `x-vercel-forwarded-for` settes av
       * Vercels edge og kan ikke forfalskes av klienten; `x-real-ip` er
       * reserven. **Ikke** `x-forwarded-for` — den er klientkontrollerbar, og
       * da ville per-IP-bøttene vært trivielle å omgå.
       *
       * ⚠️ **Må verifiseres ved første deploy (F13):** logger Better-Auth
       * fortsatt «could not determine a client IP», er vi tilbake i den delte
       * bøtta og headernavnet er feil for plattformen.
       */
      ipAddress: {
        ipAddressHeaders: ['x-vercel-forwarded-for', 'x-real-ip'],
      },
      database: {
        // Id-generering (F1). VIKTIG: `generateId: 'uuid'` fungerer IKKE med
        // Postgres-adapteren — da delegerer Better-Auth uuid-genereringen til en
        // DB-DEFAULT (gen_random_uuid()) som våre `text('id')`-kolonner IKKE har
        // → NULL → not-null-brudd ved seeding. En FUNKSJON genererer derimot
        // id-en app-side for ALLE Better-Auth-tabeller (docs: concepts/database).
        // Dermed blir `organization.id` en gyldig uuid-streng = tenant_id
        // (uuid-kolonne i domenetabellene, ADR-002). Ingen schema-endring nødvendig.
        generateId: () => randomUUID(),
      },
    },
  });
}

/**
 * Sesjons-grensene samlet ett sted (F1-12). IDLE = glidende inaktivitetsvindu,
 * ABSOLUTE = hard maks-levetid uansett aktivitet.
 */
export const SESSION_LIMITS = {
  idleSeconds: IDLE_TIMEOUT_SECONDS,
  absoluteSeconds: ABSOLUTE_MAX_LIFETIME_SECONDS,
} as const;

/** Instanstypen til Better-Auth (brukes av session.ts/tenant.ts). */
export type Auth = ReturnType<typeof createAuth>;
