import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F30 / white label F9: tilganger UI', () => {
  it('Organisasjon har Se/Endre-matrise, TOTP og deaktivert-ikke-skjult', () => {
    const side = readFileSync(resolve(her, '../app/(app)/organisasjon/page.tsx'), 'utf8');
    const flate = readFileSync(resolve(her, '../app/(app)/organisasjon/_tilganger.tsx'), 'utf8');
    expect(side).toMatch(/TilgangerFlate/);
    expect(side).not.toMatch(/Tilgangsstyring kommer senere/);
    expect(flate).toMatch(/tillatelse\.liste/);
    expect(flate).toMatch(/tillatelse\.sett/);
    expect(flate).toMatch(/FeltKode/);
    expect(flate).toMatch(/DeaktivertHandling/);
    expect(flate).toMatch(/OMRADER_NAVN/);
    expect(flate).toMatch(/Du kan ikke endre egne tilganger/);
    expect(flate).toMatch(/Endringslogg/);
    expect(flate).toMatch(/aktivitet-endwise/);
    expect(flate).toMatch(/OpprettAnsattDialog/);
    expect(flate).not.toMatch(/#0066ff/);
  });
});
