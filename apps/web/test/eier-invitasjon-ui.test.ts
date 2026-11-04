import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Passord-siden har ingen modulvelger. Veiviseren kommer etter 2FA.
 */
describe('F5-26: invitasjonssiden har ingen modulvelger', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const kilde = readFileSync(resolve(her, '../app/invitasjon/[token]/page.tsx'), 'utf8');
  const forhandlere = readFileSync(
    resolve(her, '../app/(app)/endwise/forhandlere/page.tsx'),
    'utf8',
  );
  const oppstart = readFileSync(resolve(her, '../app/(app)/oppstart/_oppstart-flate.tsx'), 'utf8');
  const pakke = readFileSync(resolve(her, '../app/(app)/endwise/_pakke-valg.tsx'), 'utf8');

  it('godta-siden ber om navn — ingen kode eller tilleggs-UI', () => {
    expect(kilde).toMatch(/label="Navn"/);
    expect(kilde).not.toMatch(/label="Kode"/);
    expect(kilde).not.toMatch(/signIn\.magicLink|magicLink/);
    expect(kilde).not.toMatch(/type=["']password["']/);
    expect(kilde).not.toMatch(/twoFactor\.(enable|sendOtp|verifyOtp)/);
    expect(kilde).not.toMatch(/ADDON_MODULES|tenant_modules|Velg moduler|planvelger|abonnement/);
    expect(kilde).not.toMatch(/addonKatalog|setModules/);
  });

  it('kloner /signin-chromet — logo, kort, StatefulButton, auth-felt', () => {
    expect(kilde).toMatch(/from '@endwise\/ui'/);
    expect(kilde).toMatch(/StatefulButton/);
    expect(kilde).toMatch(/FeltInput/);
    expect(kilde).not.toMatch(/PassordFelt/);
    expect(kilde).toMatch(/\/logo\/logo\.svg/);
    expect(kilde).toMatch(/max-w-sm/);
    expect(kilde).not.toMatch(/p-\[5px\]/);
    expect(kilde).not.toMatch(/bg-inset p-4/);
    expect(kilde).toMatch(/Henter invitasjonen…/);
    expect(kilde).toMatch(/Klarte ikke hente invitasjonen\. Prøv igjen\./);
    expect(kilde).toMatch(/fetch\(`\/invitasjoner\/\$\{encodeURIComponent\(token\)\}`\)/);
    expect(kilde).not.toMatch(/fetch\(`\/invitasjon\/\$\{/);
    expect(kilde).toMatch(/Oppretter …/);
    expect(kilde).toMatch(/Invitasjonen virker ikke/);
    expect(kilde).toMatch(/utløper etter sju dager/);
    expect(kilde).not.toMatch(/max-w-\[440px\]/);
    expect(kilde).not.toMatch(/py-16/);
    expect(kilde).not.toMatch(/['"]shop['"]|['"]twilio['"]|Admin-tab|\/admin/);
  });

  it('forhandlere-siden bruker nivå + tillegg og skjuler Endwise-handlinger', () => {
    expect(forhandlere).toMatch(/NivaaValg/);
    expect(forhandlere).toMatch(/TilleggListe/);
    expect(forhandlere).toMatch(/Endre pakke/);
    expect(forhandlere).toMatch(/pakkeKatalog/);
    expect(forhandlere).toMatch(/tenants\.update/);
    expect(forhandlere).toMatch(/sendSlettKode/);
    expect(forhandlere).toMatch(/Slett forhandleren/);
    expect(forhandlere).toMatch(
      /Eieren logger inn med magic link \+ passnøkkel selv — du setter det aldri/,
    );
    expect(forhandlere).toMatch(/Velg én pakke/);
    expect(forhandlere).toMatch(/Send invitasjon på nytt/);
    expect(forhandlere).toMatch(/t\.erEndwise/);
    expect(forhandlere).toMatch(/!t\.erEndwise/);
    expect(forhandlere).toMatch(/eierInviteStatus/);
    expect(forhandlere).not.toMatch(/href:\s*['"]\/registrer['"]|href=['"]\/registrer['"]/);
    expect(forhandlere).not.toMatch(/['"]shop['"]/);
    expect(forhandlere).not.toMatch(/SMS ligger i Pro-bundelen/);
  });

  it('pakkevalget skjuler shop, men viser SMS som avkrysnings-tillegg', () => {
    expect(pakke).toMatch(/t\.module !== 'shop'/);
    expect(pakke).not.toMatch(/t\.module !== 'twilio'/);
    expect(pakke).not.toMatch(/SMS ligger i Pro-bundelen/);
    expect(pakke).toMatch(/SMS \(twilio\) er et avkrysnings-tillegg/);
  });

  it('resend og slett er skjult på Endwise, Se verkstedet er URL-lesing', () => {
    expect(forhandlere).toMatch(/Se verkstedet/);
    expect(forhandlere).toMatch(/\/endwise\/verksted\/\$\{t\.slug\}/);
    expect(forhandlere).toMatch(/!t\.erEndwise/);
    expect(forhandlere).toMatch(/revokeOwnerInvite/);
    expect(forhandlere).toMatch(/Trekk tilbake/);
    expect(forhandlere).not.toMatch(/t\.eierInviteUbrukt \? \(/);
    expect(forhandlere).not.toMatch(/setActive|impersonat/i);
  });

  it('eier-veiviseren er fire Oppretter-steg uten ansiktsvelger', () => {
    expect(oppstart).toMatch(/visningsnavn|Firmanavn/);
    expect(oppstart).not.toMatch(/AvatarVelger/);
    expect(oppstart).not.toMatch(/fullforAvatarValg/);
    expect(oppstart).toMatch(/Gå live/);
    expect(oppstart).toMatch(/Hopp over \/ neste/);
    expect(oppstart).toMatch(/Henter oppstart/);
    expect(oppstart).not.toMatch(/Laster oppstarten/);
    expect(oppstart).not.toMatch(/Mikael/);
    expect(oppstart).not.toMatch(/['"]shop['"]|['"]twilio['"]/);
    expect(oppstart).not.toMatch(/setModules/);
    expect(oppstart).not.toMatch(/invitasjoner\.opprett/);
  });

  it('ansatt-invite lander etter 2FA uten avatar-steg, eier går til oppstart', () => {
    expect(kilde).not.toMatch(/steg === 'avatar'/);
    expect(kilde).not.toMatch(/Velg avataren din/);
    expect(kilde).not.toMatch(/AvatarVelger/);
    expect(kilde).toMatch(/inv\?\.kind === 'owner'/);
  });

  it('ingen offentlig /registrer-side', () => {
    expect(() => readFileSync(resolve(her, '../app/registrer/page.tsx'), 'utf8')).toThrow();
  });
});
