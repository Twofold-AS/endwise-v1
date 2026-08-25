import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { fmtServices } from '../app/(app)/bookinger/_status.ts';

/**
 * F3-09 / P3 — Ny jobb: flere tjenester + manuell varighet.
 * Verkstednorsk (Jobber), ikke tickets. Billing/Stripe røres ikke her.
 */
const her = dirname(fileURLToPath(import.meta.url));

function les(rel: string) {
  return readFileSync(resolve(her, rel), 'utf8');
}

describe('Ny jobb — flere tjenester og manuell varighet', () => {
  const ny = les('../app/(app)/bookinger/ny/page.tsx');

  it('siden heter Ny jobb og peker tilbake til Jobber, ikke tickets', () => {
    expect(ny).toMatch(/Ny jobb/);
    expect(ny).toMatch(/← Jobber/);
    expect(ny).toMatch(/Opprett jobb/);
    expect(ny).not.toMatch(/ticket/i);
    expect(ny).not.toMatch(/Ny booking/);
  });

  it('kan velge flere tjenester og sende extraServiceVersionIds', () => {
    expect(ny).toMatch(/serviceIds/);
    expect(ny).toMatch(/extraServiceVersionIds/);
    expect(ny).toMatch(/toggleService/);
    expect(ny).toMatch(/Tjenester og tid/);
  });

  it('har manuelt varighetsfelt som overstyrer katalogsum', () => {
    expect(ny).toMatch(/durationMinutes/);
    expect(ny).toMatch(/durationManual/);
    expect(ny).toMatch(/Varighet \(minutter\)/);
    expect(ny).toMatch(/Bruk katalogtid/);
    expect(ny).toMatch(/catalogSum/);
  });

  it('rører ikke Stripe eller abonnementspriser', () => {
    expect(ny).not.toMatch(/STRIPE|4490|8490|12490/);
  });
});

describe('fmtServices', () => {
  it('slår sammen flere tjenestenavn', () => {
    expect(fmtServices({ serviceNames: ['EU-kontroll', 'Oljeskift'] })).toBe(
      'EU-kontroll + Oljeskift',
    );
    expect(fmtServices({ serviceName: 'Undersøkelse' })).toBe('Undersøkelse');
  });
});

describe('booking-ruter rører ikke billing', () => {
  const create = les('../../api/src/trpc/routers/bookings.ts');

  it('create tar extraServiceVersionIds og durationMinutes', () => {
    expect(create).toMatch(/extraServiceVersionIds/);
    expect(create).toMatch(/durationMinutes/);
    expect(create).toMatch(/bookingServices/);
    expect(create).not.toMatch(/STRIPE|priceIds|4490/);
  });
});
