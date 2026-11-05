import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F34 / white label F11c: deler og kvitteringer UI', () => {
  it('Deler og kvitteringer uten betaling og uten #0066ff', () => {
    const butikk = readFileSync(resolve(her, '../app/%5Fkunde/_lib/butikk.tsx'), 'utf8');
    const portal = readFileSync(resolve(her, '../app/%5Fkunde/_lib/portal.tsx'), 'utf8');
    expect(butikk).toMatch(/kunde\.butikk/);
    expect(butikk).toMatch(/kunde\.kvitteringer/);
    expect(butikk).toMatch(/Vipps er satt på vent/);
    expect(butikk).toMatch(/DeaktivertHandling/);
    expect(portal).toMatch(/\/deler/);
    expect(portal).toMatch(/\/kvitteringer/);
    expect(butikk).not.toMatch(/#0066ff/);
  });
});
