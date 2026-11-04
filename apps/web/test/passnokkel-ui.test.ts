import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41-11: TOTP og Authenticator er borte fra UI', () => {
  it('/2fa-oppsett registrerer passnøkkel uten utlogging', () => {
    const side = les('../app/2fa-oppsett/page.tsx');
    expect(side).toMatch(/addPasskey/);
    expect(side).toMatch(/Du blir ikke logget ut/);
    expect(side).not.toMatch(/twoFactor\.enable|verifyTotp|totpURI|Authenticator/);
  });

  it('app-innlogging har passnøkkel, ikke TOTP', () => {
    const skjema = les('../app/signin/signin-skjema.tsx');
    expect(skjema).toMatch(/signIn\.passkey/);
    expect(skjema).toMatch(/Bruk nøkkel/);
    expect(skjema).not.toMatch(/verifyTotp|Authenticator|autentikator-appen/);
  });

  it('kunde-innlogging har valgfri passnøkkel', () => {
    const skjema = les('../app/%5Fkunde/[slug]/logg-inn/logg-inn-skjema.tsx');
    expect(skjema).toMatch(/signIn\.passkey/);
    expect(skjema).toMatch(/Bruk nøkkel/);
  });

  it('profil viser Passnøkkel, ikke Autentikator', () => {
    const profil = les('../app/(app)/innstillinger/_profil-fane.tsx');
    expect(profil).toMatch(/Passnøkkel/);
    expect(profil).toMatch(/harPasskey/);
    expect(profil).not.toMatch(/Autentikator/);
  });

  it('Bedrift-velger ber ikke om autentikator-kode', () => {
    const velg = les('../app/%5Fkunde/[slug]/velg/velg-skjema.tsx');
    expect(velg).toMatch(/Krever passnøkkel/);
    expect(velg).not.toMatch(/autentikator|FeltKode|totp/);
    expect(velg).toMatch(/\/2fa-oppsett/);
  });

  it('uinnlogget kundeforside er marked også når upublisert', () => {
    const hjem = les('../app/%5Fkunde/[slug]/page.tsx');
    const innloggetForst = hjem.indexOf('kundeErInnlogget');
    const marked = hjem.indexOf('KundeMarkedsFlate');
    const upublisert = hjem.indexOf('!tenant.publisert');
    expect(innloggetForst).toBeGreaterThan(-1);
    expect(marked).toBeGreaterThan(innloggetForst);
    expect(upublisert).toBeGreaterThan(marked);
  });
});
