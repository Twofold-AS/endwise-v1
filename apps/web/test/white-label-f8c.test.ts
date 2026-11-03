import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F29 / white label F8c: daglig leder UI', () => {
  it('Organisasjon har overføring og stedfortreder uten #0066ff', () => {
    const side = readFileSync(resolve(her, '../app/(app)/organisasjon/page.tsx'), 'utf8');
    const flate = readFileSync(resolve(her, '../app/(app)/organisasjon/_daglig-leder.tsx'), 'utf8');
    expect(side).toMatch(/daglig-leder/);
    expect(flate).toMatch(/eier\.overfor/);
    expect(flate).toMatch(/eier\.settStedfortreder/);
    expect(flate).toMatch(/FeltKode/);
    expect(flate).not.toMatch(/#0066ff/);
  });
});
