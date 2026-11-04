import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F35 / white label F12: Mine data UI', () => {
  it('Mine data og personvern uten #0066ff', () => {
    const innsyn = readFileSync(resolve(her, '../app/%5Fkunde/_lib/innsyn.tsx'), 'utf8');
    const skall = readFileSync(resolve(her, '../app/%5Fkunde/_lib/skall.tsx'), 'utf8');
    expect(innsyn).toMatch(/kunde\.mineData/);
    expect(innsyn).toMatch(/Personvern/);
    expect(skall).toMatch(/\/mine-data/);
    expect(innsyn).not.toMatch(/#0066ff/);
  });
});
