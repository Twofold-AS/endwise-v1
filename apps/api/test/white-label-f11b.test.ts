import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F33 / white label F11b: kundeportal handling', () => {
  it('kunde-ruter har bestill og sendMelding via customerProcedure', () => {
    const rute = readFileSync(resolve(her, '../src/trpc/routers/kunde.ts'), 'utf8');
    expect(rute).toMatch(/customerProcedure/);
    expect(rute).toMatch(/createPortalBookingRequest/);
    expect(rute).toMatch(/sendKundeMelding/);
    expect(rute).toMatch(/jobbFase/);
    expect(rute).toMatch(/bestill:/);
    expect(rute).toMatch(/sendMelding:/);
    expect(rute).not.toMatch(/#0066ff/);
  });
});
