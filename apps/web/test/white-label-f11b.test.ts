import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F33 / white label F11b: kundeportal UI', () => {
  it('Bestill, meldinger og sporing uten #0066ff', () => {
    const bestill = readFileSync(resolve(her, '../app/%5Fkunde/_lib/bestill.tsx'), 'utf8');
    const meldinger = readFileSync(resolve(her, '../app/%5Fkunde/_lib/meldinger.tsx'), 'utf8');
    const portal = readFileSync(resolve(her, '../app/%5Fkunde/_lib/portal.tsx'), 'utf8');
    const faner = readFileSync(resolve(her, '../app/%5Fkunde/_lib/faner.ts'), 'utf8');
    expect(bestill).toMatch(/kunde\.bestill/);
    expect(bestill).toMatch(/FeltKalender/);
    expect(meldinger).toMatch(/kunde\.sendMelding/);
    expect(portal).toMatch(/Mottatt/);
    expect(portal).toMatch(/Under arbeid/);
    expect(meldinger).toMatch(/\/meldinger|sendMelding/);
    expect(faner).toMatch(/\/meldinger/);
    expect(bestill).not.toMatch(/#0066ff/);
    expect(meldinger).not.toMatch(/#0066ff/);
    expect(portal).not.toMatch(/#0066ff/);
  });
});
