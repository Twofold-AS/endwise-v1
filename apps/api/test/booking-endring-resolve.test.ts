import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('bookings.resolveChange / undoChange (F7-05)', () => {
  it('godkjenn skriver startsAt/mechanicId og sjekker jobSlots i samme transaksjon', () => {
    const router = les('../src/trpc/routers/bookings.ts');
    expect(router).toMatch(/parseVentendeOnske/);
    expect(router).toMatch(/assertEndringJobSlot/);
    expect(router).toMatch(/malFraOnske/);
    expect(router).toMatch(/lockShopSlots/);
    expect(router).toMatch(/lockMechanic/);
    expect(router).toMatch(/patch\.startsAt/);
    expect(router).toMatch(/patch\.mechanicId/);
    expect(router).toMatch(/previous/);
    expect(router).toMatch(/decision === 'godkjent'/);
    expect(router).toMatch(/decision === 'avslatt'|avslatt/);
    expect(router).toMatch(/undoChange:/);
    expect(router).toMatch(/booking\.change\.angre/);
    expect(router).toMatch(/restored: previous/);
  });

  it('reportChange tar valgfri startsAt og mechanicId inn i notatet', () => {
    const router = les('../src/trpc/routers/bookings.ts');
    expect(router).toMatch(/startsAt: z\.coerce\.date\(\)\.optional/);
    expect(router).toMatch(/mechanicId: z\.uuid\(\)\.optional/);
    expect(router).toMatch(/appendEndringNotat/);
  });
});
