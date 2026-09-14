/**
 * Event-katalog.
 * Rammeverk-uavhengig: ingen import av Hono/Next/Drizzle her.
 * Hvert event er tenant-skopet (multi-tenant, techstack §2 Database).
 */

import type { WidgetFunnelProps } from './widget-funnel.ts';

export interface EventMeta {
  /** Tenant som eier hendelsen. Obligatorisk på alle events. */
  tenantId: string;
  /** ISO-8601. Settes av emitteren. */
  occurredAt: string;
  /** Korrelasjons-ID for sporing gjennom SSE/Workflows/logg. */
  correlationId?: string;
  /** Aktør som utløste hendelsen (bruker-ID, 'system', 'agent:<navn>'). */
  actor?: string;
}

/**
 * Event-katalogen. Utvides fase for fase — nye events legges kun til her,
 * aldri ad-hoc i moduler.
 */
export interface EventCatalog {
  'tenant.created': { tenantId: string; name: string };
  'tenant.modules.changed': { tenantId: string; modules: string[] };
  /** F4-14 — cookieless funnel. Payload er allowlistet i widget-funnel.ts. */
  'widget.viewed': WidgetFunnelProps;
  'widget.tab': WidgetFunnelProps;
  'widget.booking.step': WidgetFunnelProps;
  'widget.booking.submitted': WidgetFunnelProps;
  'widget.chat.sent': WidgetFunnelProps;
  'widget.shop.viewed': WidgetFunnelProps;
  'widget.shop.blocked': WidgetFunnelProps;
}

export type EventName = keyof EventCatalog;

export type EventPayload<N extends EventName> = EventCatalog[N];

export interface EndwiseEvent<N extends EventName = EventName> {
  name: N;
  payload: EventPayload<N>;
  meta: EventMeta;
}
