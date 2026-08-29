import { describe, expect, it } from 'vitest';
import { canTransition } from '../src/booking/lifecycle.ts';

describe('booking-livssyklus — Stopp uten å fullføre', () => {
  it('in_progress kan tilbake til confirmed, ikke en ny status', () => {
    expect(canTransition('in_progress', 'confirmed')).toBe(true);
    expect(canTransition('in_progress', 'completed')).toBe(true);
    expect(canTransition('in_progress', 'cancelled')).toBe(true);
    expect(canTransition('completed', 'confirmed')).toBe(false);
    expect(canTransition('confirmed', 'completed')).toBe(false);
  });
});
