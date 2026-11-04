import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@endwise/modules/tenant-host', async (orig) => {
  const mod = await orig();
  return {
    ...mod,
    erWhiteLabelAktiv: vi.fn(() => false),
  };
});

import { erWhiteLabelAktiv } from '@endwise/modules/tenant-host';
import { appRouter } from '../src/trpc/router.ts';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

const staff = (extra?: { isMechanic?: boolean }) =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: 'til-staff-1',
    role: 'dealer_staff',
    isMechanic: extra?.isMechanic ?? false,
  }) as never;

const admin = () =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: 'til-admin-1',
    role: 'dealer_admin',
    isMechanic: false,
  }) as never;

describe('F24 / white label F6b: områder 1', () => {
  beforeEach(() => {
    vi.mocked(erWhiteLabelAktiv).mockReturnValue(false);
  });

  it('uten flagg er tillatelse.mine stengt', async () => {
    await expect(appRouter.createCaller(staff()).tillatelse.mine()).rejects.toMatchObject({
      code: 'PRECONDITION_FAILED',
    });
  });

  it('med flagg: staff uten grant får 403 på kunder og bookinger, ikke på hjem', async () => {
    vi.mocked(erWhiteLabelAktiv).mockReturnValue(true);
    await expect(appRouter.createCaller(staff()).customers.list()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(
      appRouter.createCaller(staff()).bookings.create({
        mechanicId: '00000000-0000-0000-0000-000000000002',
        serviceVersionId: '00000000-0000-0000-0000-000000000003',
        startsAt: new Date(),
        endsAt: new Date(),
      }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).messages.listThreads()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).vehicles.list()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
  });

  it('med flagg: mekaniker hopper bookinger-les, admin passerer områdesjekk', async () => {
    vi.mocked(erWhiteLabelAktiv).mockReturnValue(true);
    await expect(
      appRouter.createCaller(staff({ isMechanic: true })).bookings.list(),
    ).rejects.not.toMatchObject({ message: 'Spør daglig leder' });
    await expect(appRouter.createCaller(admin()).customers.list()).rejects.not.toMatchObject({
      message: 'Spør daglig leder',
    });
  });

  it('kilde: område i koden, ikke klient; F6b-routere bruker omradeSjekk', () => {
    const init = les('../src/trpc/init.ts');
    expect(init).toMatch(/export function omradeSjekk/);
    expect(init).toMatch(/TILLATELSE_HINT/);
    expect(init).not.toMatch(/input\.omrade/);

    const filer = [
      '../src/trpc/routers/bookings.ts',
      '../src/trpc/routers/conflicts.ts',
      '../src/trpc/routers/customers.ts',
      '../src/trpc/routers/directory.ts',
      '../src/trpc/routers/vehicles.ts',
      '../src/trpc/routers/vegvesen.ts',
      '../src/trpc/routers/lookup.ts',
      '../src/trpc/routers/messages.ts',
      '../src/trpc/routers/inbox-context.ts',
      '../src/trpc/routers/mechanics.ts',
    ];
    for (const f of filer) {
      expect(les(f)).toMatch(/omradeSjekk\('/);
    }
    expect(les('../src/trpc/routers/bookings.ts')).toMatch(/omradeSjekk\('bookinger'/);
    expect(les('../src/trpc/routers/customers.ts')).toMatch(/omradeSjekk\('kunder'/);
    expect(les('../src/trpc/routers/vehicles.ts')).toMatch(/omradeSjekk\('kjoretoy'/);
    expect(les('../src/trpc/routers/messages.ts')).toMatch(/omradeSjekk\('innboks'/);
    expect(les('../src/trpc/routers/mechanics.ts')).toMatch(/omradeSjekk\('timeplan'/);
    expect(les('../src/trpc/routers/tillatelse.ts')).toMatch(/mine: protectedProcedure/);
    expect(les('../src/trpc/routers/mechanic.ts')).not.toMatch(/omradeSjekk/);
  });
});
