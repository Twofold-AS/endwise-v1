import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F37 / white label F14: Framer merkes tillegg', () => {
  it('nav og plugin sier tillegg, ikke kjerne', () => {
    const nav = readFileSync(resolve(her, '../app/(app)/_shell/nav.ts'), 'utf8');
    const plugin = readFileSync(resolve(her, '../../../framer-plugin/src/App.tsx'), 'utf8');
    const manifest = readFileSync(resolve(her, '../../../framer-plugin/framer.json'), 'utf8');
    expect(nav).toMatch(/Tillegg · Framer-plugin/);
    expect(plugin).toMatch(/tillegg/i);
    expect(manifest).toMatch(/tillegg/i);
    expect(plugin).not.toMatch(/#0066ff/);
  });
});
