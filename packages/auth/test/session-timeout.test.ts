import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { medTidsfrist, SESSION_LOOKUP_TIMEOUT_MS } from '../src/session.ts';

const her = dirname(fileURLToPath(import.meta.url));

describe('sesjonsoppslag har tidsfrist', () => {
  it('SESSION_LOOKUP_TIMEOUT_MS matcher poolens connectionTimeoutMillis (5s), ikke 0', () => {
    expect(SESSION_LOOKUP_TIMEOUT_MS).toBe(5_000);
    expect(SESSION_LOOKUP_TIMEOUT_MS).toBeGreaterThan(0);
  });

  it('medTidsfrist avviser hengende promise innen fristen', async () => {
    const start = Date.now();
    await expect(
      medTidsfrist(new Promise(() => undefined), 40, 'Sesjonsoppslag tok for lang tid'),
    ).rejects.toThrow(/Sesjonsoppslag tok for lang tid/);
    expect(Date.now() - start).toBeLessThan(500);
  });

  it('medTidsfrist slipper gjennom det som rekker', async () => {
    await expect(medTidsfrist(Promise.resolve('ok'), 200, 'for sent')).resolves.toBe('ok');
  });

  it('requireSession wrapper getSession i medTidsfrist', () => {
    const kilde = readFileSync(resolve(her, '../src/session.ts'), 'utf8');
    expect(kilde).toMatch(/medTidsfrist\(/);
    expect(kilde).toMatch(/auth\.api\.getSession/);
    expect(kilde).toMatch(/SESSION_LOOKUP_TIMEOUT_MS/);
  });
});
