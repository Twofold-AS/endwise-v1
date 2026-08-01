import { randomUUID } from 'node:crypto';
import { createDb } from '@endwise/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { organization, phoneNumber, twoFactor } from 'better-auth/plugins';
import { authEnv } from './env.ts';
import { ac, roles } from './rbac.ts';
import { sendTwoFactorOtp } from './senders/resend.ts';
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

    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      minPasswordLength: 12,
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

    // F1-01: rate-limit + cooldown på OTP-stiene.
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
        '/phone-number/send-otp': { window: 60, max: 3 },
        '/phone-number/verify': { window: 60, max: 5 },
        '/two-factor/send-otp': { window: 60, max: 3 },
        '/sign-in/email': { window: 60, max: 5 },
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
