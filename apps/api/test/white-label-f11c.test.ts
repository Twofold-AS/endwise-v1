import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F34 / white label F11c: deler og kvitteringer', () => {
  it('butikk og kvitteringer er stengt uten kasse', () => {
    const rute = readFileSync(resolve(her, '../src/trpc/routers/kunde.ts'), 'utf8');
    expect(rute).toMatch(/kundeButikkStatus/);
    expect(rute).toMatch(/kvitteringer:/);
    expect(rute).toMatch(/shop_blokkert|F10-03/);
    expect(rute).not.toMatch(/createCheckout/);
    expect(rute).not.toMatch(/#0066ff/);
  });
});
