import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F27 / white label F8a: invitasjons-UI', () => {
  it('Send meg kode, CSRF, token ut av URL, ingen #0066ff', () => {
    const side = les('../app/invitasjon/[token]/page.tsx');
    expect(side).toMatch(/Send meg kode/);
    expect(side).toMatch(/x-endwise-csrf/);
    expect(side).toMatch(/history\.replaceState/);
    expect(side).toMatch(/\/invitasjon/);
    expect(side).toMatch(/send-kode/);
    expect(side).toMatch(/Kode fra e-posten/);
    expect(side).toMatch(/kreverKode/);
    expect(side).toMatch(/Hva heter du/);
    expect(side).toMatch(/Fortsett/);
    expect(side).not.toMatch(/#0066ff/);
    expect(side).not.toMatch(/FeltKode|InputOtp/);
  });

  it('layout er no-referrer og noindex', () => {
    const layout = les('../app/invitasjon/layout.tsx');
    expect(layout).toMatch(/referrer:\s*'no-referrer'/);
    expect(layout).toMatch(/index:\s*false/);
  });

  it('refresh uten token viser samme feil', () => {
    const side = les('../app/invitasjon/page.tsx');
    expect(side).toMatch(/Invitasjonen er ugyldig, brukt eller utløpt/);
    expect(side).toMatch(/Invitasjonen virker ikke/);
  });
});
