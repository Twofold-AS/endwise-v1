import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BYTT_EPOST_STI } from '../src/bytt-epost.ts';
import {
  BYTT_PASSORD_STI,
  TO_FAKTOR_DISABLE_STI,
  TO_FAKTOR_SEND_OTP_STI,
} from '../src/bytt-passord.ts';
import { byttPassordForHook } from '../src/bytt-passord-server.ts';
import { erProduktDestinasjon } from '../src/produkt-destinasjon.ts';
import { ROLES_REQUIRING_2FA } from '../src/rbac.ts';
import { RESEND_FROM_KANONISK } from '../src/resend-avsender.ts';
import { settPassordUtenSesjon } from '../src/sett-passord.ts';
import { TOTP_STEP_UP_KODE } from '../src/totp-steg.ts';
import { assertTwoFactorSatisfied, TwoFactorRequiredError } from '../src/two-factor.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Mons lock 1–7 (ikke merge før disse er grønne)', () => {
  it('1) CWE-770: magic-link fyrer bare mot bruker/invitee; innboks-to er kjent kunde', () => {
    const auth = les('../src/auth.ts');
    const dest = les('../src/produkt-destinasjon.ts');
    const messages = les('../../../apps/api/src/trpc/routers/messages.ts');
    const threads = les('../../../packages/modules/src/messages/threads.ts');
    expect(auth).toMatch(/erAuthDestinasjon\(db, email\)/);
    expect(dest).toMatch(/erAuthDestinasjon/);
    expect(dest).toMatch(/schema\.user\.email/);
    expect(dest).toMatch(/schema\.invitation/);
    expect(dest).toMatch(/schema\.invitations/);
    const authFn = dest.slice(0, dest.indexOf('export async function erTenantDestinasjon'));
    expect(authFn).not.toMatch(/schema\.customers/);
    expect(messages).toMatch(/erKjentKundeKontakt/);
    expect(messages).not.toMatch(/from:\s*z\./);
    expect(messages).not.toMatch(/html:\s*z\./);
    expect(messages).not.toMatch(/replyTo:\s*z\./);
    expect(threads).toMatch(/to:\s*mottaker/);
    expect(threads).toMatch(/UkjentInnboksMottakerError/);
  });

  it('1) ugyldig / ukjent e-post er aldri destinasjon', async () => {
    await expect(erProduktDestinasjon({} as never, 'hvem-som-helst@evil.no')).resolves.toBe(false);
    await expect(erProduktDestinasjon({} as never, 'ikke-en-epost')).resolves.toBe(false);
    await expect(erProduktDestinasjon({} as never, 'a@b.no,c@d.no')).resolves.toBe(false);
  });

  it('2) CWE-20: sendEmail krever avsenderErVerifisert og nøyaktig produkt-From', () => {
    expect(RESEND_FROM_KANONISK).toBe('Endwise <noreply@endwise.no>');
    const send = les('../src/senders/resend.ts');
    expect(send).toMatch(/avsenderErVerifisert/);
    expect(send).toMatch(/avsenderErKanonisk/);
    expect(send).toMatch(/from settes ikke av kalleren/);
    expect(send).toMatch(/RESEND_FROM_KANONISK/);
  });

  it('3) CWE-308: leder-reset krever TOTP; sendTwoFactorOtp er død', async () => {
    const team = les('../../../apps/api/src/trpc/routers/team.ts');
    expect(team).toMatch(/slaAv2fa[\s\S]*verifiserFerskTotpForBruker/);
    expect(team).not.toMatch(/sendTwoFactorOtp/);
    const { sendTwoFactorOtp } = await import('../src/senders/resend.ts');
    await expect(sendTwoFactorOtp('x@y.no', '123456')).rejects.toThrow(/ikke andre faktor/);
    await expect(
      byttPassordForHook({ path: TO_FAKTOR_SEND_OTP_STI, body: {} } as never),
    ).rejects.toMatchObject({ status: 'FORBIDDEN', body: { code: 'TWO_FACTOR_OTP_DISABLED' } });
  });

  it('4) CWE-287: change-email og team.endreEpost krever fersk TOTP', async () => {
    const hook = les('../src/bytt-passord-server.ts');
    const team = les('../../../apps/api/src/trpc/routers/team.ts');
    expect(hook).toMatch(/verifiserFerskTotpMotHemmelighet/);
    expect(team).toMatch(/endreEpost[\s\S]*verifiserFerskTotpForBruker/);
    await expect(
      byttPassordForHook({
        path: BYTT_EPOST_STI,
        body: { newEmail: 'ny@test.no' },
        context: {
          session: {
            user: { id: 'u1', twoFactorEnabled: true },
            session: { token: 't', userId: 'u1' },
          },
          adapter: { findOne: async () => null },
        },
        getSignedCookie: async () => null,
      } as never),
    ).rejects.toMatchObject({ status: 'FORBIDDEN', body: { code: TOTP_STEP_UP_KODE } });
  });

  it('5) CWE-308: enrollert verify river sesjon; uenrollert beholder den', () => {
    const hook = les('../src/magic-link-2fa.ts');
    expect(hook).toMatch(/etterMagicLinkVerify/);
    expect(hook).toMatch(/deleteSessionCookie/);
    expect(hook).toMatch(/setNewSession\(null\)/);
    expect(hook).toMatch(/MAGIC_LINK_APP_LANDING/);
    expect(hook).not.toMatch(/startEnroll/);
    expect(hook).not.toMatch(/setSessionCookie/);
    expect(les('../src/session.ts')).toMatch(/assertTwoFactorForUser/);
  });

  it('6) customer i ROLES_REQUIRING_2FA — uenrollert blokkeres ikke', () => {
    expect([...ROLES_REQUIRING_2FA]).toContain('customer');
    expect(() =>
      assertTwoFactorSatisfied({ roles: ['customer'], twoFactorEnabled: false }),
    ).not.toThrow();
    expect(() =>
      assertTwoFactorSatisfied({ roles: ['dealer_admin'], twoFactorEnabled: false }),
    ).not.toThrow();
    expect(TwoFactorRequiredError).toBeDefined();
  });

  it('7) CWE-262: passordstabelen er død', async () => {
    const { sendPasswordReset } = await import('../src/senders/resend.ts');
    await expect(
      sendPasswordReset({
        to: 'x@y.no',
        lenke: 'https://endwise.test/x',
        utloper: new Date(),
      }),
    ).rejects.toThrow(/stengt|Passord|av/i);
    await expect(settPassordUtenSesjon()).rejects.toThrow(/Passord er av/);
    await expect(
      byttPassordForHook({ path: BYTT_PASSORD_STI, body: { newPassword: 'x' } } as never),
    ).rejects.toMatchObject({ status: 'FORBIDDEN', body: { code: 'PASSWORD_DISABLED' } });
    await expect(
      byttPassordForHook({ path: TO_FAKTOR_DISABLE_STI, body: {} } as never),
    ).rejects.toMatchObject({ status: 'FORBIDDEN', body: { code: 'TWO_FACTOR_DISABLE_FORBIDDEN' } });
    expect(existsSync(resolve(her, '../../../apps/web/app/(app)/_shell/bytt-passord.tsx'))).toBe(
      false,
    );
    expect(les('../../../apps/web/app/nytt-passord/page.tsx')).toMatch(/redirect\('\/signin'\)/);
    expect(les('../src/auth.ts')).toMatch(/emailAndPassword:\s*\{[\s\S]*enabled:\s*false/);
    expect(les('../../../apps/api/src/trpc/routers/team.ts')).toMatch(
      /sendPassordendring[\s\S]*FORBIDDEN/,
    );
  });
});
