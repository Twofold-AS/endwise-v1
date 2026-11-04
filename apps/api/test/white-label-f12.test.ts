import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F35 / white label F12: GDPR-innsyn', () => {
  it('mineData eksporterer bare kundens egne rader', () => {
    const rute = readFileSync(resolve(her, '../src/trpc/routers/kunde.ts'), 'utf8');
    expect(rute).toMatch(/mineData:/);
    expect(rute).toMatch(/withCustomer/);
    expect(rute).toMatch(/eq\(schema\.bookings\.customerId, kunde\.id\)/);
    expect(rute).not.toMatch(/#0066ff/);
  });
});
