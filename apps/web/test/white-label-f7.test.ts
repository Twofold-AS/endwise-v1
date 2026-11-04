import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F26 / white label F7: logg-inn og velg', () => {
  it('logg-inn er ekte e-postkode, ikke kommer-snart', () => {
    const side = les('../app/%5Fkunde/[slug]/logg-inn/page.tsx');
    const skjema = les('../app/%5Fkunde/[slug]/logg-inn/logg-inn-skjema.tsx');
    expect(side).toMatch(/LoggInnSkjema/);
    expect(side).not.toMatch(/KommerSnart/);
    expect(skjema).toMatch(/signIn\.magicLink/);
    expect(skjema).toMatch(/FeltKode/);
    expect(skjema).not.toMatch(/#0066ff/);
  });

  it('velg på kundevert går til min-side — ikke Privat/Bedrift', () => {
    const side = les('../app/%5Fkunde/[slug]/velg/page.tsx');
    expect(side).toMatch(/redirect\('\/min-side' as Route\)/);
    expect(side).not.toMatch(/Privat|Bedrift|VelgSkjema/);
  });

  it('kunde-innlogging tar e-post eller telefon og røper ikke konto', () => {
    const skjema = les('../app/%5Fkunde/[slug]/logg-inn/logg-inn-skjema.tsx');
    expect(skjema).toMatch(/E-post eller telefon/);
    expect(skjema).toMatch(/beOmKode/);
    expect(skjema).toMatch(/Hvis kontoen finnes, får du en kode på e-post\./);
    expect(skjema).toMatch(/\/min-side/);
    expect(skjema).not.toMatch(/#0066ff/);
  });

  it('tRPC sender CSRF-header', () => {
    expect(les('../app/providers.tsx')).toMatch(/x-endwise-csrf/);
  });
});
