import { randomUUID } from 'node:crypto';
import { createDb } from '@endwise/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { magicLink, organization, phoneNumber, twoFactor } from 'better-auth/plugins';
import { authTrustedOrigins } from './auth-origins.ts';
import { BEKREFT_EPOST_STI, BYTT_EPOST_RATE_GRENSE, BYTT_EPOST_STI } from './bytt-epost.ts';
import {
  BYTT_PASSORD_RATE_GRENSE,
  BYTT_PASSORD_STI,
  KREDENTIAL_MUTASJON_RATE_GRENSE,
  TO_FAKTOR_DISABLE_STI,
  TO_FAKTOR_ENABLE_STI,
} from './bytt-passord.ts';
import { byttPassordForHook } from './bytt-passord-server.ts';
import { authEnv } from './env.ts';
import {
  genererMagicLinkKode,
  MAGIC_LINK_BE_OM_GRENSE,
  MAGIC_LINK_BE_OM_STI,
  MAGIC_LINK_TTL_SEKUNDER,
  MAGIC_LINK_VERIFY_GRENSE,
  MAGIC_LINK_VERIFY_STI,
} from './magic-link.ts';
import { createAuthEtterHook } from './magic-link-2fa.ts';
import { ac, roles } from './rbac.ts';
import {
  sendByttEpostBekreftelse,
  sendByttEpostNyAdresse,
  sendMagicLink,
} from './senders/resend.ts';
import { sendPhoneOtp, verifyPhoneOtp } from './senders/twilio.ts';
import {
  ABSOLUTE_MAX_LIFETIME_SECONDS,
  absoluteExpiryFor,
  IDLE_TIMEOUT_SECONDS,
  SESSION_UPDATE_AGE_SECONDS,
} from './session-policy.ts';

