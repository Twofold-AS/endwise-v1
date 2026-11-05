import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { byggVelkomstEpost, skalSendeVelkomst } from '../src/senders/velkomst.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('F35 / white label F12: velkomst', () => {
  it('sender ikke ved Quick-import', () => {
    expect(skalSendeVelkomst('quick')).toBe(false);
    expect(skalSendeVelkomst('endwise')).toBe(true);
    expect(skalSendeVelkomst(null)).toBe(true);
  });

  it('teksten har ingen personopplysninger', () => {
    const epost = byggVelkomstEpost({
      merke: { navn: 'Nordvik', levertAv: true },
      personvernUrl: 'https://nordvik.endwise.no/personvern',
      avmeldUrl: 'https://nordvik.endwise.no/personvern',
      loggInnUrl: 'https://nordvik.endwise.no/logg-inn',
    });
    expect(epost.subject).toBe('Velkommen');
    expect(epost.text).toMatch(/Personvernerklæring/);
    expect(epost.text).toMatch(/https:\/\/nordvik\.endwise\.no\/logg-inn/);
    expect(epost.text).not.toMatch(/kari@|@kunde/);
    expect(epost.html).not.toMatch(/#0066ff/);
    expect(epost.html).toMatch(/personvern/);
    expect(epost.html).toMatch(/nordvik\.endwise\.no\/logg-inn/);
    expect(epost.html).toMatch(/Logg inn/);
  });

  it('velkomst-lenker er <sub>.endwise.no — ikke app eller apex', () => {
    const kilde = readFileSync(resolve(her, '../src/senders/velkomst.ts'), 'utf8');
    expect(kilde).toMatch(/forhandlerOffentligUrl/);
    expect(kilde).toMatch(/ingen_slug/);
    expect(kilde).toMatch(/\/logg-inn/);
    expect(kilde).toMatch(/console\.info\('\[kunde\.velkomst\]'/);
    expect(kilde).toMatch(/opts\?\.tving/);
    expect(kilde).toMatch(/ingen_epost/);
    expect(kilde).not.toMatch(/appOffentligUrl|app\.endwise\.no/);
    expect(kilde).not.toMatch(/`https:\/\/\$\{rot\}`/);
  });
});
