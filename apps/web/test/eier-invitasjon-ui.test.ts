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
  const oppstart = readFileSync(resolve(her, '../app/(app)/oppstart/page.tsx'), 'utf8');
  const avatar = readFileSync(resolve(her, '../app/(app)/_avatar/avatar-velger.tsx'), 'utf8');
  const pakke = readFileSync(resolve(her, '../app/(app)/endwise/_pakke-valg.tsx'), 'utf8');

  it('godta-siden ber om passord og har ingen tilleggs-UI', () => {
    expect(kilde).toMatch(/Sett eller bytt passord|Velg et passord/);
    expect(kilde).toMatch(/twoFactor\.(enable|sendOtp|verifyOtp)/);
    expect(kilde).toMatch(/Bekrefter …/);
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
    expect(kilde).toMatch(/Klarte ikke hente invitasjonen\. Prøv igjen\./);
    expect(kilde).toMatch(/fetch\(`\/invitasjoner\/\$\{encodeURIComponent\(token\)\}`\)/);
    expect(kilde).not.toMatch(/fetch\(`\/invitasjon\/\$\{/);
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

  it('forhandlere-siden bruker nivå + tillegg og skjuler Endwise-handlinger', () => {
    expect(forhandlere).toMatch(/NivaaValg/);
    expect(forhandlere).toMatch(/TilleggListe/);
    expect(forhandlere).toMatch(/Endre pakke/);
    expect(forhandlere).toMatch(/pakkeKatalog/);
    expect(forhandlere).toMatch(/tenants\.update/);
    expect(forhandlere).toMatch(/sendSlettKode/);
    expect(forhandlere).toMatch(/Slett forhandleren/);
    expect(forhandlere).toMatch(/Eieren setter\s+passord og 2FA\s+selv — du setter det aldri/);
    expect(forhandlere).toMatch(/Velg én pakke/);
    expect(forhandlere).toMatch(/Send invitasjon på nytt/);
    expect(forhandlere).toMatch(/t\.erEndwise/);
    expect(forhandlere).toMatch(/!t\.erEndwise/);
    expect(forhandlere).toMatch(/eierInviteUbrukt/);
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
    expect(forhandlere).toMatch(/t\.eierInviteUbrukt \? \(/);
    expect(forhandlere).not.toMatch(/setActive|impersonat/i);
  });

  it('eier-veiviseren er visningsnavn · avatar · team', () => {
    expect(oppstart).toMatch(/Visningsnavn/);
    expect(oppstart).toMatch(/AvatarVelger/);
    expect(oppstart).toMatch(/fullforAvatarValg/);
    expect(oppstart).toMatch(/Team/);
    expect(oppstart).toMatch(/Pakken din er/);
    expect(oppstart).toMatch(/optional\.length/);
    expect(oppstart).toMatch(/Inviter teamet/);
    expect(oppstart).toMatch(/invitasjoner\.opprett/);
    expect(oppstart).toMatch(/selger|mekaniker/);
    expect(oppstart).toMatch(/StatefulButton/);
    expect(oppstart).toMatch(/Vi henter oppstarten/);
    expect(oppstart).not.toMatch(/Laster oppstarten/);
    expect(oppstart).not.toMatch(/Mikael/);
    expect(oppstart).not.toMatch(/['"]shop['"]|['"]twilio['"]/);
    expect(oppstart).not.toMatch(/setModules/);
  });

  it('avatar-velgeren er ett ansikt med Ny tilfeldig, farge og humør — ikke fire nedtrekk', () => {
    expect(avatar).toMatch(/Ny tilfeldig/);
    expect(avatar).toMatch(/HUMOR\.map/);
    expect(avatar).toMatch(/FARGER\.map/);
    expect(avatar).toMatch(/TONER\.map/);
    expect(avatar).not.toMatch(/function Nedtrekk/);
    expect(avatar).not.toMatch(/id="humor"/);
  });

  it('ansatt-invite har avatar-steg etter 2FA, eier går til oppstart', () => {
    expect(kilde).toMatch(/steg === 'avatar'/);
    expect(kilde).toMatch(/Velg avataren din/);
    expect(kilde).toMatch(/fullforAvatarValg/);
    expect(kilde).toMatch(/inv\.kind === 'owner'/);
    expect(kilde).toMatch(/setSteg\('avatar'\)/);
    expect(kilde).toMatch(/AvatarVelger/);
  });

  it('ingen offentlig /registrer-side', () => {
    expect(() => readFileSync(resolve(her, '../app/registrer/page.tsx'), 'utf8')).toThrow();
  });
});
