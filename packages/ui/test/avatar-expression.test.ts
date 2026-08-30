import { readFileSync } from 'node:fs';
import * as expressions from 'blobatar/expression';
import { describe, expect, it } from 'vitest';

/**
 * Vi tilbyr ikke lenger et uttrykks-vokabular. Biblioteket har dem fortsatt
 * — testen låser at vi ikke importerer dem inn i `Avatar`.
 */

describe('blobatar/expression — biblioteket har dem, vi tilbyr dem ikke', () => {
  it('eksporterer fortsatt idle/happy — vi importerer dem ikke', () => {
    expect(expressions).toHaveProperty('idle');
    expect(expressions).toHaveProperty('happy');
  });
});

describe('Avatar — ingen forced happy, ingen expression-import', () => {
  it('faller til seed/idle ved å utelate expression', () => {
    const kilde = readFileSync(new URL('../src/components/avatar.tsx', import.meta.url), 'utf8');
    expect(kilde).not.toMatch(/from ['"]blobatar\/expression['"]/);
    expect(kilde).not.toMatch(/humor:\s*['"]happy['"]/);
    expect(kilde).not.toMatch(/expression:\s*HUMOR/);
  });
});
