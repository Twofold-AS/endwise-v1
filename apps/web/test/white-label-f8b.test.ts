import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F28 / white label F8b: platform-invitasjon UI', () => {
  it('status, send på nytt og trekk tilbake er deaktivert ikke skjult', () => {
    const side = readFileSync(resolve(her, '../app/(app)/endwise/forhandlere/page.tsx'), 'utf8');
    expect(side).toMatch(/INVITASJON_STATUS_TEKST/);
    expect(side).toMatch(/Kode sendt/);
    expect(side).toMatch(/Trekk tilbake/);
    expect(side).toMatch(/revokeOwnerInvite/);
    expect(side).toMatch(/Send invitasjon på nytt/);
    expect(side).toMatch(/disabled=\{/);
    expect(side).not.toMatch(/t\.eierInviteUbrukt \? \(/);
    expect(side).not.toMatch(/#0066ff/);
  });
});
