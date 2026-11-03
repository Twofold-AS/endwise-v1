import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F31 / white label F10: onboarding UI', () => {
  it('oppstart har fire Oppretter-steg, hopp og Gå live uten #0066ff', () => {
    const flate = readFileSync(resolve(her, '../app/(app)/oppstart/_oppstart-flate.tsx'), 'utf8');
    expect(flate).toMatch(/useOppretter/);
    expect(flate).toMatch(/Steg \{o\.stegIndeks \+ 1\} av \{o\.stegAntall\}/);
    expect(flate).toMatch(/valgfri: true/);
    expect(flate).toMatch(/Gå live/);
    expect(flate).toMatch(/Hopp over \/ neste/);
    expect(flate).toMatch(/slugSjekk/);
    expect(flate).toMatch(/SjekkSteg/);
    expect(flate).not.toMatch(/#0066ff/);
  });
});
