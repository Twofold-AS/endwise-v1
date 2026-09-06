import { randomUUID } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { WidgetBookingIdentity } from '../src/widget/identity.ts';

/**
 * Kontrakten som binder widget-økt (`cid`) til booking-raden.
 * Formatet er det /widget/booking allerede skrev — klassen er kilden, ikke
 * et nytt nøkkelrom.
 */
describe('WidgetBookingIdentity', () => {
  const cid = `customer:${randomUUID()}`;
  const serviceVersionId = randomUUID();
  const startsAt = new Date('2026-09-15T07:00:00.000Z');

  it('idempotencyKey matcher POST /widget/booking-formatet', () => {
    expect(WidgetBookingIdentity.idempotencyKey({ cid, serviceVersionId, startsAt })).toBe(
      `widget:${cid}:${serviceVersionId}:${startsAt.toISOString()}`,
    );
  });

  it('sessionKeyPrefix eier bare denne økten', () => {
    expect(WidgetBookingIdentity.sessionKeyPrefix(cid)).toBe(`widget:${cid}:`);
    expect(WidgetBookingIdentity.sessionKeyPrefix(cid)?.endsWith(':')).toBe(true);
  });

  it('feiler lukket uten gyldig widget-cid (ikke customers.id, ikke fri tekst)', () => {
    expect(WidgetBookingIdentity.sessionKeyPrefix('kunde-1')).toBeNull();
    expect(WidgetBookingIdentity.sessionKeyPrefix(randomUUID())).toBeNull();
    expect(WidgetBookingIdentity.sessionKeyPrefix('customer:not-a-uuid')).toBeNull();
    expect(WidgetBookingIdentity.sessionKeyPrefix('customer:')).toBeNull();
    expect(WidgetBookingIdentity.sessionKeyPrefix(`widget:${cid}:`)).toBeNull();
  });

  it('prefix-angrep: kortere cid matcher ikke en lengre økt', () => {
    const a = WidgetBookingIdentity.sessionKeyPrefix(cid);
    const forged = WidgetBookingIdentity.sessionKeyPrefix('customer:');
    expect(a).toBeTruthy();
    expect(forged).toBeNull();
  });
});
