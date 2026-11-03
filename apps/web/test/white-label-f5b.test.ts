import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseOrgSeksjon } from '../app/(app)/organisasjon/_seksjoner.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F22 / white label F5b: JIT-UI', () => {
  it('Se verkstedet har be-om-tilgang med deaktivert handling', () => {
    const panel = les('../app/(app)/endwise/verksted/[slug]/_jit.tsx');
    expect(panel).toMatch(/Be om skrive-tilgang/);
    expect(panel).toMatch(/DeaktivertHandling/);
    expect(panel).toMatch(/FeltTekst/);
    expect(panel).not.toMatch(/#0066ff/);
    expect(panel).not.toMatch(/impersonat/i);
    expect(les('../app/(app)/endwise/verksted/[slug]/home/page.tsx')).toMatch(/JitPanel/);
  });

  it('Aktivitet fra Endwise er admin-seksjon, ikke innstillinger-fane', () => {
    expect(parseOrgSeksjon('aktivitet-endwise', true)).toBe('aktivitet-endwise');
    expect(parseOrgSeksjon('aktivitet-endwise', false)).toBe('oversikt');
    const org = les('../app/(app)/organisasjon/page.tsx');
    expect(org).toMatch(/Aktivitet fra Endwise/);
    expect(org).toMatch(/AktivitetFraEndwise/);
    expect(les('../app/(app)/innstillinger/_faner.ts')).not.toMatch(/aktivitet-endwise/);
  });
});
