import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { schema } from '@endwise/db';
import { describe, expect, it } from 'vitest';
import { erAuthDestinasjon, erTenantDestinasjon } from '../src/produkt-destinasjon.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

function tomKjede() {
  const k: Record<string, unknown> = {};
  k.from = () => k;
  k.innerJoin = () => k;
  k.where = () => k;
  k.limit = async () => [];
  return k;
}

function dbSomFeilerPaCustomers() {
  return {
    select() {
      return {
        from(table: unknown) {
          if (table === schema.customers) {
            throw new Error('auth-dest skal ikke lese customers');
          }
          return tomKjede();
        },
      };
    },
  };
}

describe('dest-kanaler: auth ≠ varsel (Mons dest-lås)', () => {
  it('magic-link bruker erAuthDestinasjon — ikke customers.email', () => {
    const dest = les('../src/produkt-destinasjon.ts');
    const auth = les('../src/auth.ts');
    const fn = dest.slice(
      dest.indexOf('export async function erAuthDestinasjon'),
      dest.indexOf('export async function erTenantDestinasjon'),
    );
    expect(auth).toMatch(/erAuthDestinasjon\(db, email\)/);
    expect(fn).toMatch(/schema\.user\.email/);
    expect(fn).toMatch(/schema\.invitation/);
    expect(fn).toMatch(/schema\.invitations/);
    expect(fn).not.toMatch(/schema\.customers/);
  });

  it('⛔ customers.email som ikke er bruker/invitee er ikke auth-dest', async () => {
    await expect(
      erAuthDestinasjon(dbSomFeilerPaCustomers() as never, 'kunde-uten-konto@verksted.no'),
    ).resolves.toBe(false);
    await expect(erAuthDestinasjon({} as never, 'ikke-en-epost')).resolves.toBe(false);
    await expect(erAuthDestinasjon({} as never, 'a@b.no,c@d.no')).resolves.toBe(false);
  });

  it('varsel-dest krever tenant — tom tenant er nei', async () => {
    await expect(erTenantDestinasjon({} as never, '', 'kunde@a.no')).resolves.toBe(false);
    await expect(erTenantDestinasjon({} as never, '   ', 'kunde@a.no')).resolves.toBe(false);
    await expect(erTenantDestinasjon({} as never, 'tenant-a', 'ikke-epost')).resolves.toBe(false);
  });

  it('notify bruker erTenantDestinasjon med tenant-id, ikke auth-OR-en', () => {
    const dest = les('../src/produkt-destinasjon.ts');
    const notify = les('../../../apps/api/src/workflows/notify.ts');
    const tenantFn = dest.slice(dest.indexOf('export async function erTenantDestinasjon'));
    expect(notify).toMatch(/erTenantDestinasjon\(db, tenantId, to\)/);
    expect(notify).not.toMatch(/erProduktDestinasjon|erAuthDestinasjon\(db, to\)/);
    expect(tenantFn).toMatch(/schema\.customers\.tenantId/);
    expect(tenantFn).toMatch(/schema\.member\.organizationId/);
    expect(tenantFn).toMatch(/withTenant/);
  });
});
