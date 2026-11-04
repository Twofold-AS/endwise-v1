import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('F40 — Ny forhandler med subdomene', () => {
  const side = les('../app/(app)/endwise/forhandlere/page.tsx');

  it('Ny forhandler har navn, subdomene, e-post og forhåndsvisning', () => {
    expect(side).toMatch(/Ny forhandler/);
    expect(side).toMatch(/label="Navn"/);
    expect(side).toMatch(/label="Subdomene"/);
    expect(side).toMatch(/E-post til forhandler-admin/);
    expect(side).toMatch(/kundeVert/);
    expect(side).toMatch(/tenants\.sjekkSlug/);
    expect(side).toMatch(/tenants\.create/);
    expect(side).toMatch(/www, app, platform, api/);
    expect(side).not.toMatch(/#0066ff/);
  });

  it('forhandlerkortet kan endre subdomene', () => {
    expect(side).toMatch(/tenants\.update/);
    expect(side).toMatch(/excludeTenantId/);
    expect(side).toMatch(/Endrer du subdomenet/);
  });

  it('ukjent slug viser nøytral 404, ikke innlogging', () => {
    expect(les('../app/%5Fkunde/%5Fukjent/page.tsx')).toMatch(/UkjentSide/);
    expect(les('../app/%5Fkunde/[slug]/layout.tsx')).toMatch(/if \(!tenant\) return <UkjentSide/);
    expect(les('../app/%5Fkunde/_lib/ukjent-side.tsx')).toMatch(/Siden finnes ikke/);
    expect(les('../app/%5Fkunde/_lib/ukjent-side.tsx')).not.toMatch(
      /endwise\.no\/logg-inn|Logg inn/,
    );
  });
});
