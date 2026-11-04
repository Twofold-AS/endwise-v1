import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F32 / white label F11a: kundeportal UI', () => {
  it('Min side, bookinger, kjøretøy og profil uten #0066ff', () => {
    const portal = readFileSync(resolve(her, '../app/%5Fkunde/_lib/portal.tsx'), 'utf8');
    const skall = readFileSync(resolve(her, '../app/%5Fkunde/_lib/skall.tsx'), 'utf8');
    expect(portal).toMatch(/kunde\.bookinger/);
    expect(portal).toMatch(/kunde\.kjoretoy/);
    expect(portal).toMatch(/Servicehistorikk/);
    expect(portal).toMatch(/DeaktivertHandling/);
    expect(skall).toMatch(/\/bookinger/);
    expect(skall).toMatch(/\/kjoretoy/);
    expect(skall).toMatch(/\/profil/);
    expect(portal).not.toMatch(/#0066ff/);
    expect(skall).toMatch(/FORBUDT_CTA/);
  });
});
