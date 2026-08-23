import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { endwiseAdminUtfall } from '../lib/endwise-admin-gate.ts';

/**
 * F1-26 / CWE-200 — /admin og /endwise skal ikke prerendre KPI-tall eller
 * admin-UI for noen som feiler sesjon eller endwise_admin.
 */
describe('endwiseAdminUtfall', () => {
  it('uten sesjon → signin', () => {
    expect(endwiseAdminUtfall({ userId: null, role: null })).toBe('signin');
  });

  it('2FA påkrevd → oppsett, ikke admin-HTML', () => {
    expect(
      endwiseAdminUtfall({ userId: 'u1', role: 'endwise_admin', twoFactorRequired: true }),
    ).toBe('two_factor');
  });

  it('innlogget uten endwise_admin → forbidden', () => {
    expect(endwiseAdminUtfall({ userId: 'u1', role: 'dealer_admin' })).toBe('forbidden');
    expect(endwiseAdminUtfall({ userId: 'u1', role: 'dealer_staff' })).toBe('forbidden');
    expect(endwiseAdminUtfall({ userId: 'u1', role: null })).toBe('forbidden');
  });

  it('endwise_admin med sesjon → ok', () => {
    expect(endwiseAdminUtfall({ userId: 'u1', role: 'endwise_admin' })).toBe('ok');
  });
});

describe('F1-26: server-gate på /admin og /endwise', () => {
  const her = dirname(fileURLToPath(import.meta.url));

  it('/admin/layout.tsx kaller krevEndwiseAdminSide før barn rendres', () => {
    const kilde = readFileSync(resolve(her, '../app/(app)/admin/layout.tsx'), 'utf8');
    expect(kilde).toMatch(/krevEndwiseAdminSide/);
    expect(kilde).toMatch(/force-dynamic/);
    expect(kilde).not.toMatch(/148 ?500|148500/);
  });

  it('/endwise/layout.tsx bruker samme gate (ikke bare kosmetikk)', () => {
    const kilde = readFileSync(resolve(her, '../app/(app)/endwise/layout.tsx'), 'utf8');
    expect(kilde).toMatch(/krevEndwiseAdminSide/);
    expect(kilde).toMatch(/force-dynamic/);
  });

  it('gaten går gjennom createRequestContext / requireSession — ikke et nytt auth-system', () => {
    const kilde = readFileSync(resolve(her, '../lib/endwise-admin-gate.ts'), 'utf8');
    expect(kilde).toMatch(/createRequestContext/);
    expect(kilde).toMatch(/TwoFactorRequiredError/);
    expect(kilde).toMatch(/redirect\('\/signin'/);
    expect(kilde).not.toMatch(/lucia|next-auth|clerk/i);
  });
});
