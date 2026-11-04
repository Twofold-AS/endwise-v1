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

  it('velg har Privat og Bedrift med TOTP', () => {
    const side = les('../app/%5Fkunde/[slug]/velg/page.tsx');
    const skjema = les('../app/%5Fkunde/[slug]/velg/velg-skjema.tsx');
    expect(side).toMatch(/VelgSkjema/);
    expect(skjema).toMatch(/kontekst\.bytt/);
    expect(skjema).toMatch(/Privat/);
    expect(skjema).toMatch(/Bedrift/);
    expect(skjema).toMatch(/length=\{6\}/);
    expect(skjema).not.toMatch(/#0066ff/);
  });

  it('tRPC sender CSRF-header', () => {
    expect(les('../app/providers.tsx')).toMatch(/x-endwise-csrf/);
  });
});
