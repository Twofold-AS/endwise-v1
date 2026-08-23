import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Mons P0 — plattform-eier kan ikke degraderes via Better-Auth API.
 * UI sperrer allerede; hook + DB-trigger er sperren mot direkte kall.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Eier-lås (CWE-284)', () => {
  it('before-hooken nekter updateMemberRole/removeMember på plattform-eier', () => {
    const hook = les('../src/bytt-passord-server.ts');
    const las = les('../src/eier-las-server.ts');
    const auth = les('../src/auth.ts');

    expect(hook).toContain('eierLasForHook');
    expect(hook).toContain('BYTT_PASSORD_FOR_HOOK_ID');
    expect(auth).toMatch(/hooks:\s*\{\s*before:\s*byttPassordForHook/);

    expect(las).toMatch(/update-member-role/);
    expect(las).toMatch(/remove-member/);
    expect(las).toMatch(/endwise_admin/);
    expect(las).toMatch(/slug.*endwise|endwise.*slug/);
  });
});
