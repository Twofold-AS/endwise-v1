import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * E-postbytte i UI er to steg. Skjemaet i profilen ber om bytte;
 * bekreftelsessiden er det som kaller verifyEmail.
 */

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F1-27: e-postbytte er to steg i UI-et', () => {
  it('profil-fanen har ByttEpostSkjema og leser e-post readOnly', () => {
    const fane = les('../app/(app)/innstillinger/_profil-fane.tsx');
    expect(fane).toMatch(/ByttEpostSkjema/);
    expect(fane).toMatch(/readOnly/);
    expect(fane).not.toMatch(/authClient\.updateUser/);
    expect(fane).not.toMatch(/set\(\s*\{\s*email/);
  });

  it('skjemaet kaller changeEmail, ikke updateUser', () => {
    const skjema = les('../app/(app)/_shell/bytt-epost.tsx');
    expect(skjema).toMatch(/changeEmail/);
    expect(skjema).toMatch(/byttEpostKall/);
    expect(skjema).not.toMatch(/Gjeldende passord|type=['"]password['"]/);
    expect(skjema).not.toMatch(/updateUser/);
    expect(skjema).toMatch(/Send bekreftelse/);
  });

  it('bekreftelsessiden kaller verifyEmail og aldri updateUser', () => {
    const side = les('../app/bekreft-epost/page.tsx');
    expect(side).toMatch(/verifyEmail/);
    expect(side).not.toMatch(/updateUser/);
    expect(side).not.toMatch(/changeEmail/);
  });
});
