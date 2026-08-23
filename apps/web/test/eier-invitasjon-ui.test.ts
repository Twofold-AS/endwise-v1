import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F5-26 — passord-siden har ingen modulvelger. Veiviseren kommer etter 2FA.
 */
describe('F5-26: invitasjonssiden har ingen modulvelger', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const kilde = readFileSync(resolve(her, '../app/invitasjon/[token]/page.tsx'), 'utf8');
  const forhandlere = readFileSync(
    resolve(her, '../app/(app)/endwise/forhandlere/page.tsx'),
    'utf8',
  );
  const oppstart = readFileSync(resolve(her, '../app/(app)/oppstart/page.tsx'), 'utf8');

  it('godta-siden ber om passord og har ingen tilleggs-UI', () => {
    expect(kilde).toMatch(/Sett eller bytt passord|Velg et passord/);
    expect(kilde).toMatch(/2fa-oppsett/);
    expect(kilde).not.toMatch(/ADDON_MODULES|tenant_modules|Velg moduler|planvelger|abonnement/);
    expect(kilde).not.toMatch(/addonKatalog|setModules/);
  });

  it('kloner /signin-chromet — logo, kort, StatefulButton, auth-felt', () => {
    expect(kilde).toMatch(/from '@endwise\/ui'/);
    expect(kilde).toMatch(/StatefulButton/);
    expect(kilde).toMatch(/Field, INPUT, PassordFelt/);
    expect(kilde).toMatch(/\/logo\/logo\.svg/);
    expect(kilde).toMatch(/max-w-sm/);
    expect(kilde).toMatch(/rounded-xl border border-border bg-card p-\[5px\]/);
    expect(kilde).toMatch(/bg-inset p-4/);
    expect(kilde).toMatch(/Henter invitasjonen…/);
    expect(kilde).toMatch(/Oppretter …/);
    expect(kilde).toMatch(/Opprettet/);
    expect(kilde).toMatch(/<Lock /);
    expect(kilde).toMatch(/Du er invitert som eier/);
    expect(kilde).toMatch(/Invitasjonen virker ikke/);
    expect(kilde).toMatch(/utløper etter sju dager/);
    expect(kilde).not.toMatch(/max-w-\[440px\]/);
    expect(kilde).not.toMatch(/py-16/);
    expect(kilde).not.toMatch(/['"]shop['"]|['"]twilio['"]|Admin-tab|\/admin/);
  });

  it('forhandlere-siden skiller pakke og valgfritt', () => {
    expect(forhandlere).toMatch(/I pakken \(fast\)/);
    expect(forhandlere).toMatch(/Kan velges i veiviseren/);
    expect(forhandlere).toMatch(/addonKatalog/);
    expect(forhandlere).toMatch(/setModules/);
    expect(forhandlere).toMatch(/Send invitasjon på nytt/);
    expect(forhandlere).toMatch(/setter passord selv/);
    expect(forhandlere).not.toMatch(/href:\s*['"]\/registrer['"]|href=['"]\/registrer['"]/);
    expect(forhandlere).not.toMatch(/['"]shop['"]|['"]twilio['"]/);
  });

  it('eier-veiviseren har visningsnavn, valgfrie tillegg og team', () => {
    expect(oppstart).toMatch(/Visningsnavn/);
    expect(oppstart).toMatch(/Valgfritt/);
    expect(oppstart).toMatch(/Inviter teamet/);
    expect(oppstart).toMatch(/invitasjoner\.opprett/);
    expect(oppstart).toMatch(/selger|mekaniker/);
    expect(oppstart).not.toMatch(/['"]shop['"]|['"]twilio['"]/);
    expect(oppstart).not.toMatch(/setModules/);
  });

  it('ingen offentlig /registrer-side', () => {
    expect(() => readFileSync(resolve(her, '../app/registrer/page.tsx'), 'utf8')).toThrow();
  });
});
