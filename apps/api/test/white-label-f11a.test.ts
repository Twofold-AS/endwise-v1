import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F32 / white label F11a: kundeportal les', () => {
  it('kunde-ruter bruker customerProcedure og withCustomer', () => {
    const rute = readFileSync(resolve(her, '../src/trpc/routers/kunde.ts'), 'utf8');
    const app = readFileSync(resolve(her, '../src/trpc/router.ts'), 'utf8');
    expect(app).toMatch(/kunde: kundeRouter/);
    expect(rute).toMatch(/customerProcedure/);
    expect(rute).toMatch(/withCustomer/);
    expect(rute).toMatch(/bookinger:/);
    expect(rute).toMatch(/kjoretoy:/);
    expect(rute).toMatch(/varsler:/);
    expect(rute).toMatch(/aktivJobb:/);
    expect(rute).toMatch(/byggVarsler/);
    expect(rute).not.toMatch(/#0066ff/);
  });
});
