import { formaterKlokkeslett } from '@endwise/auth/tid';
import { describe, expect, it } from 'vitest';

/**
 * F1-16 — passordreset er borte. Formatteren lever videre for e-post.
 */
describe('passord-utløp i Europe/Oslo (F1-16)', () => {
  it('et kjent UTC-øyeblikk vises som Europe/Oslo', () => {
    expect(formaterKlokkeslett(new Date('2026-08-29T05:46:00.000Z'))).toBe('07:46');
  });
});
