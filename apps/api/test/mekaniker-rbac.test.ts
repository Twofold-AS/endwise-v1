import { erMekanikerKonto, kan, kanSkriveDealerDesk } from '@endwise/auth';
import { describe, expect, it } from 'vitest';
import { appRouter } from '../src/trpc/router.ts';

/**
 * Jonas/Mikael 28.08.2026 — mekaniker er ikke dealer-desk.
 * bookings.create / customers.create / mechanics.create er ikke
 * protectedProcedure alene.
 */
const tenantId = '00000000-0000-0000-0000-000000000001';
const userId = '00000000-0000-0000-0000-000000000002';
const mechanicId = '00000000-0000-0000-0000-000000000003';

const ctx = (
  role: 'dealer_admin' | 'dealer_staff' | 'endwise_support',
  extra: { jobFunction?: string | null; isMechanic?: boolean; mechanicId?: string | null } = {},
) =>
  ({
    db: {} as never,
    events: { publish: async () => {} } as never,
    tenantId,
    userId,
    role,
    jobFunction: extra.jobFunction ?? null,
    isMechanic: extra.isMechanic ?? false,
    mechanicId: extra.mechanicId ?? null,
  }) as never;

const mekaniker = () =>
  ctx('dealer_staff', { jobFunction: 'mekaniker', isMechanic: true, mechanicId });
const selger = () => ctx('dealer_staff', { jobFunction: 'selger', isMechanic: false });
const admin = () => ctx('dealer_admin', { jobFunction: 'leder', isMechanic: false });

describe('RBAC-kart: mekaniker vs desk', () => {
  it('erMekanikerKonto er staff + mekaniker, aldri dealer_admin', () => {
    expect(
      erMekanikerKonto({ role: 'dealer_staff', jobFunction: 'mekaniker', isMechanic: true }),
    ).toBe(true);
    expect(
      erMekanikerKonto({ role: 'dealer_staff', jobFunction: 'selger', isMechanic: false }),
    ).toBe(false);
    expect(
      erMekanikerKonto({ role: 'dealer_admin', jobFunction: 'mekaniker', isMechanic: true }),
    ).toBe(false);
  });

  it('desk kan opprette jobb, mekaniker kan ikke', () => {
    expect(kan('dealer_admin', 'booking', 'create')).toBe(true);
    expect(kan('dealer_staff', 'booking', 'create')).toBe(true);
    expect(kanSkriveDealerDesk(mekaniker())).toBe(false);
    expect(kanSkriveDealerDesk(selger())).toBe(true);
    expect(kanSkriveDealerDesk(admin())).toBe(true);
  });
});

describe('mekaniker API deny', () => {
  const jobb = {
    mechanicId,
    serviceVersionId: '00000000-0000-0000-0000-000000000004',
    startsAt: new Date(),
    endsAt: new Date(),
  };

  it('bookings.create 403 for mekaniker, norsk melding', async () => {
    await expect(appRouter.createCaller(mekaniker()).bookings.create(jobb)).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: expect.stringMatching(/mekaniker|tilgang/i),
    });
  });

  it('customers.create 403 for mekaniker', async () => {
    await expect(
      appRouter.createCaller(mekaniker()).customers.create({ name: 'Ulovlig' }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
      message: expect.stringMatching(/mekaniker|tilgang/i),
    });
  });

  it('mechanics.create 403 for mekaniker og selger', async () => {
    await expect(
      appRouter.createCaller(mekaniker()).mechanics.create({ name: 'Ny' }),
    ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    await expect(
      appRouter.createCaller(selger()).mechanics.create({ name: 'Ny' }),
    ).rejects.toMatchObject({
      code: 'FORBIDDEN',
    });
  });

  it('selger kan passere desk-gaten på bookings.create (feiler ikke som FORBIDDEN)', async () => {
    await expect(appRouter.createCaller(selger()).bookings.create(jobb)).rejects.not.toMatchObject({
      code: 'FORBIDDEN',
      message: expect.stringMatching(/mekaniker/i),
    });
  });
});