/**
 * F1-01 / F1-03 / F1-05 / F1-11 / F1-12 — Better-Auth-instansen. ADR-002 avgjort.
 * Merk RLS-regelen fra ADR-002: Better-Auth sine tabeller har ikke RLS.
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
     * `127.0.0.1` og maskinens lan-adresse samme maskin, mens bare den ene står
     * i `BETTER_AUTH_URL`. Åpner du appen på `http://127.0.0.1:3000` eller fra
     * telefonen på `http://192.168.x.x:3000`, blir hvert eneste auth-kall
     * avvist med `403 Invalid origin`, uten at noe i UI-et antyder at adressen
     * i adressefeltet er problemet.
     * Lan-adressene leses fra maskinens egne nettverksgrensesnitt ved oppstart
     * (`devTrustedOrigins`) — ikke fra en env-variabel som blir feil neste gang
     * ruteren deler ut en ny IP.
     * Lan/localhost bare når `NODE_ENV !== 'production'`. På Vercel kjører
     * både preview og prod med `NODE_ENV=production`, så lista MÅ også inneholde
     * navngitte verter der: `endwise.no` / `www.endwise.no` + `VERCEL_URL` /
     * `VERCEL_BRANCH_URL` / `VERCEL_PROJECT_PRODUCTION_URL`. Ingen `*.vercel.app`.
     * Se `authTrustedOrigins`.
     */
    trustedOrigins: authTrustedOrigins(),

    /**
     * Magic link + TOTP. Passord er av.
     * Etter-hooken river sesjonen fra `/magic-link/verify` når 2FA er på,
     * ellers holder stjålet innboks. `allowPasswordless` på twoFactor
     * fordi credential-hashene tømmes.
     */
    hooks: {
      before: byttPassordForHook,
      after: createAuthEtterHook(db),
    },

    emailAndPassword: {
      enabled: false,
    },

    /**
     * Bytt E-POST i to steg. Av som default i Better-Auth.
     * `updateEmailWithoutVerification` settes ikke. Med den på ville en
     * uverifisert konto byttet adresse i samme klikk som forespørselen.
     * `sendChangeEmailConfirmation` er bekreftelsen fra adressen brukeren
     * Har — uten den kan en stjålet sesjon peke kontoen mot en fremmed innboks.
     */
    user: {
      changeEmail: {
        enabled: true,
        sendChangeEmailConfirmation: async ({ user, newEmail, token }) => {
          const lenke = new URL(BEKREFT_EPOST_STI, authEnv.baseUrl);
          lenke.searchParams.set('token', token);
          await sendByttEpostBekreftelse({
            to: user.email,
            nyEpost: newEmail,
            lenke: lenke.toString(),
          });
        },
      },
    },

    /**
     * Påkrevd av changeEmail (F1-27). `sendOnSignUp: false` — vi endrer ikke
     * invitasjonsflyten, som allerede setter `emailVerified` (F1-10).
     */
    emailVerification: {
      sendOnSignUp: false,
      expiresIn: 1_800,
      sendVerificationEmail: async ({ user, token }) => {
        const lenke = new URL(BEKREFT_EPOST_STI, authEnv.baseUrl);
        lenke.searchParams.set('token', token);
        await sendByttEpostNyAdresse({ to: user.email, lenke: lenke.toString() });
      },
    },

    session: {
      // Glidende 60-min idle-vindu, serverside.
      expiresIn: IDLE_TIMEOUT_SECONDS,
      updateAge: SESSION_UPDATE_AGE_SECONDS,
      // ADR-002: cookie-cache av. Ellers overlever en revoket sesjon i cachen,
      // og «logg ut alle enheter» blir en løgn.
      cookieCache: { enabled: false },
      additionalFields: {
        // Absolutt maks-levetid — finnes ikke i Better-Auth, så vi eier den.
        absoluteExpiresAt: {
          type: 'date',
          required: false,
          input: false,
          defaultValue: () => absoluteExpiryFor(),
        },
      },
    },

    /**
     * Rate-limit + cooldown på OTP-stiene.
     * av I dev — og det var ikke en svekkelse, det var en fiks.
     * Better-Auth slår rate-limit av i dev som standard. Vi hadde overstyrt det
     * med `enabled: true`, og kombinert med bøtte-problemet under (se
     * `ipAddress`) betydde det at alle klienter delte ÉN teller på 5 innlogginger
     * per minutt. Fem forsøk fra hvem som helst — en feiltastet passord, en
     * refresh, et testskript — låste ute alle andre i 60 sekunder, med
     * «Too many requests» som eneste spor. Det var det som gjorde at innlogging
     * med demo-brukeren sluttet å virke.
     * Grensene er uendret i produksjon. Vil du teste dem lokalt:
     * `AUTH_RATE_LIMIT=1 pnpm dev`.
     */
    rateLimit: {
      enabled: process.env.NODE_ENV === 'production' || process.env.AUTH_RATE_LIMIT === '1',
      window: 60,
      max: 60,
      customRules: {
        '/phone-number/send-otp': { window: 60, max: 3 },
        '/phone-number/verify': { window: 60, max: 5 },
        [MAGIC_LINK_BE_OM_STI]: { ...MAGIC_LINK_BE_OM_GRENSE },
        [MAGIC_LINK_VERIFY_STI]: { ...MAGIC_LINK_VERIFY_GRENSE },
        [BYTT_PASSORD_STI]: { ...BYTT_PASSORD_RATE_GRENSE },
        [TO_FAKTOR_ENABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
        [TO_FAKTOR_DISABLE_STI]: { ...KREDENTIAL_MUTASJON_RATE_GRENSE },
        [BYTT_EPOST_STI]: { ...BYTT_EPOST_RATE_GRENSE },
      },
      storage: 'database',
    },

    plugins: [
      // Organizations = tenants. organization.id er tenant_id.
      organization({ ac, roles }),

      // Phone-OTP med Twilio Verify som sender og verifikator (ADR-002).
      phoneNumber({
        sendOTP: async ({ phoneNumber: to }) => {
          await sendPhoneOtp(to);
        },
        verifyOTP: async ({ phoneNumber: to, code }) => verifyPhoneOtp(to, code),
      }),

      // Magic link (innboks) + TOTP-app. Ingen e-post-OTP — da holder
      // stjålet mailbox. allowPasswordless: credential-hashene er tømt.
      // Ingen sendOTP → otp kommer ikke med i twoFactorMethods.
      twoFactor({
        issuer: 'Endwise',
        allowPasswordless: true,
        skipVerificationOnEnable: false,
      }),

      magicLink({
        expiresIn: MAGIC_LINK_TTL_SEKUNDER,
        disableSignUp: true,
        storeToken: 'hashed',
        generateToken: async () => genererMagicLinkKode(),
        rateLimit: MAGIC_LINK_BE_OM_GRENSE,
        sendMagicLink: async ({ email, url, token }) => {
          await sendMagicLink({
            to: email,
            lenke: url,
            kode: token,
            utloper: new Date(Date.now() + MAGIC_LINK_TTL_SEKUNDER * 1000),
          });
        },
      }),

      // Passkey (WebAuthn) er utsatt: `@better-auth/passkey` dro inn
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
       * Hvem rate-limiten teller på. Dette er en sikkerhetsfiks,
       * ikke en konfigurasjonsdetalj.
       * Better-Auth stoler ikke på `x-forwarded-for` som standard — den kan
       * settes av klienten selv. Uten en betrodd kilde til IP faller den
       * tilbake på **én delt bøtte for alle** (nøkkelen `no-trusted-ip`), og
       * logger en advarsel de fleste aldri ser. Konsekvensen er at rate-limiten
       * snur seg: i stedet for å beskytte mot brute force blir den et
       * tilgjengelighetsangrep, der én klient kan låse ute samtlige brukere.
       * Derfor navngis headerne eksplisitt. `x-vercel-forwarded-for` settes av
       * Vercels edge og kan ikke forfalskes av klienten; `x-real-ip` er
       * reserven. **Ikke** `x-forwarded-for` — den er klientkontrollerbar, og
       * da ville per-IP-bøttene vært trivielle å omgå.
       * Må verifiseres ved første deploy (F13): logger Better-Auth
       * fortsatt «could not determine a client IP», er vi tilbake i den delte
       * bøtta og headernavnet er feil for plattformen.
       */
      ipAddress: {
        ipAddressHeaders: ['x-vercel-forwarded-for', 'x-real-ip'],
      },
      database: {
        // Id-generering (F1). Viktig: `generateId: 'uuid'` fungerer ikke med
        // Postgres-adapteren — da delegerer Better-Auth uuid-genereringen til en
        // Db-default (gen_random_uuid) som våre `text('id')`-kolonner ikke har
        // → NULL → not-null-brudd ved seeding. En funksjon genererer derimot
        // id-en app-side for alle Better-Auth-tabeller (docs: concepts/database).
        // Dermed blir `organization.id` en gyldig uuid-streng = tenant_id
        // (uuid-kolonne i domenetabellene, ADR-002). Ingen schema-endring nødvendig.
        generateId: () => randomUUID(),
      },
    },
  });
}

/**
 * Sesjons-grensene samlet ett sted (F1-12). Idle = glidende inaktivitetsvindu,
 * Absolute = hard maks-levetid uansett aktivitet.
 */
export const SESSION_LIMITS = {
  idleSeconds: IDLE_TIMEOUT_SECONDS,
  absoluteSeconds: ABSOLUTE_MAX_LIFETIME_SECONDS,
} as const;

/** Instanstypen til Better-Auth (brukes av session.ts/tenant.ts). */
export type Auth = ReturnType<typeof createAuth>;
