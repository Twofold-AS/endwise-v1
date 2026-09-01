import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { schema } from '@endwise/db';
import { describe, expect, it } from 'vitest';
import {
  erAuthDestinasjon,
  erTenantDestinasjon,
  erTenantTelefonDestinasjon,
} from '../src/produkt-destinasjon.ts';

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
    expect(fn).not.toMatch(/phoneNumber|customers\.phone/);
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
    const tenantFn = dest.slice(
      dest.indexOf('export async function erTenantDestinasjon'),
      dest.indexOf('function erEnkelTelefon'),
    );
    expect(notify).toMatch(/erTenantDestinasjon\(db, tenantId, to\)/);
    expect(notify).not.toMatch(/erProduktDestinasjon|erAuthDestinasjon\(db, to\)/);
    expect(tenantFn).toMatch(/schema\.customers\.tenantId/);
    expect(tenantFn).toMatch(/schema\.member\.organizationId/);
    expect(tenantFn).toMatch(/withTenant/);
    expect(tenantFn).not.toMatch(/customers\.phone/);
  });

  it('varsel-SMS krever tenant — tom tenant / ugyldig nummer er nei', async () => {
    await expect(erTenantTelefonDestinasjon({} as never, '', '+4791111111')).resolves.toBe(false);
    await expect(erTenantTelefonDestinasjon({} as never, '   ', '+4791111111')).resolves.toBe(
      false,
    );
    await expect(erTenantTelefonDestinasjon({} as never, 'tenant-a', 'ikke-telefon')).resolves.toBe(
      false,
    );
    await expect(
      erTenantTelefonDestinasjon({} as never, 'tenant-a', '+4791111111,+4792222222'),
    ).resolves.toBe(false);
    await expect(erTenantTelefonDestinasjon({} as never, 'tenant-a', '+4791111111')).resolves.toBe(
      false,
    );
  });

  it('notify SMS går gjennom erTenantTelefonDestinasjon — ikke global customers.phone i auth', () => {
    const dest = les('../src/produkt-destinasjon.ts');
    const notify = les('../../../apps/api/src/workflows/notify.ts');
    const twilioAuth = les('../src/senders/twilio.ts');
    const telefonFn = dest.slice(dest.indexOf('export async function erTenantTelefonDestinasjon'));
    expect(notify).toMatch(/erTenantTelefonDestinasjon\(db, tenantId, to\)/);
    expect(telefonFn).toMatch(/schema\.customers\.tenantId/);
    expect(telefonFn).toMatch(/schema\.customers\.phone/);
    expect(telefonFn).toMatch(/schema\.member\.organizationId/);
    expect(les('../src/auth.ts')).not.toMatch(/erTenantTelefonDestinasjon|customers\.phone/);
    expect(twilioAuth).toMatch(/verifications\.create\(\{\s*to:\s*phoneNumber/);
    expect(twilioAuth).not.toMatch(/customers|erTenant|erAuthDestinasjon/);
  });
});
