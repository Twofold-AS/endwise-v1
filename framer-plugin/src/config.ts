import { isWidgetMode, WIDGET_MODES, type WidgetMode } from '@endwise/widget-ui';

/** Prod: widget-rutene bor på apps/web (`https://endwise.no/widget/*`). */
export const DEFAULT_API_BASE = 'https://endwise.no';

export const PLUGIN_DATA = {
  publishableKey: 'endwise:publishableKey',
  apiBase: 'endwise:apiBase',
  dealerLabel: 'endwise:dealerLabel',
  mode: 'endwise:mode',
  trackEvents: 'endwise:trackEvents',
} as const;

export interface PluginConfig {
  publishableKey: string;
  apiBase: string;
  dealerLabel: string;
  mode: WidgetMode;
  trackEvents: boolean;
}

export type ConfigIssue = 'empty' | 'secret' | 'not-publishable' | 'bad-api-base';

/**
 * Kun `pk_…` er lov i Framer. Hemmelige nøkler (`sk_…`) avvises (CWE-798).
 * `dealerLabel` er kun for mennesker — aldri tenantId mot API.
 */
export function validatePublishableKey(raw: string): ConfigIssue | null {
  const key = raw.trim();
  if (!key) return 'empty';
  if (/^sk_/i.test(key) || /secret/i.test(key)) return 'secret';
  if (!/^pk_[a-z0-9_]+/i.test(key)) return 'not-publishable';
  return null;
}

export function validateApiBase(raw: string): ConfigIssue | null {
  const value = raw.trim();
  if (!value) return 'empty';
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return 'bad-api-base';
    if (url.username || url.password) return 'bad-api-base';
    return null;
  } catch {
    return 'bad-api-base';
  }
}

export function parseMode(raw: string | null | undefined): WidgetMode {
  const v = (raw ?? '').trim();
  return isWidgetMode(v) ? v : 'booking';
}

export function normalizeConfig(input: {
  publishableKey: string;
  apiBase: string;
  dealerLabel?: string;
  mode?: string;
  trackEvents?: boolean;
}): { ok: true; config: PluginConfig } | { ok: false; issue: ConfigIssue } {
  const keyIssue = validatePublishableKey(input.publishableKey);
  if (keyIssue) return { ok: false, issue: keyIssue };
  const apiBase = (input.apiBase.trim() || DEFAULT_API_BASE).replace(/\/+$/, '');
  const apiIssue = validateApiBase(apiBase);
  if (apiIssue) return { ok: false, issue: apiIssue };
  return {
    ok: true,
    config: {
      publishableKey: input.publishableKey.trim(),
      apiBase,
      dealerLabel: (input.dealerLabel ?? '').trim().slice(0, 80),
      mode: parseMode(input.mode),
      trackEvents: input.trackEvents !== false,
    },
  };
}

export type { WidgetMode };
export { WIDGET_MODES };
