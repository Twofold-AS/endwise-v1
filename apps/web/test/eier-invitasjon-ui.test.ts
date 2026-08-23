import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F5-26 — invitee-siden har ingen modul-/planvelger.
 * Admin tildeler tillegg. Eieren setter bare passord.
 */
describe('F5-26: invitasjonssiden har ingen modulvelger', () => {
  const her = dirname(fileURLToPath(import.meta.url));
  const kilde = readFileSync(resolve(her, '../app/invitasjon/[token]/page.tsx'), 'utf8');
  const forhandlere = readFileSync(
    resolve(her, '../app/(app)/endwise/forhandlere/page.tsx'),
    'utf8',
  );

  it('godta-siden ber om passord og har ingen tilleggs-UI', () => {
    expect(kilde).toMatch(/Sett eller bytt passord|Velg et passord/);
    expect(kilde).toMatch(/2fa-oppsett/);
    expect(kilde).not.toMatch(/ADDON_MODULES|tenant_modules|Velg moduler|planvelger|abonnement/);
    expect(kilde).not.toMatch(/addonKatalog|setModules/);
  });

  it('forhandlere-siden er der admin krysser av tillegg', () => {
    expect(forhandlere).toMatch(/Betalte tillegg/);
    expect(forhandlere).toMatch(/addonKatalog/);
    expect(forhandlere).toMatch(/setModules/);
    expect(forhandlere).toMatch(/Send invitasjon på nytt/);
    expect(forhandlere).toMatch(/setter passord selv/);
    expect(forhandlere).not.toMatch(/href:\s*['"]\/registrer['"]|href=['"]\/registrer['"]/);
    expect(forhandlere).not.toMatch(/['"]shop['"]|['"]twilio['"]|Nettbutikk/);
  });

  it('ingen offentlig /registrer-side', () => {
    expect(() => readFileSync(resolve(her, '../app/registrer/page.tsx'), 'utf8')).toThrow();
  });
});
