import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const src = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../app/manifest.ts'),
  'utf8',
);

describe('PWA-manifest (produkt-tokens)', () => {
  it('bruker lyst bakgrunn og svart aksent, ikke mørk/grønn', () => {
    expect(src).toMatch(/background_color:\s*'#ffffff'/);
    expect(src).toMatch(/theme_color:\s*'#111111'/);
    expect(src).not.toMatch(/#151515|#1ED27D|#EE2924/i);
  });
});
