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

const staff = () =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId: '00000000-0000-0000-0000-000000000001',
    userId: 'til-staff-6c',
    role: 'dealer_staff',
    isMechanic: false,
    kontekst: 'bedrift',
    requestHeaders: new Headers({ 'x-endwise-csrf': '1' }),
    authSone: 'forhandler',
  }) as never;

describe('F25 / white label F6c: områder 2', () => {
  beforeEach(() => {
    vi.mocked(erWhiteLabelAktiv).mockReturnValue(false);
  });

  it('med flagg: staff uten grant får 403 på F6c-områder, chrome er åpen', async () => {
    vi.mocked(erWhiteLabelAktiv).mockReturnValue(true);
    await expect(appRouter.createCaller(staff()).services.list()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).inventory.listParts()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).team.list()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).forhandler.get()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).billing.katalog()).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).forhandler.kort()).rejects.not.toMatchObject({
      message: 'Spør daglig leder',
    });
    await expect(appRouter.createCaller(staff()).billing.subscription()).rejects.not.toMatchObject({
      message: 'Spør daglig leder',
    });
  });

  it('kilde: F6c-routere bruker omradeSjekk; leder-handlinger på team er admin', () => {
    const filer = [
      ['../src/trpc/routers/services.ts', 'tjenester'],
      ['../src/trpc/routers/inventory.ts', 'lager'],
      ['../src/trpc/routers/shop.ts', 'nettbutikk'],
      ['../src/trpc/routers/team.ts', 'ansatte'],
      ['../src/trpc/routers/competence.ts', 'ansatte'],
      ['../src/trpc/routers/forhandler.ts', 'innstillinger'],
      ['../src/trpc/routers/widget.ts', 'innstillinger'],
      ['../src/trpc/routers/quick.ts', 'innstillinger'],
      ['../src/trpc/routers/onboarding.ts', 'innstillinger'],
      ['../src/trpc/routers/branding.ts', 'innstillinger'],
      ['../src/trpc/routers/billing.ts', 'okonomi'],
    ] as const;
    for (const [f, omrade] of filer) {
      expect(les(f)).toMatch(new RegExp(`omradeSjekk\\('${omrade}'`));
    }
    const team = les('../src/trpc/routers/team.ts');
    expect(team).toMatch(/fjern: adminProcedure/);
    expect(team).toMatch(/opprettUtenInvitasjon: adminProcedure/);
    expect(team).not.toMatch(/fjern:[\s\S]{0,40}omradeSjekk/);
    expect(les('../src/trpc/routers/forhandler.ts')).not.toMatch(
      /kort: protectedProcedure\.use\(omradeSjekk/,
    );
    expect(les('../src/trpc/init.ts')).toMatch(/utenFlagg: 'pass' \| 'admin'/);
  });
});
