/**
 * F0-05 — Event-katalog.
 * Rammeverk-uavhengig: ingen import av Hono/Next/Drizzle her.
 * Hvert event er tenant-skopet (multi-tenant, techstack §2 Database).
 */

export interface EventMeta {
  /** Tenant som eier hendelsen. Obligatorisk på ALLE events. */
  tenantId: string;
  /** ISO-8601. Settes av emitteren. */
  occurredAt: string;
  /** Korrelasjons-ID for sporing gjennom SSE/Workflows/logg. */
  correlationId?: string;
  /** Aktør som utløste hendelsen (bruker-ID, 'system', 'agent:<navn>'). */
  actor?: string;
}

/**
 * Event-katalogen. Utvides fase for fase — nye events legges KUN til her,
 * aldri ad-hoc i moduler.
 */
export interface EventCatalog {
  'tenant.created': { tenantId: string; name: string };
  'tenant.modules.changed': { tenantId: string; modules: string[] };
}

export type EventName = keyof EventCatalog;

export type EventPayload<N extends EventName> = EventCatalog[N];

export interface EndwiseEvent<N extends EventName = EventName> {
  name: N;
  payload: EventPayload<N>;
  meta: EventMeta;
}
