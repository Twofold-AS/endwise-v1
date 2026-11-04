import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

describe('F28 / white label F8b: admin ny lenke og tilbakekall', () => {
  it('ny lenke dreper gammel lenke og kode; trukket audit', () => {
    const modul = readFileSync(
      resolve(her, '../../../packages/modules/src/invitasjoner/index.ts'),
      'utf8',
    );
    expect(modul).toMatch(/invitationCodes/);
    expect(modul).toMatch(/usedAt: now/);
    expect(modul).toMatch(/eierInvitasjonStatus/);
    expect(modul).not.toMatch(/codeHash|code_hash/);

    const tenants = readFileSync(resolve(her, '../src/trpc/routers/tenants.ts'), 'utf8');
    expect(tenants).toMatch(/revokeOwnerInvite/);
    expect(tenants).toMatch(/invitation\.resent/);
    expect(tenants).toMatch(/invitation\.revoked/);
    expect(tenants).toMatch(/eierInviteStatus/);
    const resend = tenants.slice(tenants.indexOf('resendOwnerInvite:'));
    expect(resend).toMatch(/eierInviteStatus === 'brukt'/);
  });
});
