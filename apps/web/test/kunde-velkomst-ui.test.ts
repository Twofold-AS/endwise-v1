import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F41-12: Invitasjon sendt på kundekortet', () => {
  it('Opprett kunde toaster Invitasjon sendt når e-post gikk', () => {
    const skjema = les('../app/(app)/kunder/_ny-kunde.tsx');
    expect(skjema).toMatch(/Invitasjon sendt/);
    expect(skjema).toMatch(/velkomst\?\.sendt/);
  });

  it('kundekort har status og Send på nytt når kunden har e-post', () => {
    const kort = les('../app/(app)/kunder/[id]/page.tsx');
    expect(kort).toMatch(/Invitasjon sendt/);
    expect(kort).toMatch(/Send på nytt/);
    expect(kort).toMatch(/customers\.sendVelkomst/);
    expect(kort).toMatch(/velkomstSendtAt/);
    expect(kort).toMatch(/data-kunde-seksjon="invitasjon"/);
  });
});
