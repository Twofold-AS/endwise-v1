/** Flater Framer-pluginen kan sette inn (F4-09). */
export const WIDGET_MODES = ['booking', 'ai', 'tracking', 'webshop'] as const;

export type WidgetMode = (typeof WIDGET_MODES)[number];

export function isWidgetMode(value: string): value is WidgetMode {
  return (WIDGET_MODES as readonly string[]).includes(value);
}
