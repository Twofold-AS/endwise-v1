/**
 * F4-14 — widget-funnel (cookieless, pseudonymisert).
 * Klienten sender bare navn + små enum-felt. Ingen cookies, ingen PII,
 * ingen tenantId fra klienten (tenant kommer fra widget-tokenet).
 * Katalogen eier navnene; denne fila eier allowlisten som server og klient deler.
 */

export const WIDGET_FUNNEL_EVENT_NAMES = [
  'widget.viewed',
  'widget.tab',
  'widget.booking.step',
  'widget.booking.submitted',
  'widget.chat.sent',
  'widget.shop.viewed',
  'widget.shop.blocked',
] as const;

export type WidgetFunnelEventName = (typeof WIDGET_FUNNEL_EVENT_NAMES)[number];

/** SSE-audience som ikke treffer mekaniker-innboksen (liveFamiliesForEvent ignorerer). */
export const WIDGET_FUNNEL_AUDIENCE = 'widget:funnel';

const PROP_KEYS = ['mode', 'step', 'tab', 'locale', 'reason'] as const;
export type WidgetFunnelPropKey = (typeof PROP_KEYS)[number];

export type WidgetFunnelProps = Partial<Record<WidgetFunnelPropKey, string>>;

export interface WidgetFunnelEvent {
  name: WidgetFunnelEventName;
  props: WidgetFunnelProps;
}

const BLOKKERT = /phone|telefon|email|epost|name|navn|message|melding|tenant|secret|sk_|password/i;

function erFunnelNavn(v: string): v is WidgetFunnelEventName {
  return (WIDGET_FUNNEL_EVENT_NAMES as readonly string[]).includes(v);
}

/**
 * Feiler lukket: ukjent navn, PII-nøkler eller for lange verdier → null.
 */
export function sanitizeWidgetFunnelEvent(input: unknown): WidgetFunnelEvent | null {
  if (!input || typeof input !== 'object') return null;
  const raw = input as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name : '';
  if (!erFunnelNavn(name)) return null;

  const src =
    raw.props && typeof raw.props === 'object' && !Array.isArray(raw.props)
      ? (raw.props as Record<string, unknown>)
      : {};
  const props: WidgetFunnelProps = {};
  for (const key of PROP_KEYS) {
    const val = src[key];
    if (typeof val !== 'string') continue;
    const trimmed = val.trim().slice(0, 40);
    if (!trimmed || BLOKKERT.test(trimmed)) continue;
    props[key] = trimmed;
  }
  for (const key of Object.keys(src)) {
    if (BLOKKERT.test(key)) return null;
  }
  return { name, props };
}
