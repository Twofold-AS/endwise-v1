import { describe, expect, it } from 'vitest';
import {
  sanitizeWidgetFunnelEvent,
  WIDGET_FUNNEL_AUDIENCE,
  WIDGET_FUNNEL_EVENT_NAMES,
} from '../src/widget-funnel.ts';

describe('F4-14 widget-funnel', () => {
  it('slipper gjennom kjente steg uten PII', () => {
    const ok = sanitizeWidgetFunnelEvent({
      name: 'widget.booking.step',
      props: { mode: 'booking', step: 'slot', locale: 'no' },
    });
    expect(ok).toEqual({
      name: 'widget.booking.step',
      props: { mode: 'booking', step: 'slot', locale: 'no' },
    });
  });

  it('avviser ukjent navn, hemmeligheter og PII-nøkler', () => {
    expect(sanitizeWidgetFunnelEvent({ name: 'page.view', props: {} })).toBeNull();
    expect(
      sanitizeWidgetFunnelEvent({
        name: 'widget.viewed',
        props: { phone: '90000000', mode: 'booking' },
      }),
    ).toBeNull();
    expect(
      sanitizeWidgetFunnelEvent({
        name: 'widget.chat.sent',
        props: { message: 'Hei jeg heter Ola' },
      }),
    ).toBeNull();
    expect(
      sanitizeWidgetFunnelEvent({
        name: 'widget.viewed',
        props: { tenantId: 'tenant-a' },
      }),
    ).toBeNull();
  });

  it('er cookieless-audience og dekker booking/AI/shop', () => {
    expect(WIDGET_FUNNEL_AUDIENCE).toBe('widget:funnel');
    expect(WIDGET_FUNNEL_EVENT_NAMES).toContain('widget.chat.sent');
    expect(WIDGET_FUNNEL_EVENT_NAMES).toContain('widget.shop.blocked');
  });
});
