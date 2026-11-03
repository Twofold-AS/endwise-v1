import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F31 / white label F10: onboarding-ruter', () => {
  it('har slugSjekk, lagre og idempotent fullfor med Gå live', () => {
    const rute = readFileSync(resolve(her, '../src/trpc/routers/onboarding.ts'), 'utf8');
    expect(rute).toMatch(/slugSjekk:/);
    expect(rute).toMatch(/lagre:/);
    expect(rute).toMatch(/publisertAt/);
    expect(rute).toMatch(/complete: true/);
    expect(rute).not.toMatch(/Oppstarten er allerede fullført/);
    expect(rute).not.toMatch(/#0066ff/);
  });
});
