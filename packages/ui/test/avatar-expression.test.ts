import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BLOUB_HVILE } from '../src/lib/bloub-hvile.ts';

describe('Avatar — store øyne, ingen blobatar-expression', () => {
  it('hviler på surpris, ikke neutre', () => {
    expect(BLOUB_HVILE).toBe('surpris');
  });

  it('importerer ikke blobatar', () => {
    const kilde = readFileSync(new URL('../src/components/avatar.tsx', import.meta.url), 'utf8');
    expect(kilde).not.toMatch(/from ['"]blobatar\/expression['"]/);
    expect(kilde).not.toMatch(/@blobatar/);
    expect(kilde).not.toMatch(/humor:\s*['"]happy['"]/);
  });
});
