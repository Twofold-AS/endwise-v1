import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F27 / white label F8a: invitasjons-UI', () => {
  it('egne felt, auto-send, Fikk ingen kode, CSRF, token ut av URL', () => {
    const side = les('../app/invitasjon/[token]/page.tsx');
    expect(side).toMatch(/Fikk ingen kode\?/);
    expect(side).toMatch(/autoSendt/);
    expect(side).toMatch(/x-endwise-csrf/);
    expect(side).toMatch(/history\.replaceState/);
    expect(side).toMatch(/\/invitasjon/);
    expect(side).toMatch(/send-kode/);
    expect(side).toMatch(/label="Kode"/);
    expect(side).toMatch(/label="Navn"/);
    expect(side).toMatch(/id="inv-kode"/);
    expect(side).toMatch(/id="inv-navn"/);
    expect(side).toMatch(/autoComplete="one-time-code"/);
    expect(side).toMatch(/inputMode="numeric"/);
    expect(side).toMatch(/FeltInput/);
    expect(side).toMatch(/data\?\.sendt/);
    expect(side).not.toMatch(/p-\[5px\]/);
    expect(side).toMatch(/kreverKode/);
    expect(side).toMatch(/Fortsett/);
    expect(side).not.toMatch(/Send meg kode/);
    expect(side).not.toMatch(/#0066ff/);
    expect(side).not.toMatch(/FeltKode|InputOtp/);
  });

  it('Next har POST /invitasjoner/:token/send-kode', () => {
    const rute = les('../app/invitasjoner/[token]/send-kode/route.ts');
    expect(rute).toMatch(/export function POST/);
    expect(rute).toMatch(/handleHono/);
    expect(les('../app/invitasjoner/[token]/route.ts')).not.toMatch(/export function POST/);
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
