import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41-12: velkomst ved Opprett kunde', () => {
  it('create sender velkomst etter insert, svelger Resend-feil', () => {
    const kilde = les('../src/trpc/routers/customers.ts');
    const create = kilde.slice(kilde.indexOf('create: staffProcedure'), kilde.indexOf('update:'));
    expect(create).toMatch(/sendVelkomstEtterKnytning/);
    expect(create.indexOf('.returning()')).toBeLessThan(
      create.indexOf('sendVelkomstEtterKnytning'),
    );
    expect(create).toMatch(/\.catch\(/);
    expect(create).toMatch(/velkomst/);
  });

  it('byId viser om invitasjon er sendt; sendVelkomst kan kjøres på nytt', () => {
    const kilde = les('../src/trpc/routers/customers.ts');
    expect(kilde).toMatch(/velkomstSendtAt/);
    expect(kilde).toMatch(/kunde\.velkomst/);
    expect(kilde).toMatch(/sendVelkomst:/);
    expect(kilde).toMatch(/tving:\s*true/);
  });
});
