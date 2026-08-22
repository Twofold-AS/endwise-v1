import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * F13-03 — Next/Turbopack på Vercel inliner ikke `instructions.md` med mindre
 * vi sier ifra. Uten dette faller vi tilbake på `readFileSync` mot `/var/task`.
 */
const config = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../next.config.ts'),
  'utf8',
);

describe('Next bundler inliner agent-instruksjoner (F13-03)', () => {
  it('Turbopack behandler .md som tekststreng', () => {
    expect(config).toMatch(/['"]\*\.md['"]\s*:\s*\{[^}]*type:\s*['"]raw['"]/);
  });

  it('webpack behandler .md som asset/source', () => {
    expect(config).toMatch(/test:\s*\/\\+\.md\$\//);
    expect(config).toMatch(/type:\s*['"]asset\/source['"]/);
  });
});
